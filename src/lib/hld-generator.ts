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
        description: string;
        slaTier?: string;
    }>;
    servicesIncluded: Array<{
        name: string;
        description: string;
        assumptions: string;
        caveats: string;
        serviceOptions: Array<{ name: string; description: string; assumptions: string; caveats: string }>;
        designOptions: Array<{ name: string; description: string; assumptions: string; caveats: string }>;
    }>;
    features: Array<{
        name: string;
        description: string;
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

    const serviceIds = new Set<string>();
    const featureIds = new Set<string>();

    items.forEach(item => {
        serviceIds.add(item.service_id);
        item.enabled_features?.forEach(f => featureIds.add(f.feature_id));
    });

    // Also include features defined directly on the package
    if (project.selectedPackageId) {
        try {
            const pkg = await PackageService.getPackageById(project.selectedPackageId);
            pkg?.items?.forEach(item => {
                // A PackageFeature object has a feature_id property
                item.enabled_features?.forEach(f => {
                    if (typeof f === "string") {
                        featureIds.add(f); // Support legacy string arrays if they exist
                    } else if (f && f.feature_id) {
                        featureIds.add(f.feature_id); // The standard PackageFeature interface
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
        equipmentCatalog,
        rules,
        globalParameters
    ] = await Promise.all([
        packageId ? PackageService.getPackageById(packageId) : Promise.resolve(null),
        Promise.all(Array.from(serviceIds).map(id => ServiceService.getServiceById(id))),
        Promise.all(Array.from(siteTypeIds).map(id => SiteDefinitionService.getSiteDefinitionById(id))),
        Promise.all(Array.from(featureIds).map(id => FeatureService.getFeatureById(id))),
        EquipmentService.getAllEquipment().catch(() => []),
        BOMService.getAllRules().catch(() => []),
        getGlobalParameters().catch(() => ({}))
    ]);

    // Clean arrays from nulls in case any lookups failed
    const services = servicesSnap.filter(Boolean) as Service[];
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
            opt.design_options?.filter(dOpt =>
                serviceItems.some(i => i.design_option_id === dOpt.id)
            ).map(dOpt => ({
                name: dOpt.name,
                description: dOpt.detailed_description || dOpt.short_description,
                assumptions: (dOpt.assumptions || []).join(" "),
                caveats: (dOpt.caveats || []).join(" ")
            })) || []
        ) || [];

        return {
            name: service.name,
            description: service.detailed_description || service.short_description,
            assumptions: (service.assumptions || []).join(" "),
            caveats: (service.caveats || []).join(" "),
            serviceOptions,
            designOptions
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

    const bomSummaryArray = Object.entries(aggregatedBomSummary).map(([itemName, quantity]) => ({
        itemName,
        quantity
    }));

    // 6. Assemble Final Payload
    return {
        projectName: project.name,
        customerName: project.customerName,
        executiveSummaryBasis: {
            packageDescription: selectedPackage?.detailed_description || selectedPackage?.short_description || "Custom configuration",
        },
        siteTypes: siteTypesCatalog.map(st => ({
            name: st.name,
            description: st.description,
            slaTier: st.defaults?.slo?.toString()
        })),
        servicesIncluded,
        features: features.map(f => ({
            name: f.name,
            description: f.description,
            assumptions: (f.assumptions || []).join(" "),
            caveats: (f.caveats || []).join(" ")
        })),
        bomSummary: bomSummaryArray,
        detailedBom: bom?.items || []
    };
}
