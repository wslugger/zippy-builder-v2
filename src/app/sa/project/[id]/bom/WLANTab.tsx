import { Site, BOMLineItem } from "@/src/lib/bom-types";
import { Equipment } from "@/src/lib/types";
import { TraceabilityPopover } from "@/src/components/common/TraceabilityPopover";
import { useState, useEffect, useMemo } from "react";

interface WLANTabProps {
    selectedSite: Site;
    wlanItems: BOMLineItem[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manualSelections: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setManualSelections: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    catalog: Equipment[];
    setSelectedSpecsItem: (eq: Equipment | null) => void;
    resolvedVendor: string;
    handleSiteUpdate: (updates: Partial<Site>) => void;
}

export function WLANTab({
    selectedSite,
    wlanItems,
    manualSelections,
    setManualSelections,
    catalog,
    setSelectedSpecsItem,
    resolvedVendor,
    handleSiteUpdate
}: WLANTabProps) {
    const [animatePulse, setAnimatePulse] = useState(false);

    useEffect(() => {
        if (wlanItems.length > 0) {
            const initialTimer = setTimeout(() => {
                setAnimatePulse(true);
            }, 0);
            const resetTimer = setTimeout(() => setAnimatePulse(false), 700);
            return () => {
                clearTimeout(initialTimer);
                clearTimeout(resetTimer);
            };
        }
    }, [wlanItems.length, wlanItems.map(i => i.itemId + i.quantity).join(',')]);

    const selectionKey = `${selectedSite.name}:managed_wifi`;
    const rawValue = manualSelections[selectionKey];

    const selections = useMemo<Array<{ itemId: string; quantity: number }>>(() => {
        if (!rawValue) return [];
        if (Array.isArray(rawValue)) {
            return rawValue.map(v => (typeof v === 'string' ? { itemId: v, quantity: 1 } : { itemId: v.itemId, quantity: v.quantity || 1 }));
        }
        if (typeof rawValue === 'string') return [{ itemId: rawValue, quantity: 1 }];
        if (typeof rawValue === 'object') return [{ itemId: rawValue.itemId, quantity: rawValue.quantity || 1 }];
        return [];
    }, [rawValue]);

    const availableAPs = useMemo(() => {
        return catalog
            .filter(eq => eq.role === 'WLAN' && eq.vendor_id === resolvedVendor)
            .sort((a, b) => a.model.localeCompare(b.model));
    }, [catalog, resolvedVendor]);

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

    const handleAddAP = () => {
        const firstAvailable = availableAPs[0];
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

    const handleRemoveAP = (index: number) => {
        const next = selections.filter((_, i) => i !== index);
        updateSelections(next);
    };

    const { providedIndoorAPs, providedOutdoorAPs } = useMemo(() => {
        let indAPs = 0;
        let outAPs = 0;

        wlanItems.forEach(item => {
            const eq = catalog.find(e => e.id === item.itemId);
            if (eq && eq.specs) {
                const s = eq.specs as Record<string, unknown>;
                const env = (s.environment as string) || 'Indoor';
                if (env.toLowerCase() === 'outdoor') {
                    outAPs += item.quantity;
                } else {
                    indAPs += item.quantity;
                }
            }
        });
        return {
            providedIndoorAPs: indAPs,
            providedOutdoorAPs: outAPs,
        };
    }, [wlanItems, catalog]);

    const requiredIndoorAPs = selectedSite.indoorAPs || 0;
    const requiredOutdoorAPs = selectedSite.outdoorAPs || 0;

    const calculateUsage = (req: number, prov: number) => {
        if (req === 0 && prov === 0) return 0;
        if (prov === 0) return 0;
        return Math.round((req / prov) * 100);
    };

    const indoorUsagePct = calculateUsage(requiredIndoorAPs, providedIndoorAPs);
    const outdoorUsagePct = calculateUsage(requiredOutdoorAPs, providedOutdoorAPs);

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
            {/* Site Requirements Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Site Requirements Reference</h3>
                    <div className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
                        ⚠️ LOCAL OVERRIDE
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:w-1/2">
                    <div>
                        <label htmlFor="indoor-aps-input" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Indoor APs</label>
                        <input
                            id="indoor-aps-input"
                            type="number"
                            min="0"
                            className="block w-full rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 text-sm"
                            value={selectedSite.indoorAPs || 0}
                            onChange={(e) => handleSiteUpdate({ indoorAPs: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div>
                        <label htmlFor="outdoor-aps-input" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Outdoor APs</label>
                        <input
                            id="outdoor-aps-input"
                            type="number"
                            min="0"
                            className="block w-full rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 text-sm"
                            value={selectedSite.outdoorAPs || 0}
                            onChange={(e) => handleSiteUpdate({ outdoorAPs: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>
                <p className="mt-4 text-[11px] text-slate-500 italic">
                    Adjusting these values will update calculations for BOM validation instantly.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Manual WLAN AP Selection</h3>
                </div>

                {/* Port Usage Visuals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Indoor AP Coverage</div>
                            <div className="flex items-baseline space-x-2">
                                <span className={`text-2xl font-black ${indoorUsagePct > 100 ? 'text-red-600 dark:text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {providedIndoorAPs === 0 && requiredIndoorAPs > 0 ? '⚠️' : `${indoorUsagePct}%`}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {requiredIndoorAPs} req / {providedIndoorAPs} prov
                            </div>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${getUsageColor(indoorUsagePct, providedIndoorAPs, requiredIndoorAPs)}`}>
                            📶
                        </div>
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-opacity ${(requiredOutdoorAPs === 0 && providedOutdoorAPs === 0) ? 'opacity-50 grayscale bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/50' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Outdoor AP Coverage</div>
                            <div className="flex items-baseline space-x-2">
                                <span className={`text-2xl font-black ${outdoorUsagePct > 100 ? 'text-red-600 dark:text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {providedOutdoorAPs === 0 && requiredOutdoorAPs > 0 ? '⚠️' : `${outdoorUsagePct}%`}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {requiredOutdoorAPs} req / {providedOutdoorAPs} prov
                            </div>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${getUsageColor(outdoorUsagePct, providedOutdoorAPs, requiredOutdoorAPs)}`}>
                            ☀️
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {selections.map((sel, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 relative group">
                            <div className="flex-1">
                                <label htmlFor={`select-ap-${idx}`} className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select AP</label>
                                <select
                                    id={`select-ap-${idx}`}
                                    className="block w-full rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 text-sm"
                                    value={sel.itemId}
                                    onChange={(e) => handleSelectionChange(idx, e.target.value)}
                                >
                                    {(() => {
                                        const options = [...availableAPs];
                                        if (!options.find(o => o.id === sel.itemId)) {
                                            const selectedEquip = catalog.find(e => e.id === sel.itemId);
                                            if (selectedEquip) options.push(selectedEquip);
                                        }

                                        return options.map((eq) => {
                                            const s = eq.specs as Record<string, unknown>;
                                            const wifiStd = (s.wifiStandard as string) ? s.wifiStandard : '';
                                            const env = (s.environment as string) ? s.environment : '';

                                            const labelParts = [
                                                eq.model,
                                                wifiStd,
                                                env
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
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="block w-full rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 text-sm"
                                    value={sel.quantity}
                                    onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                />
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={() => handleRemoveAP(idx)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remove AP"
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
                            <p className="text-sm text-slate-500">No manual APs selected.</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Please add an AP to see BOM output</p>
                        </div>
                    )}

                    <button
                        onClick={handleAddAP}
                        className="w-full py-3 px-4 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-xl text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2"
                    >
                        <span>➕</span> Add AP Model
                    </button>
                </div>
            </div>

            {/* Generated BOM for WLAN */}
            {wlanItems.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Hardware BOM Output</h3>
                    <div className="flex flex-col space-y-4">
                        {wlanItems.map((item) => (
                            <div key={item.id} className={`transition-all duration-300 flex items-center justify-between p-4 border rounded-lg ${animatePulse ? 'bg-blue-100/70 border-blue-400' : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40'}`}>
                                <div className="flex items-center space-x-4">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg">📶</div>
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
        </div>
    );
}
