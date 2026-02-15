"use client";

import { ServiceItem, DesignOption, DESIGN_OPTION_CATEGORIES } from "@/src/lib/types";

interface ServiceItemFormProps {
    item: Partial<DesignOption>;
    onChange: (updates: Partial<DesignOption>) => void;
    title: string;
    showDesignFields?: boolean;
}

export default function ServiceItemForm({ item, onChange, title, showDesignFields }: ServiceItemFormProps) {
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
                            <input
                                type="text"
                                list="design-option-categories"
                                value={item.category || ""}
                                onChange={(e) => onChange({ category: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="e.g. Topology"
                            />
                            <datalist id="design-option-categories">
                                {DESIGN_OPTION_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat} />
                                ))}
                            </datalist>
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
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Detailed Description</label>
                    <textarea
                        value={item.detailed_description || ""}
                        onChange={(e) => onChange({ detailed_description: e.target.value })}
                        rows={4}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="Full details, specifications, and value proposition..."
                    />
                </div>

                {showDesignFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Pros (one per line)</label>
                            <textarea
                                value={item.pros?.join("\n") || ""}
                                onChange={(e) => onChange({ pros: e.target.value.split("\n").filter(l => l.trim() !== "") })}
                                rows={4}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="Key benefits..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cons (one per line)</label>
                            <textarea
                                value={item.cons?.join("\n") || ""}
                                onChange={(e) => onChange({ cons: e.target.value.split("\n").filter(l => l.trim() !== "") })}
                                rows={4}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="Downsides or trade-offs..."
                            />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Caveats (one per line)</label>
                        <textarea
                            value={item.caveats?.join("\n") || ""}
                            onChange={(e) => onChange({ caveats: e.target.value.split("\n").filter(l => l.trim() !== "") })}
                            rows={5}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            placeholder="Constraints or limitations..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Assumptions (one per line)</label>
                        <textarea
                            value={item.assumptions?.join("\n") || ""}
                            onChange={(e) => onChange({ assumptions: e.target.value.split("\n").filter(l => l.trim() !== "") })}
                            rows={5}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            placeholder="What is assumed to be true or provided..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
