"use client";

import { useState, useMemo } from "react";
import { Site, SiteLANRequirements } from "@/src/lib/types";
import { Equipment } from "@/src/lib/types";
import { extractLANTaxonomy } from "@/src/lib/bom-utils";
import { useCatalogMetadata } from "@/src/hooks";

interface GuidedLANReviewProps {
    site: Site;
    catalog: Equipment[];
    onConfirm: (requirements: SiteLANRequirements) => void;
    onDismiss: () => void;
}

const FIELD_LABEL: Record<string, string> = {
    accessPortType: "Access Port Type",
    uplinkPortType: "Uplink Port Type",
    poeCapabilities: "PoE Capabilities",
};

/**
 * Slide-out panel shown for sites where lanRequirements.needsManualReview === true.
 * Dropdowns are data-driven from extractLANTaxonomy; no hardcoded option lists.
 */
export function GuidedLANReview({ site, catalog, onConfirm, onDismiss }: GuidedLANReviewProps) {
    const existing = site.lanRequirements;
    const { metadata } = useCatalogMetadata();

    const [draft, setDraft] = useState<Omit<SiteLANRequirements, "needsManualReview">>({
        accessPortType: existing?.accessPortType ?? "",
        uplinkPortType: existing?.uplinkPortType ?? "",
        poeCapabilities: existing?.poeCapabilities ?? "",
        isStackable: existing?.isStackable ?? false,
        isRugged: existing?.isRugged ?? false,
        totalPoeBudgetWatts: existing?.totalPoeBudgetWatts ?? undefined,
    });

    const taxonomy = useMemo(() => extractLANTaxonomy(catalog), [catalog]);

    const poeOptions = useMemo(() => {
        return metadata.poeCapabilities || taxonomy.poeCapabilities;
    }, [metadata.poeCapabilities, taxonomy.poeCapabilities]);

    const isEmpty = (val: string | undefined) => !val || val === "";

    const hasUnresolved =
        isEmpty(draft.accessPortType) ||
        isEmpty(draft.uplinkPortType) ||
        isEmpty(draft.poeCapabilities);

    const handleConfirm = () => {
        onConfirm({
            ...draft,
            needsManualReview: false,
        });
    };

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
                role="dialog"
                aria-modal="true"
                aria-label="LAN Requirements Review"
                className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right-4 duration-200"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/20">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl">🔍</span>
                        <h2 className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight">
                            LAN Requirements Review
                        </h2>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium pl-9">
                        This site is too complex for auto-defaults. Confirm the LAN topology requirements to enable BOM generation.
                    </p>
                </div>

                {/* Site context */}
                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span><strong className="text-slate-900 dark:text-slate-100">{site.userCount}</strong> Users</span>
                        <span><strong className="text-slate-900 dark:text-slate-100">{site.lanPorts}</strong> LAN Ports</span>
                        <span><strong className="text-slate-900 dark:text-slate-100">{site.poePorts}</strong> PoE Ports</span>
                        <span><strong className="text-slate-900 dark:text-slate-100">{site.indoorAPs}</strong> Indoor APs</span>
                    </div>
                </div>

                {/* Form body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                    {/* Access Port Type */}
                    <div>
                        <label
                            htmlFor="guided-access-port-type"
                            className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"
                        >
                            {FIELD_LABEL.accessPortType}
                        </label>
                        <select
                            id="guided-access-port-type"
                            value={draft.accessPortType ?? ""}
                            onChange={e => setDraft(prev => ({ ...prev, accessPortType: e.target.value }))}
                            className={`block w-full rounded-lg border text-sm py-2.5 px-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 transition-all ${isEmpty(draft.accessPortType)
                                ? "border-amber-400 ring-2 ring-amber-400/30 bg-amber-50 dark:bg-amber-900/20"
                                : "border-slate-200 dark:border-slate-700"
                                }`}
                        >
                            <option value="">Select access port type…</option>
                            {taxonomy.accessPortTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        {isEmpty(draft.accessPortType) && (
                            <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                ⚠️ Required to generate BOM
                            </p>
                        )}
                    </div>

                    {/* Uplink Port Type */}
                    <div>
                        <label
                            htmlFor="guided-uplink-port-type"
                            className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"
                        >
                            {FIELD_LABEL.uplinkPortType}
                        </label>
                        <select
                            id="guided-uplink-port-type"
                            value={draft.uplinkPortType ?? ""}
                            onChange={e => setDraft(prev => ({ ...prev, uplinkPortType: e.target.value }))}
                            className={`block w-full rounded-lg border text-sm py-2.5 px-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 transition-all ${isEmpty(draft.uplinkPortType)
                                ? "border-amber-400 ring-2 ring-amber-400/30 bg-amber-50 dark:bg-amber-900/20"
                                : "border-slate-200 dark:border-slate-700"
                                }`}
                        >
                            <option value="">Select uplink port type…</option>
                            {taxonomy.uplinkPortTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        {isEmpty(draft.uplinkPortType) && (
                            <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                ⚠️ Required to generate BOM
                            </p>
                        )}
                    </div>

                    {/* PoE Capabilities */}
                    <div>
                        <label
                            htmlFor="guided-poe-capabilities"
                            className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"
                        >
                            {FIELD_LABEL.poeCapabilities}
                        </label>
                        <select
                            id="guided-poe-capabilities"
                            value={draft.poeCapabilities ?? ""}
                            onChange={e => setDraft(prev => ({ ...prev, poeCapabilities: e.target.value }))}
                            className={`block w-full rounded-lg border text-sm py-2.5 px-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 transition-all ${isEmpty(draft.poeCapabilities)
                                ? "border-amber-400 ring-2 ring-amber-400/30 bg-amber-50 dark:bg-amber-900/20"
                                : "border-slate-200 dark:border-slate-700"
                                }`}
                        >
                            <option value="">Select PoE capability…</option>
                            {poeOptions.map((t: string) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        {isEmpty(draft.poeCapabilities) && (
                            <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                ⚠️ Required to generate BOM
                            </p>
                        )}
                    </div>

                    {/* Divider */}
                    <hr className="border-slate-100 dark:border-slate-800" />

                    {/* Boolean flags */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Additional Constraints</p>

                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all">
                            <input
                                type="checkbox"
                                id="guided-stackable"
                                checked={draft.isStackable ?? false}
                                onChange={e => setDraft(prev => ({ ...prev, isStackable: e.target.checked }))}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Stackable Required</span>
                                <p className="text-[10px] text-slate-400 mt-0.5">Site needs switch stacking for redundancy or port density</p>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all">
                            <input
                                type="checkbox"
                                id="guided-rugged"
                                checked={draft.isRugged ?? false}
                                onChange={e => setDraft(prev => ({ ...prev, isRugged: e.target.checked }))}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Rugged / Industrial Grade</span>
                                <p className="text-[10px] text-slate-400 mt-0.5">Warehouse, outdoor cabinet, or harsh environment deployment</p>
                            </div>
                        </label>
                    </div>

                    {/* Optional PoE budget override */}
                    <div>
                        <label
                            htmlFor="guided-poe-budget"
                            className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"
                        >
                            Minimum PoE Budget Override (W) <span className="text-slate-400 font-normal normal-case">Optional</span>
                        </label>
                        <div className="relative">
                            <input
                                id="guided-poe-budget"
                                type="number"
                                min={0}
                                placeholder="e.g. 740"
                                value={draft.totalPoeBudgetWatts ?? ""}
                                onChange={e => setDraft(prev => ({
                                    ...prev,
                                    totalPoeBudgetWatts: e.target.value ? parseInt(e.target.value) : undefined
                                }))}
                                className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm py-2.5 pl-3 pr-10 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">W</span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">
                            Leave blank to auto-calculate from PoE devices. Set a value to enforce a hard floor.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                    <button
                        onClick={onDismiss}
                        className="flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={hasUnresolved}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
                        title={hasUnresolved ? "Fill all required fields to continue" : undefined}
                    >
                        {hasUnresolved ? "⚠️ Fill All Fields" : "✓ Confirm & Recalculate"}
                    </button>
                </div>
            </div>
        </>
    );
}
