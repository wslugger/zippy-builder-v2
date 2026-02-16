"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ProjectService, PackageService, ServiceService, SiteDefinitionService } from "@/src/lib/firebase";
import { Project, Package, Service } from "@/src/lib/types";
import { Site, BOM } from "@/src/lib/bom-types";
import { SiteType } from "@/src/lib/site-types";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { BOMEngine } from "@/src/lib/bom-engine";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { parseSiteListCSV } from "@/src/lib/csv-parser";

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
    const [services, setServices] = useState<Service[]>([]);
    const [siteTypes, setSiteTypes] = useState<SiteType[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSiteIndex, setSelectedSiteIndex] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<string>("sdwan");
    const [engine] = useState(() => new BOMEngine(SEED_BOM_RULES, SEED_EQUIPMENT));

    // Load Project Data
    useEffect(() => {
        async function loadData() {
            if (!projectId) return;
            let p;
            if (projectId === 'demo') {
                const pkgs = await PackageService.getAllPackages();
                p = {
                    id: 'demo',
                    userId: 'demo-user',
                    name: 'Demo Project',
                    customerName: 'Demo Corporation',
                    description: 'Automated test project for BOM troubleshooting.',
                    status: 'completed',
                    currentStep: 5,
                    selectedPackageId: pkgs[0]?.id || 'cost_centric',
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
            const s = await ServiceService.getAllServices();
            setServices(s);

            const st = await SiteDefinitionService.getAllSiteDefinitions();
            setSiteTypes(st);
        }
        loadData();
    }, [projectId]);

    // Handle CSV Upload (Simulated for now if not present in project)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseSiteListCSV(text);
            setSites(parsed);
        };
        reader.readAsText(file);
    };

    const loadSampleData = () => {
        const parsed = parseSiteListCSV(SAMPLE_CSV);
        setSites(parsed);
    };

    useEffect(() => {
        if (searchParams.get("loadSample") === "true") {
            setTimeout(loadSampleData, 500);
        }
    }, [searchParams]);

    // Re-generate BOM when sites change or logic changes
    // Re-generate BOM when sites change or logic changes
    const bom: BOM | null = useMemo(() => {
        if (sites.length > 0 && pkg && services.length > 0 && siteTypes.length > 0) {
            return engine.generateBOM(projectId, sites, pkg, services, siteTypes);
        }
        return null;
    }, [sites, pkg, services, siteTypes, engine, projectId]);


    const selectedSite = sites[selectedSiteIndex];
    const siteBOMItems = bom?.items.filter(i => i.siteName === selectedSite?.name) || [];

    // Calculate Utilization & Alerts
    const currentSDWANItem = siteBOMItems.find(i => i.serviceId === "managed_sdwan" && i.itemType === "equipment");
    const currentSDWANEquipment = SEED_EQUIPMENT.find(e => e.id === currentSDWANItem?.itemId);

    const utilization = selectedSite && currentSDWANEquipment
        ? engine.calculateUtilization(selectedSite, currentSDWANEquipment)
        : 0;

    const poeWarnings = selectedSite ? engine.validatePOE(selectedSite, siteBOMItems) : [];

    // Derived Tabs from Project Services
    // For demo, we hardcode tabs based on standard services found in seed data
    // In real app, iterate project.customizedItems -> serviceId
    const availableTabs = [
        { id: "sdwan", label: "WAN", serviceId: "managed_sdwan" },
        { id: "lan", label: "LAN", serviceId: "managed_lan" },
        { id: "wlan", label: "WLAN", serviceId: "managed_wifi" }
    ].filter(t => pkg?.items.some(i => i.service_id === t.serviceId) || true); // Default true for demo if pkg not fully loaded

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
                    <button
                        onClick={loadSampleData}
                        className="mt-2 w-full text-left px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-blue-600 transition-colors border border-dashed border-slate-200 rounded"
                    >
                        Load Sample Sites (Test)
                    </button>
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
                                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                            {site.siteTypeId ? siteTypes.find(t => t.id === site.siteTypeId)?.name : "Generic Branch"}
                                        </span>
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
                                        {tab.serviceId === "managed_sdwan" && <span className="mr-2">🌐</span>}
                                        {tab.serviceId === "managed_lan" && <span className="mr-2">🔌</span>}
                                        {tab.serviceId === "managed_wifi" && <span className="mr-2">📡</span>}
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {activeTab === "sdwan" && (
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
                                        </div>
                                    </div>

                                    {/* Section: Edge Device */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Edge Device</h3>
                                        {currentSDWANEquipment ? (
                                            <div className="flex items-start space-x-6">
                                                <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                                                    {/* Placeholder Image */}
                                                    <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <h4 className="text-lg font-bold text-slate-900">{currentSDWANEquipment.model}</h4>
                                                        <button className="text-sm text-blue-600 hover:underline">View Specs</button>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1">{currentSDWANEquipment.description}</p>

                                                    {/* Utilization Bar */}
                                                    <div className="mt-4">
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="font-medium text-slate-500">Throughput Utilization <span className="text-slate-400 font-normal">(Limit: 80%)</span></span>
                                                            <span className={`font-bold ${utilization > 80 ? 'text-red-600' : 'text-slate-700'}`}>{utilization}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                            <div
                                                                className={`h-2.5 rounded-full ${utilization > 80 ? 'bg-red-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${utilization}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex justify-between text-xs mt-1 text-slate-400">
                                                            <span>Total Load: {Math.max(selectedSite.bandwidthDownMbps, selectedSite.bandwidthUpMbps)} Mbps</span>
                                                            <span>Capacity: {currentSDWANEquipment.specs.ngfw_throughput_mbps} Mbps</span>
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

                            {activeTab === "lan" && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">LAN Infrastructure</h3>
                                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Switch Profile</label>
                                            <select
                                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                defaultValue={siteTypes.find(t => t.category === "LAN" && t.tier === "Standard Branch")?.id}
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

                            {activeTab === "wlan" && (
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
            </div>
        </div>
    );
}

export default function BOMBuilderPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading BOM Builder...</div>}>
            <BOMBuilderContent />
        </Suspense>
    );
}
