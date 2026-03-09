"use client";

import { useState, useEffect } from "react";
import { Site, SiteLANRequirements, POE_CAPABILITIES } from "@/src/lib/types";

// ─── Intent → Requirements mapping ──────────────────────────────────────────

export type IntentChipId =
    | "workstations"
    | "phones"
    | "cameras"
    | "aps"
    | "printers";

interface ChipDef {
    id: IntentChipId;
    label: string;
    icon: string;
    description: string;
    poeLevel?: typeof POE_CAPABILITIES[number];
    poeNote?: string;
}

const INTENT_CHIPS: ChipDef[] = [
    {
        id: "workstations",
        label: "Workstations",
        icon: "🖥️",
        description: "Desktops, laptops",
        poeLevel: "None",
    },
    {
        id: "phones",
        label: "IP Phones",
        icon: "📞",
        description: "VoIP desk phones",
        poeLevel: "PoE",
    },
    {
        id: "cameras",
        label: "Cameras / IoT",
        icon: "📷",
        description: "IP cameras, sensors",
        poeLevel: "PoE+",
        poeNote: "802.3at required",
    },
    {
        id: "aps",
        label: "Wireless APs",
        icon: "📡",
        description: "Wi-Fi access points",
        poeLevel: "PoE+",
        poeNote: "Wi-Fi 6/6E may need UPOE",
    },
    {
        id: "printers",
        label: "Printers",
        icon: "🖨️",
        description: "Network printers / peripherals",
        poeLevel: "None",
    },
];

const POE_LEVEL_ORDER = POE_CAPABILITIES;

function resolveHighestPoe(
    chips: IntentChipId[],
    defs: ChipDef[]
): typeof POE_CAPABILITIES[number] {
    let best = 0;
    for (const id of chips) {
        const def = defs.find(d => d.id === id);
        if (!def?.poeLevel) continue;
        const idx = POE_LEVEL_ORDER.indexOf(def.poeLevel as typeof POE_CAPABILITIES[number]);
        if (idx > best) best = idx;
    }
    return POE_LEVEL_ORDER[best];
}

function deriveRequirements(
    selected: IntentChipId[],
    isStackable: boolean,
    isRugged: boolean,
    apWifiStandard: "Wi-Fi 5" | "Wi-Fi 6" | "Wi-Fi 6E" | "Wi-Fi 7",
    highSpeedWorkstations: "Standard (1G)" | "mGig (2.5G/5G)" | "10G"
): Omit<SiteLANRequirements, "needsManualReview"> {
    const poe = resolveHighestPoe(selected, INTENT_CHIPS);
    
    // speed inference logic
    let accessSpeed: "1G-Copper" | "mGig-Copper" | "10G-Copper" = "1G-Copper";
    
    const isApSelected = selected.includes("aps");
    const isWorkstationSelected = selected.includes("workstations");

    if (isApSelected && apWifiStandard === "Wi-Fi 7") {
        accessSpeed = "10G-Copper";
    } else if (isWorkstationSelected && highSpeedWorkstations === "10G") {
        accessSpeed = "10G-Copper";
    } else if (isApSelected && (apWifiStandard === "Wi-Fi 6" || apWifiStandard === "Wi-Fi 6E")) {
        accessSpeed = "mGig-Copper";
    } else if (isWorkstationSelected && highSpeedWorkstations === "mGig (2.5G/5G)") {
        accessSpeed = "mGig-Copper";
    }

    return {
        accessPortType: accessSpeed,
        uplinkPortType: "10G-Fiber",
        poeCapabilities: poe,
        isStackable,
        isRugged,
        apWifiStandard,
        highSpeedWorkstations
    };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
    site: Site;
    onRequirementsChange: (req: SiteLANRequirements) => void;
    onOpenCatalog: () => void;
    /** Which chips are currently selected (controlled by parent to persist across re-renders) */
    selectedChips: IntentChipId[];
    onChipsChange: (chips: IntentChipId[]) => void;
}

export function LANIntentCollector({
    site,
    onRequirementsChange,
    onOpenCatalog,
    selectedChips,
    onChipsChange,
}: Props) {
    const existing = site.lanRequirements;
    const [isStackable, setIsStackable] = useState(existing?.isStackable ?? false);
    const [isRugged, setIsRugged] = useState(existing?.isRugged ?? false);
    const [apWifiStandard, setApWifiStandard] = useState<"Wi-Fi 5" | "Wi-Fi 6" | "Wi-Fi 6E" | "Wi-Fi 7">(existing?.apWifiStandard ?? "Wi-Fi 6");
    const [highSpeedWorkstations, setHighSpeedWorkstations] = useState<"Standard (1G)" | "mGig (2.5G/5G)" | "10G">(existing?.highSpeedWorkstations ?? "Standard (1G)");

    // Emit derived requirements whenever selection changes
    useEffect(() => {
        const req = deriveRequirements(selectedChips, isStackable, isRugged, apWifiStandard, highSpeedWorkstations);
        onRequirementsChange({ ...req, needsManualReview: false });
    }, [selectedChips, isStackable, isRugged, apWifiStandard, highSpeedWorkstations]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleChip = (id: IntentChipId) => {
        const next = selectedChips.includes(id)
            ? selectedChips.filter(c => c !== id)
            : [...selectedChips, id];
        onChipsChange(next);
    };

    const resolvedPoe = resolveHighestPoe(selectedChips, INTENT_CHIPS);
    const needsPoe = resolvedPoe !== "None";

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        What connects here?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Select all device types at this site — we&apos;ll configure the switch requirements automatically.
                    </p>
                </div>
                <button
                    id="lan-find-your-own-btn"
                    onClick={onOpenCatalog}
                    className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Find Your Own
                </button>
            </div>

            {/* Intent Chips */}
            <div className="flex flex-wrap gap-3 mb-5">
                {INTENT_CHIPS.map(chip => {
                    const active = selectedChips.includes(chip.id);
                    return (
                        <button
                            key={chip.id}
                            id={`lan-intent-chip-${chip.id}`}
                            onClick={() => toggleChip(chip.id)}
                            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${active
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                        >
                            <span className="text-base">{chip.icon}</span>
                            <div className="text-left">
                                <div>{chip.label}</div>
                                <div className={`text-[10px] font-normal ${active ? "text-blue-600 dark:text-blue-300" : "text-slate-400 dark:text-slate-500"}`}>
                                    {chip.description}
                                </div>
                            </div>
                            {active && (
                                <svg className="w-4 h-4 text-blue-500 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Sub-intent questions */}
            {(selectedChips.includes("aps") || selectedChips.includes("workstations")) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dotted border-slate-300 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-300">
                    {selectedChips.includes("aps") && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                📡 WiFi Standard / Requirements
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"].map((std) => (
                                    <button
                                        key={std}
                                        onClick={() => setApWifiStandard(std as any)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${apWifiStandard === std
                                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                            }`}
                                    >
                                        {std}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-slate-400">
                                {apWifiStandard.includes("Wi-Fi 6") || apWifiStandard === "Wi-Fi 7"
                                    ? "✨ Suggests mGig or 10G ports."
                                    : "Standard 1G capability recommended."}
                            </p>
                        </div>
                    )}

                    {selectedChips.includes("workstations") && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                🖥️ Workstation Speed Needs
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {["Standard (1G)", "mGig (2.5G/5G)", "10G"].map((speed) => (
                                    <button
                                        key={speed}
                                        onClick={() => setHighSpeedWorkstations(speed as any)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${highSpeedWorkstations === speed
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                            }`}
                                    >
                                        {speed}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-slate-400">
                                Select higher speeds for NAS users or power workstations.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Constraint toggles + inferred config preview */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Toggles */}
                <div className="flex gap-3 flex-1">
                    <label className={`flex items-center gap-2.5 cursor-pointer flex-1 px-3 py-2.5 rounded-lg border transition-all ${isStackable
                        ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300"
                        }`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isStackable ? "border-indigo-500 bg-indigo-500" : "border-slate-300 dark:border-slate-600"
                            }`}>
                            {isStackable && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                        <input
                            id="lan-stackable-toggle"
                            type="checkbox"
                            className="sr-only"
                            checked={isStackable}
                            onChange={e => setIsStackable(e.target.checked)}
                        />
                        <div>
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Stackable</div>
                            <div className="text-[10px] text-slate-400">Redundancy / port density</div>
                        </div>
                    </label>

                    <label className={`flex items-center gap-2.5 cursor-pointer flex-1 px-3 py-2.5 rounded-lg border transition-all ${isRugged
                        ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300"
                        }`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isRugged ? "border-amber-500 bg-amber-500" : "border-slate-300 dark:border-slate-600"
                            }`}>
                            {isRugged && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                        <input
                            id="lan-rugged-toggle"
                            type="checkbox"
                            className="sr-only"
                            checked={isRugged}
                            onChange={e => setIsRugged(e.target.checked)}
                        />
                        <div>
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Rugged / Industrial</div>
                            <div className="text-[10px] text-slate-400">Warehouse, outdoor cabinet</div>
                        </div>
                    </label>
                </div>

                {/* Inferred config pill */}
                {selectedChips.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Inferred:</span>
                        <span className={`font-mono ${deriveRequirements(selectedChips, isStackable, isRugged, apWifiStandard, highSpeedWorkstations).accessPortType !== '1G-Copper' ? "text-blue-600 dark:text-blue-400 font-bold" : ""}`}>
                            {deriveRequirements(selectedChips, isStackable, isRugged, apWifiStandard, highSpeedWorkstations).accessPortType} access
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="font-mono">10G-Fiber uplinks</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className={`font-mono font-bold ${needsPoe ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                            {resolvedPoe}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
