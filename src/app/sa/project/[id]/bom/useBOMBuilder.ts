"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ProjectService, PackageService, ServiceService, SiteDefinitionService, EquipmentService } from "@/src/lib/firebase";
import { Project, Package, Service, Equipment } from "@/src/lib/types";
import { Site, BOM } from "@/src/lib/bom-types";
import { SiteType } from "@/src/lib/site-types";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { calculateBOM, calculateUtilization, validatePOE } from "@/src/lib/bom-engine";
import { normalizeServiceId } from "@/src/lib/bom-utils";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { parseSiteListCSV } from "@/src/lib/csv-parser";
import { AIService } from "@/src/lib/ai-service";
import { resolveVendorForService, calculateThroughputOverhead } from "@/src/lib/bom-utils";
import { getGlobalParameters } from "@/src/lib/firebase/settings";

// -------------------------------------------------------
// Sample CSV embedded in module scope (not in component)
// -------------------------------------------------------
const SAMPLE_CSV = `Site Name,Address,User Count,Bandwidth Down (Mbps),Bandwidth Up (Mbps),Redundancy Model,WAN Links,LAN Ports,PoE Ports,Indoor APs,Outdoor APs,Primary Circuit,Secondary Circuit,Notes
NY-HQ,123 Broadway New York NY,150,1000,1000,Dual CPE,2,140,120,10,0,DIA,Broadband,Critical site requires HA
LA-Branch,456 Sunset Blvd Los Angeles CA,25,200,50,Single CPE,1,24,10,2,0,Broadband,,Standard branch
CHI-Warehouse,789 Industrial Pkwy Chicago IL,50,500,500,Single CPE,2,48,20,15,2,DIA,LTE,High ceiling warehouse needs industrial APs
MIA-Office,321 Ocean Dr Miami FL,10,100,20,Single CPE,1,12,5,1,0,Broadband,,Small sales office
DAL-DataCenter,555 Tech Way Dallas TX,5,10000,10000,Dual CPE,2,24,0,0,0,DIA,DIA,Data center direct connect`;

// -------------------------------------------------------
// Preview site type (with AI enrichment fields)
// -------------------------------------------------------
export type PreviewSite = Site & {
    recommendedType?: string;
    recommendedLanType?: string;
    confidence?: number;
    reasoning?: string;
};

// -------------------------------------------------------
// Tab definition
// -------------------------------------------------------
export interface BOMTab {
    id: string;
    label: string;
    serviceIds: string[];
    primaryServiceId: string;
    icon: string;
}

// -------------------------------------------------------
// Hook return type
// -------------------------------------------------------
export interface BOMBuilderState {
    // Data
    project: Project | null;
    pkg: Package | null;
    allPackages: Package[];
    services: Service[];
    siteTypes: SiteType[];
    catalog: Equipment[];
    // Sites
    sites: Site[];
    setSites: (sites: Site[]) => void;
    selectedSiteIndex: number | null;
    setSelectedSiteIndex: (i: number | null) => void;
    siteFilter: "all" | "flagged";
    setSiteFilter: (filter: "all" | "flagged") => void;
    selectedSite: Site | undefined;
    // Tab state
    activeTab: string;
    setActiveTab: (tab: string) => void;
    availableTabs: BOMTab[];
    // BOM output
    bom: BOM | null;
    siteBOMItems: BOM["items"];
    // UI state
    manualSelections: Record<string, string>;
    setManualSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    selectedSpecsItem: Equipment | null;
    setSelectedSpecsItem: (eq: Equipment | null) => void;
    // AI classification
    isClassifying: boolean;
    previewSites: PreviewSite[] | null;
    setPreviewSites: (sites: PreviewSite[] | null) => void;
    // Derived values
    utilization: number;
    totalLoad: number;
    poeWarnings: string[];
    currentSDWANEquipment: Equipment | undefined;
    currentSDWANItem: BOM["items"][number] | undefined;
    sdwanOverhead: number;
    // Actions
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    loadSampleData: () => Promise<void>;
    getVendorForService: (serviceId: string) => string;
    /** Call to switch active package in demo mode */
    handlePackageChange: (pkgId: string) => Promise<void>;
    /** Call to change siteTypeId for currently selected site */
    handleSiteTypeChange: (siteTypeId: string) => void;
    /** Call to update any properties on the currently selected site */
    handleSiteUpdate: (updates: Partial<Site>) => void;
    projectId: string;

    // Pricing & Simulation
    globalDiscount: number;
    setGlobalDiscount: (d: number) => void;
    swapSimulation: { fromItemId: string; toItemId: string } | null;
    setSwapSimulation: (s: { fromItemId: string; toItemId: string } | null) => void;
    pricingSummary: {
        totalListPrice: number;
        totalNetPrice: number;
        totalSavings: number;
        siteSummaries: Record<string, { list: number; net: number }>;
    };
    simulatedPricingSummary: {
        totalListPrice: number;
        totalNetPrice: number;
        totalSavings: number;
        delta: number;
    } | null;
    acquisitionModel: 'purchase' | 'rental';
    setAcquisitionModel: (model: 'purchase' | 'rental') => void;
}

export function useBOMBuilder(): BOMBuilderState {
    const params = useParams();
    const searchParams = useSearchParams();
    const projectId = params.id as string;

    // ---- Core data state ----
    const [project, setProject] = useState<Project | null>(null);
    const [pkg, setPkg] = useState<Package | null>(null);
    const [allPackages, setAllPackages] = useState<Package[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [siteTypes, setSiteTypes] = useState<SiteType[]>([]);
    const [catalog, setCatalog] = useState<Equipment[]>(SEED_EQUIPMENT);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [globalParameters, setGlobalParameters] = useState<Record<string, any>>({});

    // ---- Sites ----
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSiteIndex, setSelectedSiteIndex] = useState<number | null>(null);
    const [siteFilter, setSiteFilter] = useState<"all" | "flagged">("all");

    // ---- Tabs ----
    const [activeTab, setActiveTab] = useState<string>("WAN");

    // ---- UI state ----
    const [manualSelections, setManualSelections] = useState<Record<string, string>>({});
    const [selectedSpecsItem, setSelectedSpecsItem] = useState<Equipment | null>(null);

    // ---- AI state ----
    const [isClassifying, setIsClassifying] = useState(false);
    const [previewSites, setPreviewSites] = useState<PreviewSite[] | null>(null);

    // ---- Pricing & Simulation state ----
    const [globalDiscount, setGlobalDiscount] = useState<number>(0);
    const [swapSimulation, setSwapSimulation] = useState<{ fromItemId: string; toItemId: string } | null>(null);
    const [acquisitionModel, setAcquisitionModel] = useState<'purchase' | 'rental'>('purchase');

    // -------------------------------------------------------
    // Data loading
    // -------------------------------------------------------
    useEffect(() => {
        async function loadData() {
            if (!projectId) return;

            try {
                let p: Project | null = null;
                if (projectId === "demo") {
                    // Pre-emptively set demo project so UI doesn't hang on Loading state
                    p = {
                        id: "demo",
                        userId: "demo-user",
                        name: "Demo Project",
                        customerName: "Demo Corporation",
                        description: "Automated test project for BOM troubleshooting.",
                        status: "completed",
                        currentStep: 5,
                        selectedPackageId: "cost_centric",
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    } as Project;
                    setProject(p);

                    // Then load real packages to refine
                    const pkgs = await PackageService.getAllPackages();
                    const preferredPkg = pkgs.find((pk) => pk.id === "cost_centric") || pkgs[0];
                    if (preferredPkg) {
                        setPkg(preferredPkg);
                        setProject(prev => prev ? { ...prev, selectedPackageId: preferredPkg.id } : prev);
                    }
                } else {
                    p = await ProjectService.getProject(projectId);
                    setProject(p);

                    if (p?.selectedPackageId) {
                        const pk = await PackageService.getPackageById(p.selectedPackageId);
                        setPkg(pk);
                    }
                }

                const [allPkgs, svcs, eq, globalParams] = await Promise.all([
                    PackageService.getAllPackages().catch(() => []),
                    ServiceService.getAllServices().catch(() => []),
                    EquipmentService.getAllEquipment().catch(() => []),
                    getGlobalParameters().catch(() => ({})),
                ]);

                setAllPackages(allPkgs);
                setServices(svcs);
                if (eq.length > 0) setCatalog(eq);
                setGlobalParameters(globalParams);

                const st = await SiteDefinitionService.getAllSiteDefinitions().catch(() => []);
                if (st.length === 0) {
                    const { ALL_SITE_TYPES } = await import("@/src/lib/seed-site-catalog");
                    setSiteTypes(ALL_SITE_TYPES);
                } else {
                    setSiteTypes(st);
                }
            } catch (error) {
                console.error("Error in loadData:", error);
                // Ensure we at least have some state if it fails
                if (projectId === "demo" && !project) {
                    setProject({ id: "demo", name: "Demo Project" } as Project);
                }
            }
        }

        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // Engine instantiation removed in favor of pure functions

    // -------------------------------------------------------
    // Available tabs (derived from package + services)
    // -------------------------------------------------------
    const availableTabs = useMemo<BOMTab[]>(() => {
        if (!pkg || services.length === 0) {
            return [
                { id: "WAN", label: "WAN", serviceIds: ["managed_sdwan"], primaryServiceId: "managed_sdwan", icon: "🌐" },
                { id: "LAN", label: "LAN", serviceIds: ["managed_lan"], primaryServiceId: "managed_lan", icon: "🔌" },
                { id: "WLAN", label: "WLAN", serviceIds: ["managed_wifi"], primaryServiceId: "managed_wifi", icon: "📶" },
                { id: "Pricing", label: "Pricing", serviceIds: [], primaryServiceId: "", icon: "💰" },
            ];
        }

        const buckets: Record<string, { label: string; services: string[]; icon: string }> = {
            WAN: { label: "WAN", services: [], icon: "🌐" },
            LAN: { label: "LAN", services: [], icon: "🔌" },
            WLAN: { label: "WLAN", services: [], icon: "📶" },
            SERVICES: { label: "SERVICES", services: [], icon: "🔧" },
        };

        pkg.items.forEach((pItem) => {
            const rawServiceId = pItem.service_id;
            const service = services.find((s) => s.id === rawServiceId);
            if (!service) return;
            // Use canonical (normalized) ID so it matches what the BOM engine emits
            const serviceId = normalizeServiceId(rawServiceId);
            const name = service.name.toLowerCase();
            const category = (service.metadata?.category || "").toLowerCase();
            if (name.includes("sd-wan") || name.includes("sdwan") || name.includes("broadband") || name.includes("circuit") || category.includes("wan")) {
                if (!buckets.WAN.services.includes(serviceId)) buckets.WAN.services.push(serviceId);
            } else if (name.includes("lan") || name.includes("switch") || category.includes("lan")) {
                if (!buckets.LAN.services.includes(serviceId)) buckets.LAN.services.push(serviceId);
            } else if (name.includes("wifi") || name.includes("wlan") || name.includes("wireless") || category.includes("wifi")) {
                if (!buckets.WLAN.services.includes(serviceId)) buckets.WLAN.services.push(serviceId);
            } else {
                if (!buckets.SERVICES.services.includes(serviceId)) buckets.SERVICES.services.push(serviceId);
            }
        });

        const tabs = Object.entries(buckets)
            .filter(([, data]) => data.services.length > 0)
            .map(([key, data]) => ({
                id: key,
                label: data.label,
                serviceIds: data.services,
                primaryServiceId: data.services[0],
                icon: data.icon,
            }));

        // Always add Pricing tab
        tabs.push({ id: "Pricing", label: "Pricing", serviceIds: [], primaryServiceId: "", icon: "💰" });

        return tabs;
    }, [pkg, services]);

    // Sync activeTab when available tabs change
    useEffect(() => {
        if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
            setActiveTab(availableTabs[0].id);
        }
    }, [availableTabs, activeTab]);

    // -------------------------------------------------------
    // BOM computation
    // -------------------------------------------------------
    const bom = useMemo<BOM | null>(() => {
        if (sites.length > 0 && pkg && services.length > 0 && siteTypes.length > 0) {
            return calculateBOM({
                projectId,
                sites,
                selectedPackage: pkg,
                services,
                siteTypes,
                equipmentCatalog: catalog,
                rules: SEED_BOM_RULES,
                manualSelections,
                globalParameters
            });
        }
        return null;
    }, [sites, pkg, services, siteTypes, catalog, projectId, manualSelections, globalParameters]);

    // -------------------------------------------------------
    // Pricing Analysis
    // -------------------------------------------------------
    const pricingSummary = useMemo(() => {
        const summary = {
            totalListPrice: 0,
            totalNetPrice: 0,
            totalSavings: 0,
            totalOTCList: 0,
            totalOTCNet: 0,
            totalMRCList: 0,
            totalMRCNet: 0,
            siteSummaries: {} as Record<string, { list: number; net: number; otc: number; mrc: number }>
        };

        if (!bom) return summary;

        // Only count items from the canonical managed services that the site tabs render.
        // WAN tab: managed_sdwan, LAN tab: managed_lan
        // TODO: Add "managed_wifi" here once WLAN features are built out.
        const SITE_TAB_SERVICE_IDS = new Set(["managed_sdwan", "managed_lan"]);
        bom.items
            .filter(item => SITE_TAB_SERVICE_IDS.has(item.serviceId))
            .forEach(item => {
                const qty = item.quantity || 0;
                let unitOTCList = 0;
                let unitMRCList = 0;

                if (item.itemType === 'equipment') {
                    if (acquisitionModel === 'purchase') {
                        unitOTCList = item.pricing?.purchasePrice ?? item.pricing?.listPrice ?? 0;
                        unitMRCList = 0;
                    } else {
                        unitOTCList = 0;
                        unitMRCList = item.pricing?.rentalPrice ?? 0;
                    }
                } else {
                    // For Management/Circuits (query pricing matrix/catalog) - mocked for now
                    // TODO: integrate ManagementPricingMatrix
                    unitOTCList = 0;
                    unitMRCList = 0;
                }

                // Explicitly store resolved prices on the item (as requested by Step 1 & 3)
                item.unitOTC = unitOTCList;
                item.unitMRC = unitMRCList;

                const itemTotalOTCList = unitOTCList * qty;
                const itemTotalMRCList = unitMRCList * qty;

                // Global discount REPLACES any existing discount per requirement
                const itemTotalOTCNet = itemTotalOTCList * (1 - globalDiscount / 100);
                const itemTotalMRCNet = itemTotalMRCList * (1 - globalDiscount / 100);

                item.totalOTC = itemTotalOTCNet;
                item.totalMRC = itemTotalMRCNet;

                summary.totalOTCList += itemTotalOTCList;
                summary.totalMRCList += itemTotalMRCList;
                summary.totalOTCNet += itemTotalOTCNet;
                summary.totalMRCNet += itemTotalMRCNet;

                const itemTotalList = itemTotalOTCList + itemTotalMRCList;
                const itemTotalNet = itemTotalOTCNet + itemTotalMRCNet;

                summary.totalListPrice += itemTotalList;
                summary.totalNetPrice += itemTotalNet;

                if (!summary.siteSummaries[item.siteName]) {
                    summary.siteSummaries[item.siteName] = { list: 0, net: 0, otc: 0, mrc: 0 };
                }
                summary.siteSummaries[item.siteName].list += itemTotalList;
                summary.siteSummaries[item.siteName].net += itemTotalNet;
                summary.siteSummaries[item.siteName].otc += itemTotalOTCList;
                summary.siteSummaries[item.siteName].mrc += itemTotalMRCList;
            });

        summary.totalSavings = summary.totalListPrice - summary.totalNetPrice;
        return summary;
    }, [bom, globalDiscount, acquisitionModel]);

    const simulatedPricingSummary = useMemo(() => {
        if (!bom || !swapSimulation) return null;

        const fromEquip = catalog.find(e => e.id === swapSimulation.fromItemId);
        const toEquip = catalog.find(e => e.id === swapSimulation.toItemId);
        if (!fromEquip || !toEquip) return null;

        const summary = {
            totalListPrice: 0,
            totalNetPrice: 0,
            totalSavings: 0,
            delta: 0
        };

        bom.items.forEach(item => {
            let unitOTCList = item.unitOTC || 0;
            let unitMRCList = item.unitMRC || 0;
            const qty = item.quantity || 0;

            // If this item is the one we are swapping FROM
            if (item.itemId === swapSimulation.fromItemId) {
                // Determine new item prices based on acquisition model
                const purchase = toEquip.pricing?.purchasePrice ?? toEquip.listPrice ?? toEquip.price ?? 0;
                const rental = toEquip.pricing?.rentalPrice ?? 0;

                if (acquisitionModel === 'purchase') {
                    unitOTCList = purchase;
                    unitMRCList = 0;
                } else {
                    unitOTCList = 0;
                    unitMRCList = rental;
                }
            }

            const itemTotalList = (unitOTCList + unitMRCList) * qty;
            const itemTotalNet = itemTotalList * (1 - globalDiscount / 100);

            summary.totalListPrice += itemTotalList;
            summary.totalNetPrice += itemTotalNet;
        });

        summary.totalSavings = summary.totalListPrice - summary.totalNetPrice;
        summary.delta = summary.totalNetPrice - pricingSummary.totalNetPrice;

        return summary;
    }, [bom, swapSimulation, catalog, globalDiscount, pricingSummary.totalNetPrice, acquisitionModel]);

    const selectedSite = selectedSiteIndex !== null ? sites[selectedSiteIndex] : undefined;
    const siteBOMItems = bom?.items.filter((i) => i.siteName === selectedSite?.name) ?? [];

    // -------------------------------------------------------
    // Derived utilization values
    // -------------------------------------------------------
    const currentSDWANItem = siteBOMItems.find((i) => i.serviceId === "managed_sdwan" && i.itemType === "equipment");
    const currentSDWANEquipment = catalog.find((e) => e.id === currentSDWANItem?.itemId);
    const sdwanOverhead = pkg ? calculateThroughputOverhead(pkg, "managed_sdwan", services) : 0;
    const utilization = selectedSite && currentSDWANEquipment
        ? calculateUtilization(selectedSite, currentSDWANEquipment, pkg?.throughput_basis, sdwanOverhead)
        : 0;
    const totalLoad = selectedSite
        ? (selectedSite.bandwidthDownMbps || 0) + (selectedSite.bandwidthUpMbps || 0) + sdwanOverhead
        : 0;
    const poeWarnings = selectedSite ? validatePOE(selectedSite, siteBOMItems, catalog) : [];

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------
    const getVendorForService = useCallback(
        (serviceId: string) => (pkg ? resolveVendorForService(pkg, serviceId) : "meraki"),
        [pkg]
    );

    const handlePackageChange = useCallback(async (pkgId: string) => {
        const newPkg = await PackageService.getPackageById(pkgId);
        setPkg(newPkg);
        if (project) setProject({ ...project, selectedPackageId: pkgId });
    }, [project]);

    const handleSiteTypeChange = useCallback((siteTypeId: string) => {
        setSites((prev) => {
            const next = [...prev];
            if (selectedSiteIndex !== null && next[selectedSiteIndex]) {
                next[selectedSiteIndex] = { ...next[selectedSiteIndex], siteTypeId };
            }
            return next;
        });
    }, [selectedSiteIndex]);

    const handleSiteUpdate = useCallback((updates: Partial<Site>) => {
        setSites((prev) => {
            const next = [...prev];
            if (selectedSiteIndex !== null && next[selectedSiteIndex]) {
                next[selectedSiteIndex] = { ...next[selectedSiteIndex], ...updates };
            }
            return next;
        });
    }, [selectedSiteIndex]);

    // -------------------------------------------------------
    // CSV + AI classification
    // -------------------------------------------------------
    const classifyAndPreview = useCallback(async (parsed: Site[]) => {
        if (parsed.length === 0) return;
        setIsClassifying(true);
        try {
            const analysis = await AIService.classifySites(parsed, siteTypes);
            const preview: PreviewSite[] = parsed.map((site, idx) => {
                const rec = analysis.find((a) => a.siteIndex === idx);
                return { ...site, recommendedType: rec?.siteTypeId, recommendedLanType: rec?.lanSiteTypeId, confidence: rec?.confidence, reasoning: rec?.reasoning };
            });
            setPreviewSites(preview);
        } catch {
            setSites(parsed); // Fallback: skip AI, import raw
        } finally {
            setIsClassifying(false);
        }
    }, [siteTypes]);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseSiteListCSV(text);
            classifyAndPreview(parsed);
        };
        reader.readAsText(file);
    }, [classifyAndPreview]);

    const loadSampleData = useCallback(async () => {
        const parsed = parseSiteListCSV(SAMPLE_CSV);
        await classifyAndPreview(parsed);
    }, [classifyAndPreview]);

    // Auto-load sample data when ?loadSample=true
    useEffect(() => {
        if (searchParams.get("loadSample") === "true") {
            const timer = setTimeout(loadSampleData, 500);
            return () => clearTimeout(timer);
        }
    }, [searchParams, loadSampleData]);

    return {
        project,
        pkg,
        allPackages,
        services,
        siteTypes,
        catalog,
        sites,
        setSites,
        selectedSiteIndex,
        setSelectedSiteIndex,
        siteFilter,
        setSiteFilter,
        selectedSite,
        activeTab,
        setActiveTab,
        availableTabs,
        bom,
        siteBOMItems,
        manualSelections,
        setManualSelections,
        selectedSpecsItem,
        setSelectedSpecsItem,
        isClassifying,
        previewSites,
        setPreviewSites,
        utilization,
        totalLoad,
        poeWarnings,
        currentSDWANEquipment,
        currentSDWANItem,
        sdwanOverhead,
        handleFileUpload,
        loadSampleData,
        getVendorForService,
        handlePackageChange,
        handleSiteTypeChange,
        handleSiteUpdate,
        projectId,
        globalDiscount,
        setGlobalDiscount,
        swapSimulation,
        setSwapSimulation,
        pricingSummary,
        simulatedPricingSummary,
        acquisitionModel,
        setAcquisitionModel,
    };
}
