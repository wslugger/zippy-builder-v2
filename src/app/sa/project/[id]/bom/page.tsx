"use client";

import { Suspense } from "react";
import { SiteImportReviewModal } from "@/src/components/sa/SiteImportReviewModal";
import { isDualRedundancy, isDualCircuit } from "@/src/lib/bom-utils";
import { useBOMBuilder } from "./useBOMBuilder";
import { SiteSidebar } from "./SiteSidebar";
import { ManualDeviceSelector } from "./ManualDeviceSelector";
import { SpecsModal } from "./SpecsModal";

// ─────────────────────────────────────────────
// Small local icons (trivial, kept in page file)
// ─────────────────────────────────────────────
const AlertIcon = () => (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

// ─────────────────────────────────────────────
// Main content (needs useSearchParams → Suspense wrapper below)
// ─────────────────────────────────────────────
function BOMBuilderContent() {
    const state = useBOMBuilder();
    const {
        project, pkg, allPackages, siteTypes, catalog,
        sites, setSites, selectedSiteIndex, setSelectedSiteIndex, selectedSite,
        activeTab, setActiveTab, availableTabs,
        bom,
        manualSelections, setManualSelections,
        selectedSpecsItem, setSelectedSpecsItem,
        isClassifying, previewSites, setPreviewSites,
        utilization, totalLoad, poeWarnings,
        currentSDWANEquipment, currentSDWANItem,
        handleFileUpload, loadSampleData, getVendorForService,
        handlePackageChange, handleSiteTypeChange, projectId,
    } = state;

    if (!project) return <div className="p-8">Loading Project...</div>;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* ── Sidebar ── */}
            <SiteSidebar
                sites={sites}
                siteTypes={siteTypes}
                selectedSiteIndex={selectedSiteIndex}
                onSelectSite={setSelectedSiteIndex}
                onClearSites={() => { setSites([]); setSelectedSiteIndex(0); }}
                onFileUpload={handleFileUpload}
                onLoadSample={loadSampleData}
                bom={bom}
                projectId={projectId}
                pkg={pkg}
                allPackages={allPackages}
                onPackageChange={handlePackageChange}
            />

            {/* ── Main Content ── */}
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
                                            onChange={(e) => handleSiteTypeChange(e.target.value)}
                                        >
                                            <option value="">Select Profile...</option>
                                            {siteTypes.map((t) => (
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
                                {availableTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                            ? "border-blue-500 text-blue-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
                                    >
                                        <span className="mr-2">{tab.icon}</span>{tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {/* ── WAN Tab ── */}
                            {activeTab === "WAN" && (
                                <div className="space-y-6">
                                    {/* SD-WAN Profile Card */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">SD-WAN Site Profile</h3>
                                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Select Deployment Profile</label>
                                            <select
                                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                value={selectedSite.siteTypeId || ""}
                                                onChange={(e) => handleSiteTypeChange(e.target.value)}
                                            >
                                                <option value="">-- Auto-detected (Generic) --</option>
                                                {siteTypes.filter((t) => t.category === "SD-WAN").map((t) => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            <p className="mt-2 text-xs text-slate-500 italic">
                                                {siteTypes.find((t) => t.id === selectedSite.siteTypeId)?.description || "Standard branch deployment based on user count."}
                                            </p>

                                            {/* Redundancy badges */}
                                            {(() => {
                                                const siteDef = siteTypes.find((t) => t.id === selectedSite.siteTypeId);
                                                if (!siteDef) return null;
                                                const cpe = siteDef.defaults?.redundancy?.cpe || "";
                                                const circuit = siteDef.defaults?.redundancy?.circuit || "";
                                                return (
                                                    <div className="mt-3 flex space-x-4">
                                                        <div className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                            <span className="mr-1.5">🛡️</span>
                                                            {isDualRedundancy(cpe) ? "2 x CPE (High Availability)" : "1 x CPE (Standard)"}
                                                        </div>
                                                        <div className="flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                            <span className="mr-1.5">🧬</span>
                                                            {isDualCircuit(circuit) ? "Dual Circuit (Diverse)" : "Single Circuit"}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Edge Device Card */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Edge Device</h3>
                                            <div className="flex items-center space-x-2 relative z-10 w-full max-w-[200px]">
                                                <ManualDeviceSelector
                                                    value={manualSelections[`${selectedSite.name}:managed_sdwan`] || ""}
                                                    onChange={(val) => {
                                                        setManualSelections((prev) => {
                                                            const next = { ...prev };
                                                            const key = `${selectedSite.name}:managed_sdwan`;
                                                            if (val) next[key] = val;
                                                            else delete next[key];
                                                            return next;
                                                        });
                                                    }}
                                                    options={catalog
                                                        .filter((e) => {
                                                            if (!e.purpose.includes("SDWAN")) return false;
                                                            return e.vendor_id === getVendorForService("managed_sdwan");
                                                        })
                                                        .map((e) => ({ value: e.id, label: e.model }))}
                                                />
                                            </div>
                                        </div>

                                        {currentSDWANEquipment ? (
                                            <div className="flex items-start space-x-6">
                                                <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                                                    <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <h4 className="text-lg font-bold text-slate-900">
                                                            {currentSDWANItem?.quantity && currentSDWANItem.quantity > 1 ? `${currentSDWANItem.quantity} x ` : ""}
                                                            {currentSDWANEquipment.model}
                                                        </h4>
                                                        <button onClick={() => setSelectedSpecsItem(currentSDWANEquipment)} className="text-sm text-blue-600 hover:underline">
                                                            View Specs
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1">{currentSDWANEquipment.description}</p>
                                                    {manualSelections[`${selectedSite.name}:managed_sdwan`] && (
                                                        <p className="text-xs text-amber-600 mt-2 font-semibold flex items-center">
                                                            <span className="mr-1">⚠️</span> Manually Selected
                                                        </p>
                                                    )}

                                                    {/* Utilization bar */}
                                                    <div className="mt-4">
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="font-medium text-slate-500">Throughput Utilization <span className="text-slate-400 font-normal">(Limit: 80%)</span></span>
                                                            <span className={`font-bold ${utilization > 80 ? "text-red-600" : "text-slate-700"}`}>{utilization}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                            <div
                                                                className={`h-2.5 rounded-full ${utilization > 80 ? "bg-red-500" : "bg-amber-500"}`}
                                                                style={{ width: `${Math.min(100, utilization)}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between text-xs mt-1 text-slate-400">
                                                            <span>Total Load: {totalLoad} Mbps (Aggregate)</span>
                                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                            <span>Capacity: {(currentSDWANEquipment.specs as any)[(pkg?.throughput_basis || "vpn_throughput_mbps")] || 0} Mbps ({(pkg?.throughput_basis || "vpn_throughput_mbps").replace(/_/g, " ").toUpperCase()})</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-500 italic">No device selected. Please check site profile or bandwidth requirements.</div>
                                        )}
                                    </div>

                                    {/* Circuit Configuration Card */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Circuit Configuration</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-white">
                                                <div className="flex items-center space-x-3">
                                                    <div className="bg-slate-100 p-2 rounded-full">
                                                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">
                                                            {selectedSite.primaryCircuit}
                                                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded uppercase font-bold">PRI</span>
                                                        </div>
                                                        <div className="text-xs text-slate-500">Partner ISP • Optical</div>
                                                    </div>
                                                </div>
                                                <div className="font-bold text-slate-900">{selectedSite.bandwidthDownMbps} Mbps</div>
                                            </div>

                                            {selectedSite.secondaryCircuit && (
                                                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-white">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="bg-slate-100 p-2 rounded-full">
                                                            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-900">
                                                                {selectedSite.secondaryCircuit}
                                                                <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase font-bold">SEC</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500">Local Cable • Electrical</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-bold text-slate-900">{Math.round(selectedSite.bandwidthDownMbps * 0.1)} Mbps</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── LAN Tab ── */}
                            {activeTab === "LAN" && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">LAN Infrastructure</h3>
                                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Switch Profile</label>
                                            <select
                                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                defaultValue={siteTypes.find((t) => t.category === "LAN")?.id}
                                            >
                                                {siteTypes.filter((t) => t.category === "LAN").map((t) => (
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
                                                <div className="text-2xl font-bold text-slate-800">
                                                    {Math.ceil(selectedSite.lanPorts / 48)} <span className="text-sm font-normal text-slate-500">(48-port)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── WLAN Tab ── */}
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

                {/* ── Modals ── */}
                {selectedSpecsItem && (
                    <SpecsModal item={selectedSpecsItem} onClose={() => setSelectedSpecsItem(null)} />
                )}

                {isClassifying && (
                    <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 max-w-xs text-center border border-slate-100">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
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

                {previewSites && (
                    <SiteImportReviewModal
                        sites={previewSites}
                        siteTypes={siteTypes}
                        onCancel={() => setPreviewSites(null)}
                        onConfirm={(finalSites) => { setSites(finalSites); setPreviewSites(null); }}
                    />
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Page export with Suspense boundary
// ─────────────────────────────────────────────
export default function BOMBuilderPage() {
    return (
        <Suspense fallback={<div className="p-8 text-slate-500">Loading BOM Builder...</div>}>
            <BOMBuilderContent />
        </Suspense>
    );
}
