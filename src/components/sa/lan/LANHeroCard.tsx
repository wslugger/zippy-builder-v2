"use client";

import { useState, useMemo } from "react";
import { Equipment, BOMLineItem } from "@/src/lib/types";
import { getEquipmentRole } from "@/src/lib/bom-utils";
import { TraceabilityPopover } from "@/src/components/common/TraceabilityPopover";

interface Props {
    lanItem: BOMLineItem | undefined;
    catalog: Equipment[];
    resolvedVendor: string;
    /** Currently selected switches from manual selection state ({itemId, quantity}[]) */
    selections: Array<{ itemId: string; quantity: number }>;
    requiredLanPorts: number;
    onSwapModel: (itemId: string) => void;
    onQuantityChange: (quantity: number) => void;
    onViewSpecs: (eq: Equipment) => void;
    onClearManual: () => void;
    isManualSelection: boolean;
}

export function LANHeroCard({
    lanItem,
    catalog,
    resolvedVendor,
    selections,
    requiredLanPorts,
    onSwapModel,
    onQuantityChange,
    onViewSpecs,
    onClearManual,
    isManualSelection,
}: Props) {
    const [showSwap, setShowSwap] = useState(false);
    const [swapSearch, setSwapSearch] = useState("");

    const selectedEquip = lanItem ? catalog.find(e => e.id === lanItem.itemId) : undefined;

    const swapCandidates = useMemo(() => {
        return catalog
            .filter(e =>
                getEquipmentRole(e) === "LAN" &&
                e.vendor_id === resolvedVendor &&
                e.active !== false
            )
            .filter(e =>
                swapSearch === "" ||
                e.model.toLowerCase().includes(swapSearch.toLowerCase()) ||
                (e.family || "").toLowerCase().includes(swapSearch.toLowerCase())
            )
            .sort((a, b) => {
                const aP = (a.specs as Record<string, unknown>).accessPortCount as number || 0;
                const bP = (b.specs as Record<string, unknown>).accessPortCount as number || 0;
                return aP - bP;
            });
    }, [catalog, resolvedVendor, swapSearch]);

    // Group candidates by family
    const grouped = useMemo(() => {
        const groups: Record<string, Equipment[]> = {};
        for (const e of swapCandidates) {
            const family = e.family || "Other";
            if (!groups[family]) groups[family] = [];
            groups[family].push(e);
        }
        return groups;
    }, [swapCandidates]);

    if (!lanItem || !selectedEquip) {
        return (
            <div className="bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
                <div className="text-3xl mb-2">🔌</div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No Switch Resolved</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Select device types above or use &quot;Find Your Own&quot; to pick a switch.
                </p>
            </div>
        );
    }

    const specs = selectedEquip.specs as Record<string, unknown>;
    const accessPorts = (specs.accessPortCount as number) || 0;
    const uplinkCount = (specs.uplinkPortCount as number) || 0;
    const uplinkType = (specs.uplinkPortType as string) || "";
    const poeBudget = (specs.poeBudgetWatts as number) || (specs.poe_budget as number) || 0;
    const poeCapability = (specs.poe_capabilities as string) || "";
    const isStackable = specs.isStackable as boolean;

    const quantity = selections.length > 0 ? selections[0].quantity : (lanItem?.quantity ?? 1);
    const providedPorts = accessPorts * quantity;
    const portCoverage = requiredLanPorts > 0
        ? Math.round((providedPorts / requiredLanPorts) * 100)
        : 100;

    return (
        <div
            id="lan-hero-card"
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
        >
            {/* Header badge row */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    {isManualSelection ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                            👤 Manual Override
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                            ✨ Auto-Resolved
                        </span>
                    )}
                    {isStackable && (
                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold rounded-full">
                            Stackable
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {isManualSelection && (
                        <button
                            onClick={onClearManual}
                            className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider"
                        >
                            ✕ Clear Override
                        </button>
                    )}
                    <button
                        onClick={() => onViewSpecs(selectedEquip)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 uppercase tracking-wider transition-colors"
                    >
                        View Specs →
                    </button>
                </div>
            </div>

            {/* Main card body */}
            <div className="p-5 flex flex-col md:flex-row md:items-start gap-5">
                {/* Switch icon */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-2xl flex-shrink-0">
                    🔌
                </div>

                {/* Model info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                        <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
                            {selectedEquip.model}
                        </h4>
                        {lanItem.matchedRules && (
                            <TraceabilityPopover matchedRules={lanItem.matchedRules} reasoning={lanItem.reasoning} />
                        )}
                    </div>
                    {selectedEquip.family && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedEquip.family}</p>
                    )}

                    {/* Spec pills */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[11px] font-bold rounded-lg">
                            {accessPorts}x ports
                        </span>
                        {uplinkCount > 0 && uplinkType && (
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold rounded-lg">
                                {uplinkCount}x {uplinkType} uplinks
                            </span>
                        )}
                        {poeCapability && poeCapability !== "None" && (
                            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold rounded-lg">
                                ⚡ {poeCapability} {poeBudget > 0 ? `${poeBudget}W` : ""}
                            </span>
                        )}
                    </div>

                    {/* Port coverage mini-bar */}
                    {requiredLanPorts > 0 && (
                        <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span>Port coverage: {requiredLanPorts} req / {providedPorts} provided</span>
                                <span className={`font-bold ${portCoverage > 100 ? "text-red-500" : portCoverage >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
                                    {portCoverage}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${portCoverage > 100 ? "bg-red-400" : portCoverage >= 80 ? "bg-emerald-400" : "bg-amber-400"}`}
                                    style={{ width: `${Math.min(100, portCoverage)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Quantity + price + swap */}
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    {lanItem.pricing?.netPrice !== undefined && (
                        <div className="text-right">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">List Price</div>
                            <div className="text-lg font-black text-slate-900 dark:text-slate-100 tabular-nums">
                                ${lanItem.pricing.netPrice.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                                <span className="text-xs font-normal text-slate-400 ml-1">/unit</span>
                            </div>
                        </div>
                    )}

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Qty</span>
                        <button
                            id="lan-quantity-decrease"
                            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                        >
                            −
                        </button>
                        <span className="w-8 text-center text-lg font-black text-slate-900 dark:text-slate-100 tabular-nums">
                            {quantity}
                        </span>
                        <button
                            id="lan-quantity-increase"
                            onClick={() => onQuantityChange(quantity + 1)}
                            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                        >
                            +
                        </button>
                    </div>

                    {/* Swap model button */}
                    <button
                        id="lan-swap-model-btn"
                        onClick={() => { setShowSwap(v => !v); setSwapSearch(""); }}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Swap Model
                    </button>
                </div>
            </div>

            {/* Swap model panel (inline dropdown) */}
            {showSwap && (
                <div className="border-t border-slate-100 dark:border-slate-800 px-5 pb-4 pt-3">
                    <div className="mb-2">
                        <input
                            id="lan-swap-search-input"
                            type="text"
                            placeholder="Search model or family…"
                            value={swapSearch}
                            onChange={e => setSwapSearch(e.target.value)}
                            className="w-full max-w-sm text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-3">
                        {Object.entries(grouped).map(([family, items]) => (
                            <div key={family}>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{family}</p>
                                <div className="space-y-1">
                                    {items.map(e => {
                                        const s = e.specs as Record<string, unknown>;
                                        const p = (s.accessPortCount as number) || 0;
                                        const poe = (s.poe_capabilities as string) || "";
                                        const up = (s.uplinkPortCount as number) || 0;
                                        const ut = (s.uplinkPortType as string) || "";
                                        const isCurrent = e.id === selectedEquip.id;
                                        return (
                                            <button
                                                key={e.id}
                                                onClick={() => { onSwapModel(e.id); setShowSwap(false); }}
                                                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${isCurrent
                                                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                                    : "hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent"
                                                    }`}
                                            >
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{e.model}</span>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    {p}p {poe && poe !== "None" ? `· ${poe}` : ""} {up > 0 ? `· ${up}x ${ut}` : ""}
                                                    {isCurrent && " ← current"}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {swapCandidates.length === 0 && (
                            <p className="text-xs text-slate-400 italic py-2">No switches match your search.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
