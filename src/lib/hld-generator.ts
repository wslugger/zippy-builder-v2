import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase/config";
import {
    ProjectService,
    PackageService,
    ServiceService,
    SiteDefinitionService,
    FeatureService,
    EquipmentService,
    BOMService
} from "./firebase";
import { calculateBOM } from "./bom-engine";
import {
    BOM,
    BOMLineItem,
    Service,
    TechnicalFeature,
    Site,
    SiteType,
    SiteSchema,
    BOMEngineInput
} from "./types";
import { getGlobalParameters } from "./firebase/settings";
import { validateDoc } from "./firebase/validation";

export interface HLDPayload {
    projectName: string;
    customerName: string;
    executiveSummaryBasis: {
        packageDescription: string;
    };
    siteTypes: Array<{
        name: string;
        category: "SD-WAN" | "LAN" | "WLAN";
        description: string;
        slaTier: string;
        cpeRedundancy: string;
        circuitRedundancy: string;
        requiredServices: string[];
        constraints: Array<{ description: string; type: string }>;
        bomItems: Array<{ itemName: string; quantity: number; category: string }>;
    }>;
    servicesIncluded: Array<{
        name: string;
        description: string;
        assumptions: string;
        caveats: string;
        serviceOptions: Array<{ name: string; description: string; assumptions: string; caveats: string }>;
        designOptions: Array<{ name: string; description: string; assumptions: string; caveats: string; category?: string }>;
        enabledFeatures: Array<{ id: string; name: string; description: string; inclusion_type: string }>;
    }>;
    features: Array<{
        name: string;
        description: string;
        inclusion_type: string;
        assumptions: string;
        caveats: string;
    }>;
    bomSummary: Array<{
        itemName: string;
        quantity: number;
    }>;
    detailedBom?: BOMLineItem[];
}

export async function generateHLDPayload(projectId: string): Promise<HLDPayload> {
    const project = await ProjectService.getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    // 1. Fetch site docs
    const sitesRef = collection(db, "projects", projectId, "sites");
    const sitesSnap = await getDocs(sitesRef);
    const sites = sitesSnap.docs.map(d => validateDoc(SiteSchema, d.data(), d.id)) as Site[];

    // 2. Identify referenced entities
    const packageId = project.selectedPackageId;
    const items = project.customizedItems?.length ? project.customizedItems : [];

    const siteTypeIds = new Set<string>();
    sites.forEach((site: Site) => {
        if (site.siteTypeId) siteTypeIds.add(site.siteTypeId);
        if (site.lanSiteTypeId) siteTypeIds.add(site.lanSiteTypeId);
    });

    // Collect referenced service IDs (for filtering after sorted fetch)
    const serviceIds = new Set<string>();
    const featureIds = new Set<string>();
    const featureInclusions = new Map<string, string>();

    items.forEach(item => {
        serviceIds.add(item.service_id);
        item.enabled_features?.forEach(f => {
            const fId = typeof f === 'string' ? f : f.feature_id;
            const inc = typeof f === 'string' ? 'standard' : f.inclusion_type;
            featureIds.add(fId);
            featureInclusions.set(fId, inc || 'standard');
        });
    });

    // Also include features defined directly on the package
    if (project.selectedPackageId) {
        try {
            const pkg = await PackageService.getPackageById(project.selectedPackageId);
            pkg?.items?.forEach(item => {
                // A PackageFeature object has a feature_id property
                item.enabled_features?.forEach(f => {
                    const fId = typeof f === 'string' ? f : f.feature_id;
                    const inc = typeof f === 'string' ? 'standard' : f.inclusion_type;
                    featureIds.add(fId);
                    if (!featureInclusions.has(fId)) {
                        featureInclusions.set(fId, inc || 'standard');
                    }
                });
            });
        } catch (e) {
            console.warn("Failed to fetch package for feature extraction", e);
        }
    }

    // 3. Concurrently fetch all dependencies from catalog
    const [
        selectedPackage,
        servicesSnap,
        siteTypesSnap,
        featuresSnap,
        equipmentCatalogRaw,
        rules,
        globalParameters
    ] = await Promise.all([
        packageId ? PackageService.getPackageById(packageId) : Promise.resolve(null),
        // Fetch ALL services (pre-sorted by sortOrder in service layer), then filter below.
        // Do NOT fetch per-ID via getServiceById — that loses the admin-defined sort order.
        ServiceService.getAllServices(),
        Promise.all(Array.from(siteTypeIds).map(id => SiteDefinitionService.getSiteDefinitionById(id))),
        Promise.all(Array.from(featureIds).map(id => FeatureService.getFeatureById(id))),
        EquipmentService.getAllEquipment().catch(() => []),
        BOMService.getAllRules().catch(() => []),
        getGlobalParameters().catch(() => ({}))
    ]);

    // Respect Snapshot for completed projects
    const equipmentCatalog = (project.status === 'completed' && project.embeddedEquipment?.length)
        ? project.embeddedEquipment
        : equipmentCatalogRaw;

    // Filter the sorted services list to only those referenced by the project.
    // Filtering from the pre-sorted array (rather than fetching per-ID) preserves sortOrder.
    const services = (servicesSnap as Service[]).filter(s => serviceIds.has(s.id));
    const siteTypesCatalog = siteTypesSnap.filter(Boolean) as SiteType[];
    const features = featuresSnap.filter(Boolean) as TechnicalFeature[];

    // 4. Transform services mapping
    const servicesIncluded = services.map(service => {
        // Find project items matching this service to pull out options
        const serviceItems = items.filter(i => i.service_id === service.id);

        // Find selected options in catalog
        const serviceOptions = service.service_options?.filter(opt =>
            serviceItems.some(i => i.service_option_id === opt.id)
        ).map(opt => ({
            name: opt.name,
            description: opt.detailed_description || opt.short_description,
            assumptions: (opt.assumptions || []).join(" "),
            caveats: (opt.caveats || []).join(" ")
        })) || [];

        const designOptions = service.service_options?.flatMap(opt =>
            (opt.design_options || []).filter(dOpt =>
                serviceItems.some(i => i.design_option_id === dOpt.id)
            ).map(dOpt => ({
                name: dOpt.name,
                description: dOpt.detailed_description || dOpt.short_description || "",
                assumptions: (dOpt.assumptions || []).join(" "),
                caveats: (dOpt.caveats || []).join(" "),
                category: dOpt.category || "General"
            }))
        ) || [];

        const serviceFeatures = features.filter(f =>
            serviceItems.some(i => i.enabled_features?.some(ef => {
                const efId = typeof ef === 'string' ? ef : ef.feature_id;
                return efId === f.id;
            }))
        ).map(f => ({
            id: f.id,
            name: f.name,
            description: f.description,
            inclusion_type: featureInclusions.get(f.id) || 'standard'
        }));

        return {
            name: service.name,
            description: service.detailed_description || service.short_description || "",
            assumptions: (service.assumptions || []).join(" "),
            caveats: (service.caveats || []).join(" "),
            serviceOptions,
            designOptions,
            enabledFeatures: serviceFeatures
        };
    });

    let bom: BOM | null = null;
    const aggregatedBomSummary: Record<string, number> = {};

    if (selectedPackage && sites.length > 0 && services.length > 0 && siteTypesCatalog.length > 0) {
        const input: BOMEngineInput = {
            projectId,
            sites,
            selectedPackage,
            services,
            siteTypes: siteTypesCatalog,
            equipmentCatalog,
            rules,
            manualSelections: project.selectedDesignOptions || {},
            globalParameters
        };
        bom = calculateBOM(input);

        // Aggregate hardware totals
        if (bom && bom.items) {
            bom.items.forEach(item => {
                if (item.itemType === 'equipment') {
                    aggregatedBomSummary[item.itemName] = (aggregatedBomSummary[item.itemName] || 0) + item.quantity;
                }
            });
        }
    }

    const siteIdLookup = new Map(sites.map(s => [s.name, s.siteTypeId || "generic"]));
    const equipmentBySiteType: Record<string, Record<string, { quantity: number; category: string }>> = {};

    if (bom && bom.items) {
        bom.items.forEach(item => {
            if (item.itemType === 'equipment') {
                const stId = siteIdLookup.get(item.siteName) || "generic";
                if (!equipmentBySiteType[stId]) equipmentBySiteType[stId] = {};

                if (!equipmentBySiteType[stId][item.itemName]) {
                    const equip = equipmentCatalog.find(e => e.id === item.itemId);
                    let category = "WAN"; // Default
                    if (equip) {
                        const purpose = equip.primary_purpose;
                        if (purpose === "WAN" || purpose === "Security") category = "WAN";
                        else if (purpose === "LAN") category = "LAN";
                        else if (purpose === "WLAN") category = "WLAN";
                    }
                    equipmentBySiteType[stId][item.itemName] = { quantity: 0, category };
                }
                equipmentBySiteType[stId][item.itemName].quantity += item.quantity;
            }
        });
    }
    const bomSummaryArray = Object.entries(aggregatedBomSummary).map(([itemName, quantity]) => ({
        itemName,
        quantity
    }));

    return {
        projectName: project.name,
        customerName: project.customerName,
        executiveSummaryBasis: {
            packageDescription: selectedPackage?.detailed_description || selectedPackage?.short_description || "Custom configuration",
        },
        siteTypes: siteTypesCatalog.map(st => ({
            name: st.name,
            category: st.category,
            description: st.description,
            slaTier: st.defaults?.slo ? `${st.defaults.slo}%` : "N/A",
            cpeRedundancy: st.defaults?.redundancy?.cpe || "N/A",
            circuitRedundancy: st.defaults?.redundancy?.circuit || "N/A",
            requiredServices: st.defaults?.requiredServices || [],
            constraints: st.constraints?.map(c => ({ description: c.description, type: c.type })) || [],
            bomItems: Object.entries(equipmentBySiteType[st.id] || {}).map(([itemName, data]) => ({
                itemName,
                quantity: data.quantity,
                category: data.category
            }))
        })),
        servicesIncluded,
        features: features.map(f => ({
            name: f.name,
            description: f.description,
            inclusion_type: featureInclusions.get(f.id) || 'standard',
            assumptions: (f.assumptions || []).join(" "),
            caveats: (f.caveats || []).join(" ")
        })),
        bomSummary: bomSummaryArray,
        detailedBom: bom?.items || []
    };
}
