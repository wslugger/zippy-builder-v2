"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ProjectService, PackageService, ServiceService, SiteDefinitionService, EquipmentService } from "@/src/lib/firebase";
import { Project, Package, Service, Equipment, VENDOR_LABELS } from "@/src/lib/types";
import { Site, BOM } from "@/src/lib/bom-types";
import { SiteType } from "@/src/lib/site-types";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { BOMEngine } from "@/src/lib/bom-engine";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { parseSiteListCSV } from "@/src/lib/csv-parser";
import { AIService } from "@/src/lib/ai-service";
import { SiteImportReviewModal } from "@/src/components/sa/SiteImportReviewModal";

// Sample data for testing
const SAMPLE_CSV = `Site Name,Address,User Count,Bandwidth Down (Mbps),Bandwidth Up (Mbps),Redundancy Model,WAN Links,LAN Ports,PoE Ports,Indoor APs,Outdoor APs,Primary Circuit,Secondary Circuit,Notes
NY-HQ,123 Broadway New York NY,150,1000,1000,Dual CPE,2,140,120,10,0,DIA,Broadband,Critical site requires HA
LA-Branch,456 Sunset Blvd Los Angeles CA,25,200,50,Single CPE,1,24,10,2,0,Broadband,,Standard branch
CHI-Warehouse,789 Industrial Pkwy Chicago IL,50,500,500,Single CPE,2,48,20,15,2,DIA,LTE,High ceiling warehouse needs industrial APs
MIA-Office,321 Ocean Dr Miami FL,10,100,20,Single CPE,1,12,5,1,0,Broadband,,Small sales office
DAL-DataCenter,555 Tech Way Dallas TX,5,10000,10000,Dual CPE,2,24,0,0,0,DIA,DIA,Data center direct connect`;

// --- Icons ---
const AlertIcon = () => <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;

function BOMBuilderContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [pkg, setPkg] = useState<Package | null>(null);
    const [allPackages, setAllPackages] = useState<Package[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [siteTypes, setSiteTypes] = useState<SiteType[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [catalog, setCatalog] = useState<Equipment[]>(SEED_EQUIPMENT);
    const [selectedSiteIndex, setSelectedSiteIndex] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<string>("WAN");

    // Derived Tabs from Project Services
    // For demo, we hardcode tabs based on standard services found in seed data
    // In real app, iterate project.customizedItems -> serviceId
    const availableTabs = useMemo(() => {
        interface Tab { id: string, label: string, serviceIds: string[], primaryServiceId: string, icon: string };
        if (!pkg || services.length === 0) return [
            { id: "WAN", label: "WAN", serviceIds: ["managed_sdwan"], primaryServiceId: "managed_sdwan", icon: "🌐" },
            { id: "LAN", label: "LAN", serviceIds: ["managed_lan"], primaryServiceId: "managed_lan", icon: "🔌" },
            { id: "WLAN", label: "WLAN", serviceIds: ["managed_wifi"], primaryServiceId: "managed_wifi", icon: "📶" }
        ] as Tab[];

        const buckets: Record<string, { label: string, services: string[], icon: string }> = {
            "WAN": { label: "WAN", services: [], icon: "🌐" },
            "LAN": { label: "LAN", services: [], icon: "🔌" },
            "WLAN": { label: "WLAN", services: [], icon: "📶" },
            "SERVICES": { label: "SERVICES", services: [], icon: "🔧" }
        };

        pkg.items.forEach(pItem => {
            const serviceId = pItem.service_id;
            const service = services.find(s => s.id === serviceId);
            if (!service) return;

            const name = service.name.toLowerCase();
            const category = (service.metadata?.category || "").toLowerCase();

            if (name.includes("sd-wan") || name.includes("sdwan") || name.includes("broadband") || name.includes("circuit") || category.includes("wan")) {
                if (!buckets["WAN"].services.includes(serviceId)) buckets["WAN"].services.push(serviceId);
            } else if (name.includes("lan") || name.includes("switch") || category.includes("lan")) {
                if (!buckets["LAN"].services.includes(serviceId)) buckets["LAN"].services.push(serviceId);
            } else if (name.includes("wifi") || name.includes("wlan") || name.includes("wireless") || category.includes("wifi")) {
                if (!buckets["WLAN"].services.includes(serviceId)) buckets["WLAN"].services.push(serviceId);
            } else {
                if (!buckets["SERVICES"].services.includes(serviceId)) buckets["SERVICES"].services.push(serviceId);
            }
        });

        return Object.entries(buckets)
            .filter(([, data]) => data.services.length > 0)
            .map(([key, data]) => ({
                id: key,
                label: data.label,
                serviceIds: data.services,
                primaryServiceId: data.services[0],
                icon: data.icon
            }));
    }, [pkg, services]);

    // Make engine reactive to live catalog
    const engine = useMemo(() => new BOMEngine(SEED_BOM_RULES, catalog), [catalog]);

    // Sync activeTab with availableTabs if it's missing (during render)
    const isValid = availableTabs.some(t => t.id === activeTab);
    if (availableTabs.length > 0 && !isValid) {
        setActiveTab(availableTabs[0].id);
    }
    const [manualSelections, setManualSelections] = useState<Record<string, string>>({});
    const [selectedSpecsItem, setSelectedSpecsItem] = useState<Equipment | null>(null);

    // AI Classification States
    const [isClassifying, setIsClassifying] = useState(false);
    const [previewSites, setPreviewSites] = useState<(Site & { recommendedType?: string, confidence?: number, reasoning?: string })[] | null>(null);

    // Load Project Data
    useEffect(() => {
        async function loadData() {
            if (!projectId) return;
            let p;
            if (projectId === 'demo') {
                const pkgs = await PackageService.getAllPackages();
                // Prefer cost_centric for demo since it has full BOM rules
                const preferredPkg = pkgs.find(p => p.id === 'cost_centric') || pkgs[0];
                p = {
                    id: 'demo',
                    userId: 'demo-user',
                    name: 'Demo Project',
                    customerName: 'Demo Corporation',
                    description: 'Automated test project for BOM troubleshooting.',
                    status: 'completed',
                    currentStep: 5,
                    selectedPackageId: preferredPkg?.id || 'cost_centric',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                } as Project;
            } else {
                p = await ProjectService.getProject(projectId);
            }
            setProject(p);
            if (p?.selectedPackageId) {
                const pk = await PackageService.getPackageById(p.selectedPackageId);
                setPkg(pk);
            }

            // Always fetch all packages for the selector (or at least in demo mode)
            const allPkgs = await PackageService.getAllPackages();
            setAllPackages(allPkgs);

            const s = await ServiceService.getAllServices();
            setServices(s);

            const st = await SiteDefinitionService.getAllSiteDefinitions();
            console.log('Loaded site types from Firestore:', st.length, st.map(t => ({ id: t.id, name: t.name, redundancy: t.defaults?.redundancy })));

            // Fallback to seed data if Firestore is empty
            if (st.length === 0) {
                console.warn('No site definitions in Firestore! Using seed data as fallback.');
                const { ALL_SITE_TYPES } = await import('@/src/lib/seed-site-catalog');
                setSiteTypes(ALL_SITE_TYPES);
            } else {
                setSiteTypes(st);
            }

            const eq = await EquipmentService.getAllEquipment();
            if (eq.length > 0) setCatalog(eq);
        }
        loadData();
    }, [projectId]);

    // Handle CSV Upload with AI Classification
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const parsed = parseSiteListCSV(text);

            if (parsed.length > 0) {
                console.log("Starting AI Classification for sites:", parsed);
                setIsClassifying(true);
                try {
                    const analysis = await AIService.classifySites(parsed, siteTypes);
                    console.log("AI analysis result:", analysis);
                    const previewData = parsed.map((site, idx) => {
                        const rec = analysis.find(a => a.siteIndex === idx);
                        return {
                            ...site,
                            recommendedType: rec?.siteTypeId,
                            confidence: rec?.confidence,
                            reasoning: rec?.reasoning
                        };
                    });
                    setPreviewSites(previewData);
                } catch (err) {
                    console.error("AI Classification failed", err);
                    setSites(parsed); // Fallback to raw import
                } finally {
                    setIsClassifying(false);
                }
            }
        };
        reader.readAsText(file);
    };

    const loadSampleData = useCallback(async () => {
        const parsed = parseSiteListCSV(SAMPLE_CSV);
        if (parsed.length > 0) {
            console.log("Loading sample data with AI classification...");
            setIsClassifying(true);
            try {
                const analysis = await AIService.classifySites(parsed, siteTypes);
                console.log("AI analysis result (sample):", analysis);
                const previewData = parsed.map((site, idx) => {
                    const rec = analysis.find(a => a.siteIndex === idx);
                    return {
                        ...site,
                        recommendedType: rec?.siteTypeId,
                        confidence: rec?.confidence,
                        reasoning: rec?.reasoning
                    };
                });
                setPreviewSites(previewData);
            } catch (err) {
                console.error("AI Classification failed", err);
                setSites(parsed);
            } finally {
                setIsClassifying(false);
            }
        }
    }, [siteTypes]);

    useEffect(() => {
        if (searchParams.get("loadSample") === "true") {
            const timer = setTimeout(loadSampleData, 500);
            return () => clearTimeout(timer);
        }
    }, [searchParams, loadSampleData]);

    // Re-generate BOM when sites change or logic changes
    const bom: BOM | null = useMemo(() => {
        if (sites.length > 0 && pkg && services.length > 0 && siteTypes.length > 0) {
            return engine.generateBOM(projectId, sites, pkg, services, siteTypes, manualSelections);
        }
        return null;
    }, [sites, pkg, services, siteTypes, engine, projectId, manualSelections]);


    const selectedSite = sites[selectedSiteIndex];
    const siteBOMItems = bom?.items.filter(i => i.siteName === selectedSite?.name) || [];

    // Calculate Utilization & Alerts
    const currentSDWANItem = siteBOMItems.find(i => i.serviceId === "managed_sdwan" && i.itemType === "equipment");
    const currentSDWANEquipment = catalog.find(e => e.id === currentSDWANItem?.itemId);

    // Calculate overhead for the utilization bar
    const sdwanPackageItem = pkg?.items.find(i => i.service_id === "managed_sdwan");
    let sdwanOverhead = (pkg?.throughput_overhead_mbps || 0);
    if (sdwanPackageItem?.design_option_id && services.length > 0) {
        const service = services.find(s => s.id === "managed_sdwan");
        const designOption = service?.service_options
            .flatMap(so => so.design_options)
            .find(d => d.id === sdwanPackageItem.design_option_id);
        if (designOption?.throughput_overhead_mbps) {
            sdwanOverhead += designOption.throughput_overhead_mbps;
        }
    }

    const utilization = selectedSite && currentSDWANEquipment
        ? engine.calculateUtilization(selectedSite, currentSDWANEquipment, pkg?.throughput_basis, sdwanOverhead)
        : 0;

    const totalLoad = selectedSite ? (selectedSite.bandwidthDownMbps || 0) + (selectedSite.bandwidthUpMbps || 0) + sdwanOverhead : 0;

    const poeWarnings = selectedSite ? engine.validatePOE(selectedSite, siteBOMItems) : [];


    // Helper to determine vendor from package data
    const getVendorForService = (serviceId: string): string => {
        if (!pkg) return "meraki";
        const pkgItem = pkg.items.find(i => i.service_id === serviceId);

        // Determine from option IDs first (design option or service option)
        const optionId = (pkgItem?.design_option_id || pkgItem?.service_option_id || "").toLowerCase();
        if (optionId.includes("meraki")) return "meraki";
        if (optionId.includes("cisco") || optionId.includes("catalyst")) return "cisco_catalyst";
        if (optionId.includes("fortinet")) return "fortinet";
        if (optionId.includes("palo_alto") || optionId.includes("paloalto")) return "palo_alto";

        // Fallback or default
        return "meraki";
    };


    if (!project) return <div className="p-8">Loading Project...</div>;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar: Site List */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-800">Sites ({sites.length})</h2>
                    {sites.length === 0 && (
                        <div className="mt-4">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700" />
                        </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        {projectId === 'demo' && (
                            <div className="mb-3">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Test Package
                                </label>
                                <select
                                    className="block w-full rounded border-slate-200 text-xs py-1 pl-2 pr-6 focus:ring-blue-500 focus:border-blue-500"
                                    value={pkg?.id || ""}
                                    onChange={async (e) => {
                                        const newPkgId = e.target.value;
                                        const newPkg = await PackageService.getPackageById(newPkgId);
                                        setPkg(newPkg);
                                        if (project) {
                                            setProject({ ...project, selectedPackageId: newPkgId });
                                        }
                                    }}
                                >
                                    <option value="" disabled>Select Package...</option>
                                    {/* We need all packages here. Let's fetch them if not already in a state variable. 
                                        Actually, let's add a state variable for 'allPackages' at the component level.
                                    */}
                                    {allPackages.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={loadSampleData}
                            className="w-full text-left px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-blue-600 transition-colors border border-dashed border-slate-200 rounded"
                        >
                            Load Sample Sites (Test)
                        </button>
                    </div>
                    {sites.length > 0 && (
                        <button
                            onClick={() => {
                                if (confirm("Are you sure you want to clear all sites?")) {
                                    setSites([]);
                                    setSelectedSiteIndex(0);
                                }
                            }}
                            className="mt-2 w-full text-left px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-red-300 hover:text-red-600 transition-colors border border-dashed border-red-100 rounded"
                        >
                            Clear Sites
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {sites.map((site, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedSiteIndex(idx)}
                            className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedSiteIndex === idx ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium text-slate-900 truncate">{site.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{site.address}</div>
                                    <div className="mt-1 flex items-center space-x-2">
                                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                            {site.siteTypeId ? (siteTypes.find(t => t.id === site.siteTypeId)?.name || site.siteTypeId) : "Generic Branch"}
                                        </span>
                                        {(() => {
                                            const siteBOM = bom?.items.filter(i => i.siteName === site.name && i.serviceId === "managed_sdwan" && i.itemType === "equipment");
                                            const qty = siteBOM?.[0]?.quantity || 1;
                                            return qty > 1 ? (
                                                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                    {qty} x CPE
                                                </span>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>
                                {/* Status Indicator */}
                                {/* Logic to check if this site has alerts in the global BOM */}
                                <div className="mt-1">
                                    {/* Placeholder status */}
                                    <div className={`w-2 h-2 rounded-full ${idx % 3 === 0 ? 'bg-amber-400' : 'bg-green-400'}`}></div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-y-auto">
                {selectedSite ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-slate-200 p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">{selectedSite.name}</h1>
                                    <div className="text-sm text-slate-500 flex items-center space-x-4 mt-1">
                                        <span>{selectedSite.address}</span>
                                        <span>•</span>
                                        <span>{selectedSite.userCount} Users</span>
                                        <span>•</span>
                                        <select
                                            className="text-xs border-none bg-transparent text-blue-600 font-medium cursor-pointer focus:ring-0"
                                            value={selectedSite.siteTypeId || ""}
                                            onChange={(e) => {
                                                const newSites = [...sites];
                                                newSites[selectedSiteIndex] = { ...selectedSite, siteTypeId: e.target.value };
                                                setSites(newSites);
                                            }}
                                        >
                                            <option value="">Select Profile...</option>
                                            {siteTypes.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Online
                                    </span>
                                </div>
                            </div>

                            {/* Alerts Banner */}
                            {poeWarnings.length > 0 && (
                                <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-start space-x-3">
                                    <AlertIcon />
                                    <div className="text-sm text-red-700">
                                        {poeWarnings.map((w, i) => <div key={i}>{w}</div>)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="bg-white border-b border-slate-200 px-6">
                            <nav className="-mb-px flex space-x-8">
                                {availableTabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                            }`}
                                    >
                                        <span className="mr-2">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {activeTab === "WAN" && (
                                <div className="space-y-6">
                                    {/* Section: SD-WAN Site Profile (Redundant with header but more detailed) */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">SD-WAN Site Profile</h3>
                                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Select Deployment Profile</label>
                                            <select
                                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                value={selectedSite.siteTypeId || ""}
                                                onChange={(e) => {
                                                    const newSites = [...sites];
                                                    newSites[selectedSiteIndex] = { ...selectedSite, siteTypeId: e.target.value };
                                                    setSites(newSites);
                                                }}
                                            >
                                                <option value="">-- Auto-detected (Generic) --</option>
                                                {siteTypes.filter(t => t.category === "SD-WAN").map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            <p className="mt-2 text-xs text-slate-500 italic">
                                                {siteTypes.find(t => t.id === selectedSite.siteTypeId)?.description || "Standard branch deployment based on user count."}
                                            </p>
                                            {(() => {
                                                const siteDef = siteTypes.find(t => t.id === selectedSite.siteTypeId);
                                                if (!siteDef) return null;

                                                // Debug logging
                                                console.log('Site Definition for badges:', {
                                                    id: siteDef.id,
                                                    name: siteDef.name,
                                                    redundancy: siteDef.defaults?.redundancy
                                                });

                                                return (
                                                    <div className="mt-3 flex space-x-4">
                                                        <div className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                            <span className="mr-1.5">🛡️</span> {(() => {
                                                                const cpe = (siteDef.defaults?.redundancy?.cpe || "").toLowerCase();
                                                                const isDual = cpe.includes("dual") || cpe.includes("ha") || cpe.includes("active") || cpe.includes("redundant");
                                                                console.log('CPE check:', { cpe, isDual });
                                                                return isDual ? "2 x CPE (High Availability)" : "1 x CPE (Standard)";
                                                            })()}
                                                        </div>
                                                        <div className="flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                            <span className="mr-1.5">🧬</span> {(() => {
                                                                const circuit = (siteDef.defaults?.redundancy?.circuit || "").toLowerCase();
                                                                const isDual = circuit.includes("dual") || circuit.includes("diverse") || circuit.includes("hybrid") || circuit.includes("multi");
                                                                console.log('Circuit check:', { circuit, isDual });
                                                                return isDual ? "Dual Circuit (Diverse)" : "Single Circuit";
                                                            })()}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Section: Edge Device */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Edge Device</h3>

                                            {/* Manual Selection Dropdown */}
                                            <div className="flex items-center space-x-2 relative z-10 w-full max-w-[200px]">
                                                <ManualDeviceSelector
                                                    value={manualSelections[`${selectedSite.name}:managed_sdwan`] || ""}
                                                    onChange={(val: string) => {
                                                        setManualSelections(prev => {
                                                            const next = { ...prev };
                                                            const key = `${selectedSite.name}:managed_sdwan`;
                                                            if (val) next[key] = val;
                                                            else delete next[key];
                                                            return next;
                                                        });
                                                    }}
                                                    options={catalog
                                                        .filter(e => {
                                                            const isSDWAN = e.purpose.includes("SDWAN");
                                                            if (!isSDWAN) return false;

                                                            // Data-driven vendor check
                                                            const allowedVendor = getVendorForService("managed_sdwan");
                                                            return e.vendor_id === allowedVendor;
                                                        })
                                                        .map(e => ({ value: e.id, label: e.model }))}
                                                />
                                            </div>
                                        </div>

                                        {currentSDWANEquipment ? (
                                            <div className="flex items-start space-x-6">
                                                <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                                                    {/* Placeholder Image */}
                                                    <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <h4 className="text-lg font-bold text-slate-900">
                                                            {currentSDWANItem?.quantity && currentSDWANItem.quantity > 1 ? `${currentSDWANItem.quantity} x ` : ''}
                                                            {currentSDWANEquipment.model}
                                                        </h4>
                                                        <button
                                                            onClick={() => setSelectedSpecsItem(currentSDWANEquipment)}
                                                            className="text-sm text-blue-600 hover:underline"
                                                        >
                                                            View Specs
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1">{currentSDWANEquipment.description}</p>
                                                    {manualSelections[`${selectedSite.name}:managed_sdwan`] && (
                                                        <p className="text-xs text-amber-600 mt-2 font-semibold flex items-center">
                                                            <span className="mr-1">⚠️</span> Manually Selected
                                                        </p>
                                                    )}

                                                    {/* Utilization Bar */}
                                                    <div className="mt-4">
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="font-medium text-slate-500">Throughput Utilization <span className="text-slate-400 font-normal">(Limit: 80%)</span></span>
                                                            <span className={`font-bold ${utilization > 80 ? 'text-red-600' : 'text-slate-700'}`}>{utilization}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                            <div
                                                                className={`h-2.5 rounded-full ${utilization > 80 ? 'bg-red-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${Math.min(100, utilization)}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex justify-between text-xs mt-1 text-slate-400">
                                                            <span>Total Load: {totalLoad} Mbps (Aggregate)</span>
                                                            <span>Capacity: {currentSDWANEquipment.specs[(pkg?.throughput_basis || "vpn_throughput_mbps") as keyof typeof currentSDWANEquipment.specs] || 0} Mbps ({(pkg?.throughput_basis || "vpn_throughput_mbps").replace(/_/g, ' ').toUpperCase()})</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-500 italic">No device selected. Please check site profile or bandwidth requirements.</div>
                                        )}
                                    </div>

                                    {/* Section: Circuit Configuration */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Circuit Configuration</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-white">
                                                <div className="flex items-center space-x-3">
                                                    <div className="bg-slate-100 p-2 rounded-full">
                                                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">{selectedSite.primaryCircuit} <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded uppercase font-bold">PRI</span></div>
                                                        <div className="text-xs text-slate-500">Partner ISP • Optical</div>
                                                    </div>
                                                </div>
                                                <div className="font-bold text-slate-900">{selectedSite.bandwidthDownMbps} Mbps</div>
                                            </div>

                                            {selectedSite.secondaryCircuit && (
                                                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-white">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="bg-slate-100 p-2 rounded-full">
                                                            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-900">{selectedSite.secondaryCircuit} <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase font-bold">SEC</span></div>
                                                            <div className="text-xs text-slate-500">Local Cable • Electrical</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-bold text-slate-900">{Math.round(selectedSite.bandwidthDownMbps * 0.1)} Mbps</div> {/* Just simulation */}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "LAN" && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">LAN Infrastructure</h3>
                                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Switch Profile</label>
                                            <select
                                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                defaultValue={siteTypes.find(t => t.category === "LAN")?.id}
                                            >
                                                {siteTypes.filter(t => t.category === "LAN").map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="mt-6 grid grid-cols-2 gap-4">
                                            <div className="p-4 border border-slate-100 rounded bg-slate-50">
                                                <div className="text-xs text-slate-500 uppercase">Total User Ports</div>
                                                <div className="text-2xl font-bold text-slate-800">{selectedSite.lanPorts}</div>
                                            </div>
                                            <div className="p-4 border border-slate-100 rounded bg-slate-50">
                                                <div className="text-xs text-slate-500 uppercase">Est. Switches</div>
                                                <div className="text-2xl font-bold text-slate-800">{Math.ceil(selectedSite.lanPorts / 48)} <span className="text-sm font-normal text-slate-500">(48-port)</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "WLAN" && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Wireless Coverage</h3>

                                        <div className="flex items-center space-x-4 mb-6">
                                            <div className="p-3 bg-blue-50 rounded-full">
                                                <span className="text-2xl">📡</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">High Density Coverage</div>
                                                <div className="text-xs text-slate-500">Wi-Fi 6E Enabled</div>
                                            </div>
                                        </div>

                                        <div className="mt-6 grid grid-cols-2 gap-4">
                                            <div className="p-4 border border-slate-100 rounded bg-slate-50">
                                                <div className="text-xs text-slate-500 uppercase">Indoor APs</div>
                                                <div className="text-2xl font-bold text-slate-800">{selectedSite.indoorAPs}</div>
                                            </div>
                                            <div className="p-4 border border-slate-100 rounded bg-slate-50">
                                                <div className="text-xs text-slate-500 uppercase">Outdoor APs</div>
                                                <div className="text-2xl font-bold text-slate-800">{selectedSite.outdoorAPs}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        Select a site from the sidebar or upload a CSV to begin.
                    </div>
                )}
                {selectedSpecsItem && (
                    <SpecsModal
                        item={selectedSpecsItem}
                        onClose={() => setSelectedSpecsItem(null)}
                    />
                )}

                {/* AI Classification Loading Overlay */}
                {isClassifying && (
                    <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 max-w-xs text-center border border-slate-100">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl">🤖</span>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-lg">Classifying Sites...</h4>
                                <p className="text-xs text-slate-500 mt-1">Gemini AI is analyzing your data to match the best deployment profiles.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Review Modal */}
                {previewSites && (
                    <SiteImportReviewModal
                        sites={previewSites}
                        siteTypes={siteTypes}
                        onCancel={() => setPreviewSites(null)}
                        onConfirm={(finalSites) => {
                            setSites(finalSites);
                            setPreviewSites(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default function BOMBuilderPage() {
    return (
        <Suspense fallback={<div className="p-8 text-slate-500">Loading BOM Builder...</div>}>
            <BOMBuilderContent />
        </Suspense>
    );
}

interface ManualDeviceSelectorProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}

function ManualDeviceSelector({ value, onChange, options }: ManualDeviceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value);

    // Close on click outside (simple backdrop)
    useEffect(() => {
        if (!isOpen) return;
        const close = () => setIsOpen(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [isOpen]);

    return (
        <div className="relative" onClick={e => e.stopPropagation()}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-lg shadow-sm text-left text-sm flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-slate-300"
            >
                <span className={!selectedOption ? "text-slate-500 italic" : "font-medium"}>
                    {selectedOption ? selectedOption.label : "Auto-detect"}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-[200px] bg-white rounded-lg shadow-lg border border-slate-100 py-1 max-h-60 overflow-y-auto left-0 sm:left-auto sm:right-0">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                        Select Edge Device...
                    </div>
                    <button
                        type="button"
                        onClick={() => { onChange(""); setIsOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between group ${!value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                    >
                        <span className={!value ? "font-semibold" : ""}>-- Auto-detect --</span>
                        {!value && <CheckIcon />}
                    </button>
                    {options.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => { onChange(option.value); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between group ${value === option.value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                        >
                            <span className={value === option.value ? "font-semibold" : ""}>{option.label}</span>
                            {value === option.value && <CheckIcon />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function SpecsModal({ item, onClose }: { item: Equipment; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Equipment Specifications</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    <div className="flex items-start space-x-6 mb-8">
                        <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                            <svg className="w-16 h-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <div className="inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-2">
                                {VENDOR_LABELS[item.vendor_id] || item.vendor_id}
                            </div>
                            <h4 className="text-2xl font-bold text-slate-900">{item.model}</h4>
                            <p className="text-slate-600 mt-2">{item.description}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                        <div>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Performance</h5>
                            <dl className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500">VPN Throughput</dt>
                                    <dd className="font-semibold text-slate-900">{item.specs.vpn_throughput_mbps} Mbps</dd>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500">NGFW Throughput</dt>
                                    <dd className="font-semibold text-slate-900">{item.specs.ngfw_throughput_mbps || 0} Mbps</dd>
                                </div>
                                {item.specs.adv_sec_throughput_mbps && (
                                    <div className="flex justify-between text-sm">
                                        <dt className="text-slate-500">AdvSec Throughput</dt>
                                        <dd className="font-semibold text-slate-900">{item.specs.adv_sec_throughput_mbps} Mbps</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                        <div>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Hardware</h5>
                            <dl className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500">Total Ports</dt>
                                    <dd className="font-semibold text-slate-900">{item.specs.ports || "N/A"}</dd>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500">WAN Interfaces</dt>
                                    <dd className="font-semibold text-slate-900">{item.specs.wan_interfaces_count || 2}</dd>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500">Form Factor</dt>
                                    <dd className="font-semibold text-slate-900 uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Desktop / Rack</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CheckIcon() {
    return (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
}
