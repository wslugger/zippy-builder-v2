import { Site, BOMLineItem } from "@/src/lib/bom-types";
import { Equipment, LANSpecs } from "@/src/lib/types";
import { TraceabilityPopover } from "@/src/components/common/TraceabilityPopover";
import { useState, useEffect, useMemo } from "react";

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
}

export function LANTab({
    selectedSite,
    lanItems,
    manualSelections,
    setManualSelections,
    catalog,
    setSelectedSpecsItem,
    resolvedVendor
}: LANTabProps) {
    const [animatePulse, setAnimatePulse] = useState(false);
    const [overridePoeFilter, setOverridePoeFilter] = useState(false);

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

    const availableSwitches = catalog.filter(eq => {
        if (eq.role !== 'LAN' || eq.vendor_id !== resolvedVendor) return false;
        if (overridePoeFilter) return true;

        // If site requires PoE, only show PoE-capable switches
        const siteRequiresPoe = (selectedSite.poePorts || 0) > 0 || (selectedSite.requiredPoePorts || 0) > 0;
        if (siteRequiresPoe) {
            const specs = eq.specs as LANSpecs;
            const s = specs as Record<string, unknown>;
            const poeBudget = specs.poeBudgetWatts || (s.poe_budget as number) || (s.poeBudget as number) || 0;
            return poeBudget > 0;
        }

        return true;
    });

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

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Manual LAN Switch Selection</h3>

                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 uppercase tracking-tight">Override PoE Enforce</div>
                        <div className="relative inline-flex items-center">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={overridePoeFilter}
                                onChange={(e) => setOverridePoeFilter(e.target.checked)}
                            />
                            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </div>
                    </label>
                </div>

                <div className="space-y-6">
                    {selections.map((sel, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 relative group">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Switch</label>
                                <select
                                    className="block w-full rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 text-sm"
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
        </div>
    );
}

