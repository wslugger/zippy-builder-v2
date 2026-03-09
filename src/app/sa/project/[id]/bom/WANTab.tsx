import { Equipment, Package, Site, BOMLineItem, SiteType } from "@/src/lib/types";
import React from "react";
import { isDualRedundancy, isDualCircuit, getEquipmentRole, getSelectionKey } from "@/src/lib/bom-utils";
import { ManualDeviceSelector } from "./ManualDeviceSelector";
import { TraceabilityPopover } from "@/src/components/common/TraceabilityPopover";

interface WANTabProps {
    selectedSite: Site;
    siteTypes: SiteType[];
    handleSiteTypeChange: (siteTypeId: string) => void;
    manualSelections: Record<string, string>;
    setManualSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    catalog: Equipment[];
    getVendorForService: (serviceId: string) => string;
    currentSDWANEquipment: Equipment | undefined;
    currentSDWANItem: BOMLineItem | undefined;
    setSelectedSpecsItem: (eq: Equipment | null) => void;
    utilization: number;
    totalLoad: number;
    pkg: Package | null;
    handleSiteUpdate: (updates: Partial<Site>) => void;
}

export function WANTab({
    selectedSite,
    siteTypes,
    handleSiteTypeChange,
    manualSelections,
    setManualSelections,
    catalog,
    getVendorForService,
    currentSDWANEquipment,
    currentSDWANItem,
    setSelectedSpecsItem,
    utilization,
    totalLoad,
    pkg,
    handleSiteUpdate,
}: WANTabProps) {
    return (
        <div className="space-y-6">
            {/* SD-WAN Profile Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">SD-WAN Site Profile</h3>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-md border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Select Deployment Profile</label>
                    <select
                        className="block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        value={selectedSite.siteTypeId || ""}
                        onChange={(e) => handleSiteTypeChange(e.target.value)}
                    >
                        <option value="">-- Auto-detected (Generic) --</option>
                        {siteTypes.filter((t) => t.category === "SD-WAN").map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
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
                                <div className="flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                    <span className="mr-1.5">🛡️</span>
                                    {isDualRedundancy(cpe) ? "2 x CPE (High Availability)" : "1 x CPE (Standard)"}
                                </div>
                                <div className="flex items-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                                    <span className="mr-1.5">🧬</span>
                                    {isDualCircuit(circuit) ? "Dual Circuit (Diverse)" : "Single Circuit"}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Edge Device Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Edge Device</h3>
                    <div className="flex items-center space-x-2 relative z-10 w-full max-w-[200px]">
                        <ManualDeviceSelector
                            value={manualSelections[getSelectionKey(selectedSite.name, 'sdwan')] || ""}
                            onChange={(val) => {
                                setManualSelections((prev) => {
                                    const next = { ...prev };
                                    const key = getSelectionKey(selectedSite.name, 'sdwan');
                                    if (val) next[key] = val;
                                    else delete next[key];
                                    return next;
                                });
                            }}
                            options={catalog
                                .filter((e) => {
                                    if (getEquipmentRole(e) !== "WAN") return false;
                                    if ((e as unknown as Record<string, unknown>).status === 'eos') return false;
                                    return e.vendor_id === getVendorForService("sdwan");
                                })
                                .map((e) => ({ value: e.id, label: e.model }))}

                        />
                    </div>
                </div>

                {currentSDWANEquipment ? (
                    <div className="flex items-start space-x-6">
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            <svg className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between">
                                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
                                    {currentSDWANItem?.quantity && currentSDWANItem.quantity > 1 ? `${currentSDWANItem.quantity} x ` : ""}
                                    {currentSDWANEquipment.model}
                                    <TraceabilityPopover matchedRules={currentSDWANItem?.matchedRules} reasoning={currentSDWANItem?.reasoning} />
                                </h4>
                                {currentSDWANItem?.pricing?.netPrice !== undefined && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 text-right tabular-nums">
                                        List: ${currentSDWANItem.pricing.netPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} /unit
                                    </p>
                                )}
                                <button onClick={() => setSelectedSpecsItem(currentSDWANEquipment)} className="text-sm text-blue-600 hover:underline">
                                    View Specs
                                </button>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{currentSDWANEquipment.description}</p>
                            {manualSelections[getSelectionKey(selectedSite.name, 'sdwan')] && (
                                <p className="text-xs text-amber-600 mt-2 font-semibold flex items-center">
                                    <span className="mr-1">⚠️</span> Manually Selected
                                </p>
                            )}

                            {/* Utilization bar */}
                            <div className="mt-4">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-500 dark:text-slate-400">Throughput Utilization <span className="text-slate-400 dark:text-slate-500 font-normal">(Limit: 80%)</span></span>
                                    <span className={`font-bold ${utilization > 80 ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-200"}`}>{utilization}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-2.5 rounded-full ${utilization > 80 ? "bg-red-500" : "bg-amber-500"}`}
                                        style={{ width: `${Math.min(100, utilization)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs mt-1 text-slate-400">
                                    <span>Total Load: {totalLoad} Mbps (Aggregate)</span>
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <span>Capacity: {(currentSDWANEquipment.specs as any)[(pkg?.throughput_basis || "sdwanCryptoThroughputMbps")] || 0} Mbps ({(pkg?.throughput_basis || "sdwanCryptoThroughputMbps").replace(/_/g, " ").toUpperCase()})</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-slate-500 italic">No device selected. Please check site profile or bandwidth requirements.</div>
                )}
            </div>

            {/* Circuit Configuration Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Circuit Configuration</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800/50">
                        <div className="flex items-center space-x-3">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {selectedSite.primaryCircuit}
                                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-1.5 py-0.5 rounded uppercase font-bold">PRI</span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Partner ISP • Optical</div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{selectedSite.bandwidthDownMbps} Mbps</div>
                            <div className="flex space-x-2">
                                <div className="flex items-center space-x-1 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900">
                                    <span className="text-slate-500 text-[10px] font-bold">OTC $</span>
                                    <input
                                        type="number"
                                        className="w-14 bg-transparent border-none p-0 text-sm focus:ring-0 text-right"
                                        placeholder="OTC"
                                        value={selectedSite.primaryCircuitOTC || ""}
                                        onChange={(e) => handleSiteUpdate({ primaryCircuitOTC: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="flex items-center space-x-1 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900">
                                    <span className="text-slate-500 text-[10px] font-bold">MRC $</span>
                                    <input
                                        type="number"
                                        className="w-14 bg-transparent border-none p-0 text-sm focus:ring-0 text-right"
                                        placeholder="MRC"
                                        value={selectedSite.primaryCircuitMRC || ""}
                                        onChange={(e) => handleSiteUpdate({ primaryCircuitMRC: Number(e.target.value) })}
                                    />
                                    <span className="text-slate-400 text-[10px]">/mo</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {selectedSite.secondaryCircuit && (
                        <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800/50">
                            <div className="flex items-center space-x-3">
                                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                                    <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {selectedSite.secondaryCircuit}
                                        <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase font-bold">SEC</span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">Local Cable • Electrical</div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="font-bold text-slate-900 dark:text-slate-100">{Math.round(selectedSite.bandwidthDownMbps * 0.1)} Mbps</div>
                                <div className="flex space-x-2">
                                    <div className="flex items-center space-x-1 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900">
                                        <span className="text-slate-500 text-[10px] font-bold">OTC $</span>
                                        <input
                                            type="number"
                                            className="w-14 bg-transparent border-none p-0 text-sm focus:ring-0 text-right"
                                            placeholder="OTC"
                                            value={selectedSite.secondaryCircuitOTC || ""}
                                            onChange={(e) => handleSiteUpdate({ secondaryCircuitOTC: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="flex items-center space-x-1 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900">
                                        <span className="text-slate-500 text-[10px] font-bold">MRC $</span>
                                        <input
                                            type="number"
                                            className="w-14 bg-transparent border-none p-0 text-sm focus:ring-0 text-right"
                                            placeholder="MRC"
                                            value={selectedSite.secondaryCircuitMRC || ""}
                                            onChange={(e) => handleSiteUpdate({ secondaryCircuitMRC: Number(e.target.value) })}
                                        />
                                        <span className="text-slate-400 text-[10px]">/mo</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
