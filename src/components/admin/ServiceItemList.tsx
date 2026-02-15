"use client";

import { ServiceItem, DesignOption } from "@/src/lib/types";
import { useState } from "react";
import ServiceItemForm from "./ServiceItemForm";

interface ServiceItemListProps {
    items: DesignOption[];
    onUpdate: (items: DesignOption[]) => void;
    title: string;
    itemTypeLabel: string;
    showDesignFields?: boolean;
}

export default function ServiceItemList({ items, onUpdate, title, itemTypeLabel, showDesignFields }: ServiceItemListProps) {
    const [editingId, setEditingId] = useState<string | null>(null);

    const addItem = (category?: string) => {
        const newItem: DesignOption = {
            id: crypto.randomUUID(),
            name: `${itemTypeLabel} Name`,
            short_description: "",
            detailed_description: "",
            caveats: [],
            assumptions: [],
            decision_driver: "",
            category: category || "",
            pros: [],
            cons: []
        };
        onUpdate([...items, newItem]);
        setEditingId(newItem.id);
    };

    const removeItem = (id: string) => {
        if (!confirm(`Delete this ${itemTypeLabel}?`)) return;
        onUpdate(items.filter(i => i.id !== id));
        if (editingId === id) setEditingId(null);
    };

    const updateItem = (id: string, updates: Partial<DesignOption>) => {
        onUpdate(items.map(i => i.id === id ? { ...i, ...updates } : i));
    };

    // Group items by category if showDesignFields is true
    const groupedItems: Record<string, DesignOption[]> = {};
    if (showDesignFields) {
        items.forEach(item => {
            const cat = item.category || "Uncategorized";
            if (!groupedItems[cat]) groupedItems[cat] = [];
            groupedItems[cat].push(item);
        });
    }

    const renderItem = (item: DesignOption, index: number) => (
        <div key={item.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                    className="flex-1 text-left font-medium text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 transition-colors"
                >
                    {item.name || `Unnamed ${itemTypeLabel}`}
                    {editingId !== item.id && item.short_description && (
                        <span className="ml-3 font-normal text-zinc-500 text-xs hidden sm:inline">— {item.short_description}</span>
                    )}
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                        className="p-1 px-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                    >
                        {editingId === item.id ? "Collapse" : "Edit"}
                    </button>
                    <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 px-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {editingId === item.id && (
                <div className="p-4 bg-white dark:bg-zinc-900">
                    <ServiceItemForm
                        item={item}
                        onChange={(updates) => updateItem(item.id, updates)}
                        title={`Configure ${itemTypeLabel}`}
                        showDesignFields={showDesignFields}
                    />
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                {!showDesignFields && (
                    <button
                        onClick={() => addItem()}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        + Add {itemTypeLabel}
                    </button>
                )}
            </div>

            <div className="space-y-8">
                {items.length === 0 ? (
                    <div className="py-10 text-center bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <p className="text-sm text-zinc-500">No {itemTypeLabel.toLowerCase()}s added yet.</p>
                        {showDesignFields && (
                            <button
                                onClick={() => addItem()}
                                className="mt-4 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                + Add First Design Option
                            </button>
                        )}
                    </div>
                ) : showDesignFields ? (
                    Object.entries(groupedItems).map(([category, catItems]) => (
                        <div key={category} className="space-y-3">
                            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-1 px-1">
                                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{category}</h4>
                                <button
                                    onClick={() => addItem(category === "Uncategorized" ? "" : category)}
                                    className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    + Add to {category}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {catItems.map((item, idx) => renderItem(item, idx))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {items.map((item, index) => renderItem(item, index))}
                    </div>
                )}
            </div>

            {showDesignFields && items.length > 0 && (
                <div className="pt-4 flex justify-center">
                    <button
                        onClick={() => addItem()}
                        className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors shadow-sm"
                    >
                        + Add Design Option to New Category
                    </button>
                </div>
            )}
        </div>
    );
}
