"use client";

import { useState, useMemo } from "react";
import { Equipment } from "@/src/lib/types";
import { getEquipmentRole, extractLANTaxonomy } from "@/src/lib/bom-utils";

// ─── Filter chips config ──────────────────────────────────────────────────────

type FilterKey = "portCount" | "poe" | "uplink" | "stackable";

interface ActiveFilters {
    portCount: string | null;
    poe: string | null;
    uplink: string | null;
    stackable: boolean;
}

// ─── Switch card ──────────────────────────────────────────────────────────────

interface SwitchCardProps {
    equip: Equipment;
    site: { lanPorts: number; poePorts: number };
    onAdd: (id: string, qty: number) => void;
    isSelected: boolean;
    selectedQty: number;
}

function SwitchCard({ equip, site, onAdd, isSelected, selectedQty }: SwitchCardProps) {
    const [localQty, setLocalQty] = useState(Math.max(1, selectedQty));
    const specs = equip.specs as Record<string, unknown>;
    const accessPorts = (specs.accessPortCount as number) || 0;
    const uplinkType = (specs.uplinkPortType as string) || "";
    const uplinkCount = (specs.uplinkPortCount as number) || 0;
    const poeBudget = (specs.poeBudgetWatts as number) || (specs.poe_budget as number) || 0;
    const poeCapability = (specs.poe_capabilities as string) || "";
    const isStackable = specs.isStackable as boolean;
    const isRugged = specs.isRugged as boolean;

    // Port fit indicator
    const requiredPorts = site.lanPorts || 0;
    const portFit = requiredPorts === 0
        ? "neutral"
        : accessPorts >= requiredPorts
            ? "ok"
            : accessPorts >= requiredPorts * 0.7
                ? "warn"
                : "low";

    const portFitColor: Record<string, string> = {
        ok: "bg-emerald-100 dark:bg-emerald-900/30",
        warn: "bg-amber-100 dark:bg-amber-900/30",
        low: "bg-red-100 dark:bg-red-900/30",
        neutral: "bg-slate-100 dark:bg-slate-800",
    };

    // PoE budget bar (% of required)
    const requiredPoe = site.poePorts || 0;
    const poeCoverage = requiredPoe > 0 && poeBudget > 0
        ? Math.min(100, Math.round((poeBudget / (requiredPoe * 15)) * 100)) // ~15W/port estimate
        : poeBudget > 0 ? 100 : 0;

    return (
        <div
            id={`lan-catalog-card-${equip.id}`}
            className={`relative rounded-xl border-2 transition-all duration-200 flex flex-col ${isSelected
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 shadow-md shadow-blue-200 dark:shadow-blue-900/30"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm"
                }`}
        >
            {isSelected && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            <div className="p-3 flex-1">
                {/* Icon + model */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">{equip.model}</div>
                        {equip.family && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{equip.family}</div>
                        )}
                    </div>
                    {/* Port count badge */}
                    <div className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-black text-slate-700 dark:text-slate-200 ${portFitColor[portFit]}`}>
                        {accessPorts}p
                    </div>
                </div>

                {/* Spec pills */}
                <div className="flex flex-wrap gap-1 mb-2.5">
                    {poeCapability && poeCapability !== "None" && (
                        <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded">
                            ⚡ {poeCapability}
                        </span>
                    )}
                    {uplinkCount > 0 && uplinkType && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded">
                            {uplinkCount}x {uplinkType}
                        </span>
                    )}
                    {isStackable && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded">
                            Stack
                        </span>
                    )}
                    {isRugged && (
                        <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded">
                            🏭 Rugged
                        </span>
                    )}
                </div>

                {/* PoE budget bar */}
                {poeBudget > 0 && (
                    <div className="mb-2">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>PoE Budget</span>
                            <span className="font-bold">{poeBudget}W</span>
                        </div>
                        <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${poeCoverage >= 80 ? "bg-emerald-400" : poeCoverage >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${poeCoverage}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Add Controls */}
            <div className="px-3 pb-3 flex items-center gap-2">
                <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setLocalQty(q => Math.max(1, q - 1))}
                        className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-bold"
                    >−</button>
                    <span className="px-1.5 text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[1.5rem] text-center tabular-nums">
                        {localQty}
                    </span>
                    <button
                        onClick={() => setLocalQty(q => q + 1)}
                        className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-bold"
                    >+</button>
                </div>
                <button
                    id={`lan-catalog-add-${equip.id}`}
                    onClick={() => onAdd(equip.id, localQty)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${isSelected
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 text-white dark:text-slate-900"
                        }`}
                >
                    {isSelected ? "✓ Update" : "+ Add"}
                </button>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    catalog: Equipment[];
    resolvedVendor: string;
    site: { lanPorts: number; poePorts: number };
    selections: Array<{ itemId: string; quantity: number }>;
    onSelectSwitch: (selections: Array<{ itemId: string; quantity: number }>) => void;
    onDismiss: () => void;
}

export function LANCatalogBrowser({
    catalog,
    resolvedVendor,
    site,
    selections,
    onSelectSwitch,
    onDismiss,
}: Props) {
    const [filters, setFilters] = useState<ActiveFilters>({
        portCount: null,
        poe: null,
        uplink: null,
        stackable: false,
    });

    const taxonomy = useMemo(() => extractLANTaxonomy(catalog), [catalog]);

    const lanSwitches = useMemo(() => {
        return catalog.filter(
            e => getEquipmentRole(e) === "LAN" &&
                e.vendor_id === resolvedVendor &&
                e.active !== false
        );
    }, [catalog, resolvedVendor]);

    // Derive port count buckets from actual catalog
    const portBuckets = useMemo(() => {
        const counts = new Set<number>();
        lanSwitches.forEach(e => {
            const p = (e.specs as Record<string, unknown>).accessPortCount as number;
            if (p) counts.add(p);
        });
        return [...counts].sort((a, b) => a - b).map(n => ({ label: `${n}-Port`, value: String(n) }));
    }, [lanSwitches]);

    const filtered = useMemo(() => {
        return lanSwitches.filter(e => {
            const s = e.specs as Record<string, unknown>;
            if (filters.portCount !== null) {
                if (String((s.accessPortCount as number) || 0) !== filters.portCount) return false;
            }
            if (filters.poe !== null) {
                if ((s.poe_capabilities as string) !== filters.poe) return false;
            }
            if (filters.uplink !== null) {
                if ((s.uplinkPortType as string) !== filters.uplink) return false;
            }
            if (filters.stackable) {
                if (!s.isStackable) return false;
            }
            return true;
        }).sort((a, b) => {
            const ap = (a.specs as Record<string, unknown>).accessPortCount as number || 0;
            const bp = (b.specs as Record<string, unknown>).accessPortCount as number || 0;
            return ap - bp;
        });
    }, [lanSwitches, filters]);

    const setFilter = <K extends FilterKey>(key: K, value: ActiveFilters[K] | null) => {
        setFilters(prev => ({
            ...prev,
            [key]: prev[key] === value ? null : value,
        }));
    };

    const handleAdd = (itemId: string, quantity: number) => {
        const existing = selections.find(s => s.itemId === itemId);
        if (existing) {
            // Update existing
            onSelectSwitch(selections.map(s => s.itemId === itemId ? { ...s, quantity } : s));
        } else {
            onSelectSwitch([...selections, { itemId, quantity }]);
        }
    };

    const handleRemove = (itemId: string) => {
        onSelectSwitch(selections.filter(s => s.itemId !== itemId));
    };

    const selectedCount = selections.length;
    const totalPorts = selections.reduce((acc, sel) => {
        const e = catalog.find(eq => eq.id === sel.itemId);
        const ports = (e?.specs as Record<string, unknown>)?.accessPortCount as number || 0;
        return acc + ports * sel.quantity;
    }, 0);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                onClick={onDismiss}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                id="lan-catalog-browser-panel"
                role="dialog"
                aria-modal="true"
                aria-label="LAN Switch Catalog"
                className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right-4 duration-200"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Switch Catalog</h2>
                        <button
                            onClick={onDismiss}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Browse and pick switches manually. Add multiple to build a multi-stack design.
                    </p>
                </div>

                {/* Filters */}
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <div className="flex flex-wrap gap-1.5">
                        {portBuckets.map(b => (
                            <button
                                key={b.value}
                                onClick={() => setFilter("portCount", b.value)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${filters.portCount === b.value
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300"
                                    }`}
                            >
                                {b.label}
                            </button>
                        ))}
                        {taxonomy.poeCapabilities.filter(p => p !== "None").map(p => (
                            <button
                                key={p}
                                onClick={() => setFilter("poe", p)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${filters.poe === p
                                        ? "bg-amber-500 border-amber-500 text-white"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-300"
                                    }`}
                            >
                                ⚡ {p}
                            </button>
                        ))}
                        {taxonomy.uplinkPortTypes.slice(0, 4).map(u => (
                            <button
                                key={u}
                                onClick={() => setFilter("uplink", u)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${filters.uplink === u
                                        ? "bg-slate-700 border-slate-700 text-white"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                                    }`}
                            >
                                {u}
                            </button>
                        ))}
                        <button
                            onClick={() => setFilter("stackable", !filters.stackable || null)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${filters.stackable
                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                                }`}
                        >
                            Stackable
                        </button>
                        {(filters.portCount || filters.poe || filters.uplink || filters.stackable) && (
                            <button
                                onClick={() => setFilters({ portCount: null, poe: null, uplink: null, stackable: false })}
                                className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-all"
                            >
                                ✕ Clear filters
                            </button>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">{filtered.length} switches shown</p>
                </div>

                {/* Switch grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filtered.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-sm text-slate-500 italic">No switches match the active filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {filtered.map(e => {
                                const sel = selections.find(s => s.itemId === e.id);
                                return (
                                    <SwitchCard
                                        key={e.id}
                                        equip={e}
                                        site={site}
                                        onAdd={handleAdd}
                                        isSelected={!!sel}
                                        selectedQty={sel?.quantity ?? 1}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer — selection summary */}
                <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    {selectedCount > 0 ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {selectedCount} model{selectedCount > 1 ? "s" : ""} selected · {totalPorts} total ports
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {selections.map(sel => {
                                        const e = catalog.find(eq => eq.id === sel.itemId);
                                        return e ? (
                                            <span key={sel.itemId} className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] rounded-full text-slate-600 dark:text-slate-300">
                                                {sel.quantity}x {e.model}
                                                <button
                                                    onClick={() => handleRemove(sel.itemId)}
                                                    className="text-slate-400 hover:text-red-500 ml-0.5 transition-colors"
                                                >✕</button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                            <button
                                id="lan-catalog-apply-btn"
                                onClick={onDismiss}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
                            >
                                Apply →
                            </button>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 italic text-center">
                            No switches selected. Add one or more from the grid above.
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
