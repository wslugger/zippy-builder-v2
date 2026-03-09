"use client";

import { useState, useEffect, useMemo } from "react";
import { Equipment, Site, BOMLineItem, SiteLANRequirements } from "@/src/lib/types";
import { normalizeServiceId, getSelectionKey, getEquipmentRole } from "@/src/lib/bom-utils";
import { TraceabilityPopover } from "@/src/components/common/TraceabilityPopover";
import { LANIntentCollector, IntentChipId } from "@/src/components/sa/lan/LANIntentCollector";
import { LANHeroCard } from "@/src/components/sa/lan/LANHeroCard";
import { LANValidationBar } from "@/src/components/sa/lan/LANValidationBar";
import { LANCatalogBrowser } from "@/src/components/sa/lan/LANCatalogBrowser";

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    return 1;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function LANTab({
    selectedSite,
    lanItems,
    manualSelections,
    setManualSelections,
    catalog,
    setSelectedSpecsItem,
    resolvedVendor,
    handleSiteUpdate,
}: LANTabProps) {
    const [showCatalog, setShowCatalog] = useState(false);
    const [intentChips, setIntentChips] = useState<IntentChipId[]>([]);
    const [animatePulse, setAnimatePulse] = useState(false);

    // Pulse BOM output when items change
    useEffect(() => {
        if (lanItems.length > 0) {
            setAnimatePulse(true);
            const t = setTimeout(() => setAnimatePulse(false), 700);
            return () => clearTimeout(t);
        }
    }, [lanItems.length, lanItems.map(i => i.itemId + i.quantity).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Manual selection state ────────────────────────────────────────────────
    const selectionKey = getSelectionKey(selectedSite.name, 'lan');
    const rawValue = manualSelections[selectionKey];

    const selections = useMemo<Array<{ itemId: string; quantity: number }>>(() => {
        if (!rawValue) return [];
        if (Array.isArray(rawValue)) {
            return rawValue.map(v =>
                typeof v === 'string' ? { itemId: v, quantity: 1 } : { itemId: v.itemId, quantity: v.quantity || 1 }
            );
        }
        if (typeof rawValue === 'string') return [{ itemId: rawValue, quantity: 1 }];
        if (typeof rawValue === 'object') return [{ itemId: rawValue.itemId, quantity: rawValue.quantity || 1 }];
        return [];
    }, [rawValue]);

    const isManualSelection = selections.length > 0;

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

    // ── Intent → Requirements ─────────────────────────────────────────────────
    const handleRequirementsChange = (req: SiteLANRequirements) => {
        // Only update if requirements actually changed (avoid infinite loops)
        const existing = selectedSite.lanRequirements;
        const changed =
            !existing ||
            existing.accessPortType !== req.accessPortType ||
            existing.uplinkPortType !== req.uplinkPortType ||
            existing.poeCapabilities !== req.poeCapabilities ||
            existing.isStackable !== req.isStackable ||
            existing.isRugged !== req.isRugged;

        if (changed) {
            handleSiteUpdate({ lanRequirements: req });
        }
    };

    // On first render, pre-select chips to match existing requirements (if any)
    useEffect(() => {
        if (intentChips.length > 0) return; // Don't override existing user selection
        const req = selectedSite.lanRequirements;
        if (!req) return;

        const inferred: IntentChipId[] = [];
        if (req.poeCapabilities === "PoE+") inferred.push("aps");
        if (req.poeCapabilities === "PoE++" || req.poeCapabilities === "UPOE") inferred.push("cameras");
        if (inferred.length === 0 && req.accessPortType) inferred.push("workstations");
        setIntentChips(inferred);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSite.name]);

    // ── Hero card actions ─────────────────────────────────────────────────────
    const handleSwapModel = (itemId: string) => {
        const currentQty = selections.length > 0 ? selections[0].quantity : (lanItems[0]?.quantity ?? 1);
        updateSelections([{ itemId, quantity: currentQty }]);
    };

    const handleQuantityChange = (quantity: number) => {
        if (selections.length > 0) {
            updateSelections([{ ...selections[0], quantity }]);
        } else if (lanItems.length > 0) {
            updateSelections([{ itemId: lanItems[0].itemId, quantity }]);
        }
    };

    const handleClearManual = () => updateSelections([]);

    // ── Validation metrics ───────────────────────────────────────────────────
    const { providedLanPorts, providedPoePorts, totalAccessGbps, totalUplinkGbps } = useMemo(() => {
        let lanP = 0, poeP = 0, accGbps = 0, upGbps = 0;

        lanItems.forEach(item => {
            const eq = catalog.find(e => e.id === item.itemId);
            if (eq && eq.specs) {
                const s = eq.specs as Record<string, unknown>;
                const accessPorts = (s.accessPortCount as number) || 0;
                lanP += accessPorts * item.quantity;

                const poeBudgetVal = (s.poeBudgetWatts as number) || (s.poe_budget as number) || (s.poeBudget as number) || 0;
                if (poeBudgetVal > 0) poeP += accessPorts * item.quantity;

                const accessSpeedGbps = getSpeedGbps(s.accessPortType as string);
                const uplinkSpeedGbps = getSpeedGbps(s.uplinkPortType as string);
                const uplinkPorts = (s.uplinkPortCount as number) || 0;

                accGbps += (accessPorts * accessSpeedGbps) * item.quantity;
                upGbps += (uplinkPorts * uplinkSpeedGbps) * item.quantity;
            }
        });
        return {
            providedLanPorts: lanP,
            providedPoePorts: poeP,
            totalAccessGbps: accGbps,
            totalUplinkGbps: upGbps
        };
    }, [lanItems, catalog]);

    const requiredLanPorts = selectedSite.lanPorts || 0;
    const requiredPoePorts = selectedSite.poePorts || selectedSite.requiredPoePorts || 0;

    // ── Primary BOM item to display in hero card ──────────────────────────────
    const heroItem = useMemo(() => {
        if (lanItems.length > 0) return lanItems[0];
        return undefined;
    }, [lanItems]);

    // Available LAN switches for catalog browser
    const availableSwitches = useMemo(() => {
        return catalog.filter(eq => getEquipmentRole(eq) === 'LAN' && eq.vendor_id === resolvedVendor);
    }, [catalog, resolvedVendor]);

    return (
        <div className="space-y-4">

            {/* ── Zone 1: Intent Collector (Wizard) ─────────────────────────── */}
            <LANIntentCollector
                site={selectedSite}
                onRequirementsChange={handleRequirementsChange}
                onOpenCatalog={() => setShowCatalog(true)}
                selectedChips={intentChips}
                onChipsChange={setIntentChips}
            />

            {/* ── Zone 2: Hero Recommendation Card ─────────────────────────── */}
            <LANHeroCard
                lanItem={heroItem}
                catalog={catalog}
                resolvedVendor={resolvedVendor}
                selections={selections}
                requiredLanPorts={requiredLanPorts}
                onSwapModel={handleSwapModel}
                onQuantityChange={handleQuantityChange}
                onViewSpecs={setSelectedSpecsItem}
                onClearManual={handleClearManual}
                isManualSelection={isManualSelection}
            />

            {/* ── Compact Validation Bar ────────────────────────────────────── */}
            <LANValidationBar
                requiredLanPorts={requiredLanPorts}
                providedLanPorts={providedLanPorts}
                requiredPoePorts={requiredPoePorts}
                providedPoePorts={providedPoePorts}
                totalAccessGbps={totalAccessGbps}
                totalUplinkGbps={totalUplinkGbps}
            />

            {/* ── Zone 3: Full BOM Output (equipment + licenses) ───────────── */}
            {lanItems.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                        Hardware BOM Output
                    </h3>
                    <div className="flex flex-col space-y-3">
                        {lanItems.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between p-4 border rounded-xl transition-all duration-300 ${animatePulse
                                        ? 'bg-blue-100/70 border-blue-400'
                                        : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg text-lg">🔌</div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                            {item.itemName}
                                            <TraceabilityPopover matchedRules={item.matchedRules} reasoning={item.reasoning} />
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${item.reasoning === 'Manual Selection'
                                                    ? 'bg-amber-100/70 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                    : 'bg-blue-100/60 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                }`}>
                                                {item.reasoning === 'Manual Selection' ? '👤 Manual' : '✨ Auto'}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    const eq = catalog.find(e => e.id === item.itemId);
                                                    if (eq) setSelectedSpecsItem(eq);
                                                }}
                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider flex items-center gap-0.5"
                                            >
                                                View Specs
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Qty</div>
                                    <div className="text-2xl font-black text-blue-600">{item.quantity}</div>
                                    {item.pricing?.netPrice !== undefined && (
                                        <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                                            ${item.pricing.netPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} /unit
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Option B: Catalog Browser slide-out panel ────────────────── */}
            {showCatalog && (
                <LANCatalogBrowser
                    catalog={availableSwitches}
                    resolvedVendor={resolvedVendor}
                    site={{ lanPorts: requiredLanPorts, poePorts: requiredPoePorts }}
                    selections={selections}
                    onSelectSwitch={updateSelections}
                    onDismiss={() => setShowCatalog(false)}
                />
            )}
        </div>
    );
}
