import { Site, BOMLineItem } from "@/src/lib/bom-types";
import { Equipment, LANSpecs } from "@/src/lib/types";
import { TraceabilityPopover } from "@/src/components/common/TraceabilityPopover";
import { LANRequirementsEditor } from "@/src/components/sa/LANRequirementsEditor";
import { useState, useEffect, useMemo } from "react";
import { SiteLANRequirements } from "@/src/lib/types";

interface LANTabProps {
    selectedSite: Site;
    lanItems: BOMLineItem[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manualSelections: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setManualSelections: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    catalog: Equipment[];
    setSelectedSpecsItem: (eq: Equipment | null) => void;
    resolvedVendor: string;
    handleSiteUpdate: (updates: Partial<Site>) => void;
}

export function LANTab({
    selectedSite,
    lanItems,
    manualSelections,
    setManualSelections,
    catalog,
    setSelectedSpecsItem,
    resolvedVendor,
    handleSiteUpdate
}: LANTabProps) {
    const [animatePulse, setAnimatePulse] = useState(false);
    const [showRequirementsEditor, setShowRequirementsEditor] = useState(false);

    useEffect(() => {
        if (lanItems.length > 0) {
            const initialTimer = setTimeout(() => {
                setAnimatePulse(true);
            }, 0);
            const resetTimer = setTimeout(() => setAnimatePulse(false), 700);
            return () => {
                clearTimeout(initialTimer);
                clearTimeout(resetTimer);
            };
        }
    }, [lanItems.length, lanItems.map(i => i.itemId + i.quantity).join(',')]);

    const lanReq = selectedSite.lanRequirements;
    const needsReview = lanReq?.needsManualReview === true;

    const handleRequirementsConfirm = (requirements: SiteLANRequirements) => {
        handleSiteUpdate({ lanRequirements: requirements });
        setShowRequirementsEditor(false);
    };

    const selectionKey = `${selectedSite.name}:managed_lan`;
    const rawValue = manualSelections[selectionKey];

    // Normalize any legacy single selection or string into an array [{ itemId, quantity }]
    const selections = useMemo<Array<{ itemId: string; quantity: number }>>(() => {
        if (!rawValue) return [];
        if (Array.isArray(rawValue)) {
            return rawValue.map(v => (typeof v === 'string' ? { itemId: v, quantity: 1 } : { itemId: v.itemId, quantity: v.quantity || 1 }));
        }
        if (typeof rawValue === 'string') return [{ itemId: rawValue, quantity: 1 }];
        if (typeof rawValue === 'object') return [{ itemId: rawValue.itemId, quantity: rawValue.quantity || 1 }];
        return [];
    }, [rawValue]);

    const siteRequiresPoe = (selectedSite.poePorts || 0) > 0 || (selectedSite.requiredPoePorts || 0) > 0;

    const availableSwitches = useMemo(() => {
        return catalog
            .filter(eq => eq.role === 'LAN' && eq.vendor_id === resolvedVendor)
            .sort((a, b) => {
                const aSpecs = a.specs as Record<string, unknown>;
                const bSpecs = b.specs as Record<string, unknown>;

                if (siteRequiresPoe) {
                    const getPoeBudget = (eqSpecs: Record<string, unknown>) => {
                        return (eqSpecs.poeBudgetWatts as number) || (eqSpecs.poe_budget as number) || (eqSpecs.poeBudget as number) || 0;
                    };
                    const aPoe = getPoeBudget(aSpecs) > 0 ? 1 : 0;
                    const bPoe = getPoeBudget(bSpecs) > 0 ? 1 : 0;
                    if (aPoe !== bPoe) return bPoe - aPoe; // 1 comes before 0
                }

                // Sort by access port count next
                const aPorts = (aSpecs.accessPortCount as number) || 0;
                const bPorts = (bSpecs.accessPortCount as number) || 0;
                if (aPorts !== bPorts) return aPorts - bPorts;

                return a.model.localeCompare(b.model);
            });
    }, [catalog, resolvedVendor, siteRequiresPoe]);

    const updateSelections = (newSelections: Array<{ itemId: string; quantity: number }>) => {
        setManualSelections(prev => {
            const next = { ...prev };
            if (newSelections.length > 0) {
                next[selectionKey] = newSelections;
            } else {
                delete next[selectionKey];
            }
            return next;
        });
    };

    const handleAddSwitch = () => {
        const firstAvailable = availableSwitches[0];
        if (!firstAvailable) return;
        updateSelections([...selections, { itemId: firstAvailable.id, quantity: 1 }]);
    };

    const handleSelectionChange = (index: number, itemId: string) => {
        const next = [...selections];
        next[index] = { ...next[index], itemId };
        updateSelections(next);
    };

    const handleQuantityChange = (index: number, qtyStr: string) => {
        const parsedQty = parseInt(qtyStr, 10);
        if (isNaN(parsedQty) || parsedQty < 1) return;
        const next = [...selections];
        next[index] = { ...next[index], quantity: parsedQty };
        updateSelections(next);
    };

    const handleRemoveSwitch = (index: number) => {
        const next = selections.filter((_, i) => i !== index);
        updateSelections(next);
    };

    // Calculate provided ports, usage, and oversubscription
    const { providedLanPorts, providedPoePorts, totalAccessGbps, totalUplinkGbps } = useMemo(() => {
        let lanP = 0;
        let poeP = 0;
        let accGbps = 0;
        let upGbps = 0;

        const getSpeedGbps = (type: string | undefined): number => {
            if (!type) return 0;
            const lower = type.toLowerCase();
            if (lower.includes('100g')) return 100;
            if (lower.includes('40g')) return 40;
            if (lower.includes('25g')) return 25;
            if (lower.includes('10g')) return 10;
            if (lower.includes('5g')) return 5;
            if (lower.includes('2.5g') || lower.includes('mgig')) return 2.5;
            if (lower.includes('1g')) return 1;
            if (lower.includes('100m')) return 0.1;
            return 1; // Default to 1G for unknown
        };

        selections.forEach(sel => {
            const eq = catalog.find(e => e.id === sel.itemId);
            if (eq && eq.specs) {
                const s = eq.specs as Record<string, unknown>;
                const accessPorts = (s.accessPortCount as number) || 0;
                lanP += accessPorts * sel.quantity;

                const poeBudgetVal = (s.poeBudgetWatts as number) || (s.poe_budget as number) || (s.poeBudget as number) || 0;
                if (poeBudgetVal > 0) poeP += accessPorts * sel.quantity;

                // Oversubscription speeds
                const accessSpeedGbps = getSpeedGbps(s.accessPortType as string);
                const uplinkSpeedGbps = getSpeedGbps(s.uplinkPortType as string);
                const uplinkPorts = (s.uplinkPortCount as number) || 0;

                accGbps += (accessPorts * accessSpeedGbps) * sel.quantity;
                upGbps += (uplinkPorts * uplinkSpeedGbps) * sel.quantity;
            }
        });
        return {
            providedLanPorts: lanP,
            providedPoePorts: poeP,
            totalAccessGbps: accGbps,
            totalUplinkGbps: upGbps
        };
    }, [selections, catalog]);

    const requiredLanPorts = selectedSite.lanPorts || 0;
    const requiredPoePorts = selectedSite.poePorts || selectedSite.requiredPoePorts || 0;

    const calculateUsage = (req: number, prov: number) => {
        if (req === 0 && prov === 0) return 0;
        if (prov === 0) return 0;
        return Math.round((req / prov) * 100);
    };

    const lanUsagePct = calculateUsage(requiredLanPorts, providedLanPorts);
    const poeUsagePct = calculateUsage(requiredPoePorts, providedPoePorts);

    const getUsageColor = (pct: number, prov: number, req: number) => {
        if (req === 0 && prov === 0) return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500';
        if (prov > 0 && req === 0) return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500';
        if (prov === 0 && req > 0) return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400';
        if (pct > 100) return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400';
        if (pct >= 80) return 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400';
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400';
    };

    return (
        <div className="space-y-6">
            {/* LAN Requirements Status Banner */}
            {needsReview ? (
                /* Manual review required — prompt the SA */
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-4">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                        <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">LAN Requirements Need Review</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            Confirm the LAN topology requirements to enable automatic BOM generation.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowRequirementsEditor(true)}
                        className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm transition-all active:scale-[0.98]"
                    >
                        Review Now →
                    </button>
                </div>
            ) : lanReq ? (
                /* Smart defaults applied — show summary badge */
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 flex items-center gap-4">
                    <span className="text-xl">✅</span>
                    <div className="flex-1">
                        <p className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">LAN Requirements Set</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {lanReq.accessPortType && (
                                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                                    Access: {lanReq.accessPortType}
                                </span>
                            )}
                            {lanReq.uplinkPortType && (
                                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                                    Uplink: {lanReq.uplinkPortType}
                                </span>
                            )}
                            {lanReq.poeCapabilities && (
                                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                                    PoE: {lanReq.poeCapabilities}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowRequirementsEditor(true)}
                        className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 underline"
                    >
                        Edit
                    </button>
                </div>
            ) : null}

            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Manual LAN Switch Selection</h3>
                </div>

                {/* Port Usage Visuals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">LAN Port Usage</div>
                            <div className="flex items-baseline space-x-2">
                                <span className={`text-2xl font-black ${lanUsagePct > 100 ? 'text-red-600 dark:text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {providedLanPorts === 0 && requiredLanPorts > 0 ? '⚠️' : `${lanUsagePct}%`}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {requiredLanPorts} req / {providedLanPorts} prov
                            </div>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${getUsageColor(lanUsagePct, providedLanPorts, requiredLanPorts)}`}>
                            🔌
                        </div>
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-opacity ${(requiredPoePorts === 0 && providedPoePorts === 0) ? 'opacity-50 grayscale bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/50' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PoE Port Usage</div>
                            <div className="flex items-baseline space-x-2">
                                <span className={`text-2xl font-black ${poeUsagePct > 100 ? 'text-red-600 dark:text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {providedPoePorts === 0 && requiredPoePorts > 0 ? '⚠️' : `${poeUsagePct}%`}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {requiredPoePorts} req / {providedPoePorts} prov
                            </div>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${getUsageColor(poeUsagePct, providedPoePorts, requiredPoePorts)}`}>
                            ⚡
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Uplink Oversubscription</div>
                            <div className="flex items-baseline space-x-2">
                                <span className={`text-2xl font-black ${(totalAccessGbps / (totalUplinkGbps || 1)) > 20 ? 'text-amber-600 dark:text-amber-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {totalUplinkGbps === 0 ? 'N/A' : `${(totalAccessGbps / totalUplinkGbps).toFixed(1)} : 1`}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {totalAccessGbps.toFixed(0)}G edge / {totalUplinkGbps.toFixed(0)}G up
                            </div>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${totalUplinkGbps === 0 ? 'bg-slate-100 text-slate-400' : (totalAccessGbps / totalUplinkGbps) > 50 ? 'bg-red-100 text-red-600' : (totalAccessGbps / totalUplinkGbps) > 20 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                            🚀
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {selections.map((sel, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 relative group">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1.5 tracking-wider">Select Switch</label>
                                <select
                                    className="block w-full rounded-lg border-blue-100 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm py-2.5 transition-all duration-200"
                                    value={sel.itemId}
                                    onChange={(e) => handleSelectionChange(idx, e.target.value)}
                                >
                                    {/* Ensure the currently selected item is always in the list even if filtered out */}
                                    {(() => {
                                        const options = [...availableSwitches];
                                        if (!options.find(o => o.id === sel.itemId)) {
                                            const selectedEquip = catalog.find(e => e.id === sel.itemId);
                                            if (selectedEquip) options.push(selectedEquip);
                                        }

                                        return options.map((eq) => {
                                            const s = eq.specs as Record<string, unknown>;
                                            const ports = (s.accessPortCount as number) ? `${s.accessPortCount}x` : '';
                                            const ethType = (s.accessPortType as string) ? (s.accessPortType as string) : '';
                                            const uplinks = (s.uplinkPortType as string) ? `${(s.uplinkPortCount as number) || 0}x ${s.uplinkPortType} Uplinks` : '';
                                            const poeBudgetVal = (s.poeBudgetWatts as number) || (s.poe_budget as number) || (s.poeBudget as number) || 0;
                                            const poe = poeBudgetVal > 0 ? `${poeBudgetVal}W PoE` : '';

                                            const labelParts = [
                                                eq.model,
                                                `${ports} ${ethType}`.trim(),
                                                uplinks,
                                                poe
                                            ].filter(Boolean).join(' | ');

                                            return (
                                                <option key={eq.id} value={eq.id}>
                                                    {labelParts}
                                                </option>
                                            );
                                        });
                                    })()}
                                </select>
                            </div>

                            <div className="w-full md:w-32">
                                <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1.5 tracking-wider">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="block w-full rounded-lg border-blue-100 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm py-2.5 transition-all duration-200"
                                    value={sel.quantity}
                                    onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                />
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={() => handleRemoveSwitch(idx)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remove Switch"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}

                    {selections.length === 0 && (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <p className="text-sm text-slate-500">No manual switches selected.</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Please add a switch to see BOM output</p>
                        </div>
                    )}

                    <button
                        onClick={handleAddSwitch}
                        className="w-full py-3 px-4 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-xl text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2"
                    >
                        <span>➕</span> Add Switch Model
                    </button>
                </div>
            </div>

            {/* Generated BOM for LAN */}
            {lanItems.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Hardware BOM Output</h3>
                    <div className="flex flex-col space-y-4">
                        {lanItems.map((item) => (
                            <div key={item.id} className={`transition-all duration-300 flex items-center justify-between p-4 border rounded-lg ${animatePulse ? 'bg-blue-100/70 border-blue-400' : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40'}`}>
                                <div className="flex items-center space-x-4">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg">🔌</div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center">
                                            {item.itemName}
                                            <TraceabilityPopover matchedRules={item.matchedRules} reasoning={item.reasoning} />
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-col space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100/50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                    {item.reasoning === 'Manual Selection' ? '👤 Manual Selection' : '💡 System Resolved'}
                                                </span>
                                                <span>{item.reasoning}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const eq = catalog.find(e => e.id === item.itemId);
                                                    if (eq) setSelectedSpecsItem(eq);
                                                }}
                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider mt-2 flex items-center w-fit"
                                            >
                                                View Specs
                                                <svg className="w-2.5 h-2.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 uppercase text-[10px] font-bold">Quantity</div>
                                    <div className="text-2xl font-black text-blue-600">{item.quantity}</div>
                                    {item.pricing?.netPrice !== undefined && (
                                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                                            ${item.pricing.netPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} /unit
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* LANRequirementsEditor slide-out panel */}
            {showRequirementsEditor && (
                <LANRequirementsEditor
                    site={selectedSite}
                    catalog={catalog}
                    onConfirm={handleRequirementsConfirm}
                    onDismiss={() => setShowRequirementsEditor(false)}
                />
            )}
        </div>
    );
}

