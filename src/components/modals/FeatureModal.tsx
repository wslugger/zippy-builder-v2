"use client";

import { useState, useMemo } from "react";
import { TechnicalFeature, EQUIPMENT_STATUSES } from "@/src/lib/types";
import { useCatalogMetadata } from "@/src/hooks/useCatalogMetadata";
import { InlineCopilotTrigger } from "@/src/components/common/InlineCopilotTrigger";
import { CopilotSuggestion } from "@/src/components/common/CopilotSuggestion";

interface FeatureModalProps {
    feature: TechnicalFeature | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (feature: TechnicalFeature) => Promise<void>;
}

export default function FeatureModal({ feature, isOpen, onClose, onSave }: FeatureModalProps) {
    const [formData, setFormData] = useState<Partial<TechnicalFeature>>(
        feature || {
            id: "",
            name: "",
            category: "Routing",
            status: "Supported",
            description: "",
            caveats: [],
            assumptions: []
        }
    );
    const [saving, setSaving] = useState(false);
    const { metadata: featureMetadata, loading: metadataLoading } = useCatalogMetadata("feature_catalog");

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
                        name: formData.name,
                        shortDescription: `Category: ${formData.category}`
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
                        name: formData.name,
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
                        name: formData.name,
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

    const categories = useMemo(() => {
        return featureMetadata?.fields?.feature_categories?.values || [];
    }, [featureMetadata]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // If new feature, generate ID if not present
            const finalId = formData.id || formData.name?.toLowerCase().replace(/[^a-z0-9]/g, "_") || "";
            await onSave({ ...formData, id: finalId } as TechnicalFeature);
            onClose();
        } catch (error) {
            console.error("Failed to save feature:", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                        {feature ? "Edit Feature" : "Create New Feature"}
                    </h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="e.g. BGP Routing"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                            {metadataLoading ? (
                                <div className="animate-pulse h-9 bg-zinc-100 dark:bg-zinc-800 rounded-lg"></div>
                            ) : categories.length > 0 ? (
                                <select
                                    required
                                    value={formData.category || ""}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                                >
                                    <option value="" disabled>Select a category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    required
                                    value={formData.category || ""}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    placeholder="e.g. Routing"
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
                            <select
                                required
                                value={formData.status || "Supported"}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof EQUIPMENT_STATUSES[number] })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                            >
                                {EQUIPMENT_STATUSES.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center">
                            Description
                            <InlineCopilotTrigger
                                onClick={handleAskDescriptionCopilot}
                                isLoading={isLoadingDescriptionCopilot}
                                title="Generate description based on name and category"
                            />
                        </label>
                        <CopilotSuggestion
                            suggestion={descriptionSuggestion}
                            onAccept={() => {
                                setFormData({ ...formData, description: descriptionSuggestion || "" });
                                setDescriptionSuggestion(null);
                            }}
                            onReject={() => setDescriptionSuggestion(null)}
                        >
                            <textarea
                                required
                                rows={3}
                                value={formData.description || ""}
                                onChange={(e) => {
                                    setFormData({ ...formData, description: e.target.value });
                                    setDescriptionSuggestion(null);
                                }}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="Detailed explanation of the capability..."
                            />
                        </CopilotSuggestion>
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
                                    setFormData({ ...formData, caveats: caveatsSuggestion?.split("\n").filter((l: string) => l.trim() !== "") });
                                    setCaveatsSuggestion(null);
                                }}
                                onReject={() => setCaveatsSuggestion(null)}
                            >
                                <textarea
                                    rows={4}
                                    value={formData.caveats?.join("\n") || ""}
                                    onChange={(e) => {
                                        setFormData({ ...formData, caveats: e.target.value.split("\n").filter(l => l.trim()) });
                                        setCaveatsSuggestion(null);
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    placeholder="Limitations or constraints..."
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
                                    setFormData({ ...formData, assumptions: assumptionsSuggestion?.split("\n").filter((l: string) => l.trim() !== "") });
                                    setAssumptionsSuggestion(null);
                                }}
                                onReject={() => setAssumptionsSuggestion(null)}
                            >
                                <textarea
                                    rows={4}
                                    value={formData.assumptions?.join("\n") || ""}
                                    onChange={(e) => {
                                        setFormData({ ...formData, assumptions: e.target.value.split("\n").filter(l => l.trim()) });
                                        setAssumptionsSuggestion(null);
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    placeholder="What needs to be true for this to work..."
                                />
                            </CopilotSuggestion>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-950/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/20"
                    >
                        {saving ? "Saving..." : "Save Feature"}
                    </button>
                </div>
            </div>
        </div>
    );
}
