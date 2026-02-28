import { Site, BOMLineItem } from "@/src/lib/bom-types";
import { Equipment, LANSpecs } from "@/src/lib/types";
import { TraceabilityPopover } from "@/src/components/common/TraceabilityPopover";
import { useState, useEffect } from "react";

interface LANTabProps {
    selectedSite: Site;
    lanItem?: BOMLineItem;
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
    lanItem,
    manualSelections,
    setManualSelections,
    catalog,
    setSelectedSpecsItem,
    resolvedVendor
}: LANTabProps) {
    const [animatePulse, setAnimatePulse] = useState(false);

    useEffect(() => {
        if (lanItem?.itemId) {
            const initialTimer = setTimeout(() => {
                setAnimatePulse(true);
            }, 0);
            const resetTimer = setTimeout(() => setAnimatePulse(false), 700);
            return () => {
                clearTimeout(initialTimer);
                clearTimeout(resetTimer);
            };
        }
    }, [lanItem?.itemId, lanItem?.quantity]);

    const availableSwitches = catalog.filter(eq => {
        if (eq.role !== 'LAN' || eq.vendor_id !== resolvedVendor) return false;

        // If site requires PoE, only show PoE-capable switches
        const siteRequiresPoe = (selectedSite.poePorts || 0) > 0 || (selectedSite.requiredPoePorts || 0) > 0;
        if (siteRequiresPoe) {
            const specs = eq.specs as LANSpecs;
            // Use a fallback-safe check that avoids explicit 'any' for additional fields
            const s = specs as Record<string, unknown>;
            const poeBudget = specs.poeBudgetWatts || (s.poe_budget as number) || (s.poeBudget as number) || 0;
            return poeBudget > 0;
        }

        return true;
    });

    const selectionKey = `${selectedSite.name}:managed_lan`;
    const selectedOverride = manualSelections[selectionKey];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overrideObj = selectedOverride as any;
    const selectedId = typeof selectedOverride === 'object' && selectedOverride !== null ? overrideObj.itemId : selectedOverride;
    const selectedQty = typeof selectedOverride === 'object' && selectedOverride !== null ? overrideObj.quantity : 1;

    const handleAlternativeChange = (newEquipmentId: string) => {
        setManualSelections(prev => {
            const next = { ...prev };
            if (newEquipmentId) {
                next[selectionKey] = { itemId: newEquipmentId, quantity: 1 };
            } else {
                delete next[selectionKey];
            }
            return next;
        });
    };

    const handleQuantityChange = (qtyStr: string) => {
        const parsedQty = parseInt(qtyStr, 10);
        if (isNaN(parsedQty) || parsedQty < 1) return;

        if (selectedId) {
            setManualSelections(prev => ({
                ...prev,
                [selectionKey]: { itemId: selectedId, quantity: parsedQty }
            }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Manual LAN Switch Selection</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Select Switch</label>
                        <select
                            className="block w-full max-w-xl rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 sm:text-sm"
                            value={selectedId || ""}
                            onChange={(e) => handleAlternativeChange(e.target.value)}
                        >
                            <option value="">{`-- Select a Switch --`}</option>
                            {availableSwitches.map((eq) => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const s = eq.specs as any;
                                const ports = s.accessPortCount ? `${s.accessPortCount}x` : '';
                                const ethType = s.accessPortType ? s.accessPortType : '';
                                const uplinks = s.uplinkPortType ? `${s.uplinkPortCount || 0}x ${s.uplinkPortType} Uplinks` : '';
                                const poeBudgetVal = s.poeBudgetWatts || s.poe_budget || s.poeBudget || 0;
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
                            })}
                        </select>
                    </div>

                    {selectedId && (
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Quantity</label>
                            <input
                                type="number"
                                min="1"
                                className="block w-32 rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 sm:text-sm"
                                value={selectedQty}
                                onChange={(e) => handleQuantityChange(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Generated BOM for LAN */}
            {lanItem && (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Hardware BOM Output</h3>
                    <div className="flex flex-col space-y-4">
                        <div className={`transition-all duration-300 flex items-center justify-between p-4 border rounded-lg ${animatePulse ? 'bg-blue-100/70 border-blue-400' : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40'}`}>
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg">🔌</div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center">
                                        {lanItem.itemName}
                                        <TraceabilityPopover matchedRules={lanItem.matchedRules} reasoning={lanItem.reasoning} />
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-col space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100/50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                💡 System Resolved
                                            </span>
                                            <span>{lanItem.reasoning}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const eq = catalog.find(e => e.id === lanItem.itemId);
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
                                <div className="text-xs text-slate-500 uppercase">Quantity</div>
                                <div className="text-2xl font-black text-blue-600">{lanItem.quantity}</div>
                                {lanItem.pricing?.netPrice !== undefined && (
                                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                                        ${lanItem.pricing.netPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} /unit
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
