"use client";

import { DesignOption, DESIGN_OPTION_CATEGORIES as DEFAULT_CATEGORIES } from "@/src/lib/types";
import { useState } from "react";
import { useCatalogMetadata } from "@/src/hooks/useCatalogMetadata";
import { useTechnicalFeatures } from "@/src/hooks/useTechnicalFeatures";
import { InlineCopilotTrigger } from "@/src/components/common/InlineCopilotTrigger";
import { CopilotSuggestion } from "@/src/components/common/CopilotSuggestion";

interface ServiceItemFormProps {
    item: Partial<DesignOption>;
    onChange: (updates: Partial<DesignOption>) => void;
    title: string;
    showDesignFields?: boolean;
}

export default function ServiceItemForm({ item, onChange, title, showDesignFields }: ServiceItemFormProps) {
    const { metadata } = useCatalogMetadata("service_catalog");
    const { features } = useTechnicalFeatures();
    const categories: string[] = metadata?.fields?.design_option_categories?.values || [...DEFAULT_CATEGORIES];
    const [featureSearch, setFeatureSearch] = useState("");
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);

    const [descriptionSuggestion, setDescriptionSuggestion] = useState<string | null>(null);
    const [isLoadingDescriptionCopilot, setIsLoadingDescriptionCopilot] = useState(false);

    const handleAskDescriptionCopilot = async () => {
        setIsLoadingDescriptionCopilot(true);
        try {
            const res = await fetch("/api/copilot-suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contextType: "admin_service_description",
                    promptData: {
                        name: item.name,
                        shortDescription: item.short_description,
                        pros: item.pros,
                        cons: item.cons
                    }
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.suggestion) {
                    setDescriptionSuggestion(data.suggestion);
                }
            }
        } catch (error) {
            console.error("Failed to suggest description", error);
        } finally {
            setIsLoadingDescriptionCopilot(false);
        }
    };

    const [caveatsSuggestion, setCaveatsSuggestion] = useState<string | null>(null);
    const [isLoadingCaveatsCopilot, setIsLoadingCaveatsCopilot] = useState(false);

    const handleAskCaveatsCopilot = async () => {
        setIsLoadingCaveatsCopilot(true);
        try {
            const res = await fetch("/api/copilot-suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contextType: "admin_service_description",
                    promptData: {
                        name: item.name,
                        shortDescription: "Generate a list of caveats or limitations"
                    }
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.suggestion) setCaveatsSuggestion(data.suggestion);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingCaveatsCopilot(false);
        }
    };

    const [assumptionsSuggestion, setAssumptionsSuggestion] = useState<string | null>(null);
    const [isLoadingAssumptionsCopilot, setIsLoadingAssumptionsCopilot] = useState(false);

    const handleAskAssumptionsCopilot = async () => {
        setIsLoadingAssumptionsCopilot(true);
        try {
            const res = await fetch("/api/copilot-suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contextType: "admin_service_description",
                    promptData: {
                        name: item.name,
                        shortDescription: "Generate a list of assumptions"
                    }
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.suggestion) setAssumptionsSuggestion(data.suggestion);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingAssumptionsCopilot(false);
        }
    };

    const [prosSuggestion, setProsSuggestion] = useState<string | null>(null);
    const [isLoadingProsCopilot, setIsLoadingProsCopilot] = useState(false);

    const handleAskProsCopilot = async () => {
        setIsLoadingProsCopilot(true);
        try {
            const res = await fetch("/api/copilot-suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contextType: "admin_service_description",
                    promptData: { name: item.name, shortDescription: "Generate a list of pros or benefits" }
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.suggestion) setProsSuggestion(data.suggestion);
            }
        } catch (e) { console.error(e); } finally { setIsLoadingProsCopilot(false); }
    };

    const [consSuggestion, setConsSuggestion] = useState<string | null>(null);
    const [isLoadingConsCopilot, setIsLoadingConsCopilot] = useState(false);

    const handleAskConsCopilot = async () => {
        setIsLoadingConsCopilot(true);
        try {
            const res = await fetch("/api/copilot-suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contextType: "admin_service_description",
                    promptData: { name: item.name, shortDescription: "Generate a list of cons or downsides" }
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.suggestion) setConsSuggestion(data.suggestion);
            }
        } catch (e) { console.error(e); } finally { setIsLoadingConsCopilot(false); }
    };

    return (
        <div className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">{title}</h3>

            <div className="grid grid-cols-1 gap-6">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                    <input
                        type="text"
                        value={item.name || ""}
                        onChange={(e) => onChange({ name: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="e.g. Managed DIA"
                    />
                </div>

                {showDesignFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                            <div className="space-y-2">
                                <select
                                    value={categories.includes(item.category || "") ? item.category : "custom"}
                                    onChange={(e) => {
                                        if (e.target.value === "custom") {
                                            onChange({ category: "" }); // Clear to prompt typing, or keep? Better to clear or set default?
                                            // Actually, if switching to custom, maybe we keep current value if it's not in list?
                                            // Simpler: If "custom" selected, don't change value, just expose input.
                                            // But we need to distinguish "Custom" mode.
                                            // Let's force empty if they explicitly choose "Create New" or similar.
                                            // For now, let's just use the value directly if not 'custom'.
                                        } else {
                                            onChange({ category: e.target.value });
                                        }
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                >
                                    <option value="" disabled>Select Category...</option>
                                    {categories.map((cat: string) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    <option value="custom">＋ Create New Category...</option>
                                </select>

                                {(!item.category || !categories.includes(item.category) || item.category === "custom") && (
                                    <input
                                        type="text"
                                        value={item.category || ""}
                                        onChange={(e) => onChange({ category: e.target.value })}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all animate-in fade-in slide-in-from-top-1"
                                        placeholder="Enter new category name..."
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Decision Driver</label>
                            <input
                                type="text"
                                value={item.decision_driver || ""}
                                onChange={(e) => onChange({ decision_driver: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="What triggers the selection of this option?"
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Short Description</label>
                    <input
                        type="text"
                        value={item.short_description || ""}
                        onChange={(e) => onChange({ short_description: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="A brief summary of the service"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center">
                        Detailed Description
                        <InlineCopilotTrigger
                            onClick={handleAskDescriptionCopilot}
                            isLoading={isLoadingDescriptionCopilot}
                            title="Generate a professional description based on pros, cons, and short description"
                        />
                    </label>
                    <CopilotSuggestion
                        suggestion={descriptionSuggestion}
                        onAccept={() => {
                            onChange({ detailed_description: descriptionSuggestion || "" });
                            setDescriptionSuggestion(null);
                        }}
                        onReject={() => setDescriptionSuggestion(null)}
                    >
                        <textarea
                            value={item.detailed_description || ""}
                            onChange={(e) => {
                                onChange({ detailed_description: e.target.value });
                                setDescriptionSuggestion(null); // Clear suggestion on user edit
                            }}
                            rows={4}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            placeholder="Full details, specifications, and value proposition..."
                        />
                    </CopilotSuggestion>
                </div>

                {showDesignFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center">
                                Pros (one per line)
                                <InlineCopilotTrigger onClick={handleAskProsCopilot} isLoading={isLoadingProsCopilot} title="Generate pros" />
                            </label>
                            <CopilotSuggestion
                                suggestion={prosSuggestion}
                                onAccept={() => {
                                    onChange({ pros: prosSuggestion?.split("\n").filter((l: string) => l.trim() !== "") });
                                    setProsSuggestion(null);
                                }}
                                onReject={() => setProsSuggestion(null)}
                            >
                                <textarea
                                    value={item.pros?.join("\n") || ""}
                                    onChange={(e) => {
                                        onChange({ pros: e.target.value.split("\n").filter(l => l.trim() !== "") });
                                        setProsSuggestion(null);
                                    }}
                                    rows={4}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    placeholder="Key benefits..."
                                />
                            </CopilotSuggestion>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center">
                                Cons (one per line)
                                <InlineCopilotTrigger onClick={handleAskConsCopilot} isLoading={isLoadingConsCopilot} title="Generate cons" />
                            </label>
                            <CopilotSuggestion
                                suggestion={consSuggestion}
                                onAccept={() => {
                                    onChange({ cons: consSuggestion?.split("\n").filter((l: string) => l.trim() !== "") });
                                    setConsSuggestion(null);
                                }}
                                onReject={() => setConsSuggestion(null)}
                            >
                                <textarea
                                    value={item.cons?.join("\n") || ""}
                                    onChange={(e) => {
                                        onChange({ cons: e.target.value.split("\n").filter(l => l.trim() !== "") });
                                        setConsSuggestion(null);
                                    }}
                                    rows={4}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    placeholder="Downsides or trade-offs..."
                                />
                            </CopilotSuggestion>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-4">
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Supported Features</label>
                            {item.supported_features && item.supported_features.length > 0 && (
                                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {item.supported_features.length} Selected
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={showSelectedOnly}
                                    onChange={(e) => setShowSelectedOnly(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/10"
                                />
                                Show Selected Only
                            </label>
                            <input
                                type="text"
                                value={featureSearch}
                                onChange={(e) => setFeatureSearch(e.target.value)}
                                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none w-full sm:w-48 transition-all"
                                placeholder="Search features..."
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800 max-h-72 overflow-y-auto shadow-inner">
                        {features
                            .filter(f => {
                                const matchesSearch = f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
                                    f.category.toLowerCase().includes(featureSearch.toLowerCase());
                                const isSelected = item.supported_features?.includes(f.id) || false;

                                if (showSelectedOnly) return matchesSearch && isSelected;
                                return matchesSearch;
                            })
                            .sort((a, b) => {
                                const aSelected = item.supported_features?.includes(a.id) ? 1 : 0;
                                const bSelected = item.supported_features?.includes(b.id) ? 1 : 0;
                                // Sort selected to top, then by name
                                if (aSelected !== bSelected) return bSelected - aSelected;
                                return a.name.localeCompare(b.name);
                            })
                            .map((feature) => {
                                const isSelected = item.supported_features?.includes(feature.id) || false;
                                return (
                                    <label
                                        key={feature.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${isSelected
                                            ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/50 shadow-sm"
                                            : "bg-white dark:bg-zinc-900 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                const current = item.supported_features || [];
                                                const updated = e.target.checked
                                                    ? [...current, feature.id]
                                                    : current.filter((id) => id !== feature.id);
                                                onChange({ supported_features: updated });
                                            }}
                                            className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20"
                                        />
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 truncate">{feature.name}</div>
                                            <div className="text-xs text-zinc-500 font-medium">{feature.category}</div>
                                        </div>
                                    </label>
                                );
                            })}
                        {features.length > 0 && features.filter(f => {
                            const matchesSearch = f.name.toLowerCase().includes(featureSearch.toLowerCase()) || f.category.toLowerCase().includes(featureSearch.toLowerCase());
                            const isSelected = item.supported_features?.includes(f.id) || false;
                            if (showSelectedOnly) return matchesSearch && isSelected;
                            return matchesSearch;
                        }).length === 0 && (
                                <div className="col-span-full text-center text-sm text-zinc-400 py-10">
                                    {showSelectedOnly ? "No selected features match your search." : "No matching features found."}
                                </div>
                            )}
                        {features.length === 0 && (
                            <div className="col-span-full text-center text-sm text-zinc-400 py-10">
                                No features available in the catalog.
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center">
                            Caveats (one per line)
                            <InlineCopilotTrigger onClick={handleAskCaveatsCopilot} isLoading={isLoadingCaveatsCopilot} title="Generate caveats" />
                        </label>
                        <CopilotSuggestion
                            suggestion={caveatsSuggestion}
                            onAccept={() => {
                                onChange({ caveats: caveatsSuggestion?.split("\n").filter((l: string) => l.trim() !== "") });
                                setCaveatsSuggestion(null);
                            }}
                            onReject={() => setCaveatsSuggestion(null)}
                        >
                            <textarea
                                value={item.caveats?.join("\n") || ""}
                                onChange={(e) => {
                                    onChange({ caveats: e.target.value.split("\n").filter(l => l.trim() !== "") });
                                    setCaveatsSuggestion(null);
                                }}
                                rows={5}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="Constraints or limitations..."
                            />
                        </CopilotSuggestion>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center">
                            Assumptions (one per line)
                            <InlineCopilotTrigger onClick={handleAskAssumptionsCopilot} isLoading={isLoadingAssumptionsCopilot} title="Generate assumptions" />
                        </label>
                        <CopilotSuggestion
                            suggestion={assumptionsSuggestion}
                            onAccept={() => {
                                onChange({ assumptions: assumptionsSuggestion?.split("\n").filter((l: string) => l.trim() !== "") });
                                setAssumptionsSuggestion(null);
                            }}
                            onReject={() => setAssumptionsSuggestion(null)}
                        >
                            <textarea
                                value={item.assumptions?.join("\n") || ""}
                                onChange={(e) => {
                                    onChange({ assumptions: e.target.value.split("\n").filter(l => l.trim() !== "") });
                                    setAssumptionsSuggestion(null);
                                }}
                                rows={5}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="What is assumed to be true or provided..."
                            />
                        </CopilotSuggestion>
                    </div>
                </div>
            </div>
        </div>
    );
}
