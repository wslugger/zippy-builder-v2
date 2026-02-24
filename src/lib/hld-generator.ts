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
        serviceOptions: Array<{ name: string; description: string }>;
        designOptions: Array<{ name: string; description: string }>;
    }>;
    features: Array<{
        name: string;
        description: string;
        assumptions: string;
        caveats: string;
    }>;
    bomSummary: BOM["summary"] | null;
    detailedBom: BOMLineItem[];
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
        item.enabled_features.forEach(f => featureIds.add(f.feature_id));
    });

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
        ).map(opt => ({ name: opt.name, description: opt.short_description })) || [];

        const designOptions = service.service_options?.flatMap(opt =>
            opt.design_options?.filter(dOpt =>
                serviceItems.some(i => i.design_option_id === dOpt.id)
            ).map(dOpt => ({ name: dOpt.name, description: dOpt.short_description })) || []
        ) || [];

        return {
            name: service.name,
            description: service.short_description,
            serviceOptions,
            designOptions
        };
    });

    // 5. Build BOM
    let bom: BOM | null = null;
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
    }

    // 6. Assemble Final Payload
    return {
        projectName: project.name,
        customerName: project.customerName,
        executiveSummaryBasis: {
            packageDescription: selectedPackage?.short_description || "Custom configuration",
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
            assumptions: f.assumptions?.join(" ") || "",
            caveats: f.caveats?.join(" ") || ""
        })),
        bomSummary: bom?.summary || null,
        detailedBom: bom?.items || []
    };
}
