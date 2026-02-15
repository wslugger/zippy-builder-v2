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
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const addItem = () => {
        const newItem: DesignOption = {
            id: crypto.randomUUID(),
            name: `${itemTypeLabel} Name`,
            short_description: "",
            detailed_description: "",
            caveats: [],
            assumptions: [],
            decision_driver: "",
            pros: [],
            cons: []
        };
        onUpdate([...items, newItem]);
        setEditingIndex(items.length);
    };

    const removeItem = (index: number) => {
        if (!confirm(`Delete this ${itemTypeLabel}?`)) return;
        const newItems = [...items];
        newItems.splice(index, 1);
        onUpdate(newItems);
        if (editingIndex === index) setEditingIndex(null);
    };

    const updateItem = (index: number, updates: Partial<DesignOption>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updates };
        onUpdate(newItems);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                <button
                    onClick={addItem}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                    + Add {itemTypeLabel}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {items.length === 0 ? (
                    <div className="py-10 text-center bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <p className="text-sm text-zinc-500">No {itemTypeLabel.toLowerCase()}s added yet.</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div key={item.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800">
                                <button
                                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                                    className="flex-1 text-left font-medium text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 transition-colors"
                                >
                                    {item.name || `Unnamed ${itemTypeLabel}`}
                                    {editingIndex !== index && item.short_description && (
                                        <span className="ml-3 font-normal text-zinc-500 text-xs hidden sm:inline">— {item.short_description}</span>
                                    )}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                                        className="p-1 px-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                                    >
                                        {editingIndex === index ? "Collapse" : "Edit"}
                                    </button>
                                    <button
                                        onClick={() => removeItem(index)}
                                        className="p-1 px-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>

                            {editingIndex === index && (
                                <div className="p-4 bg-white dark:bg-zinc-900">
                                    <ServiceItemForm
                                        item={item}
                                        onChange={(updates) => updateItem(index, updates)}
                                        title={`Configure ${itemTypeLabel}`}
                                        showDesignFields={showDesignFields}
                                    />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
