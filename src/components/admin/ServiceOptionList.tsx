"use client";

import { ServiceOption, DesignOption } from "@/src/lib/types";
import { useState } from "react";
import ServiceItemForm from "./ServiceItemForm";
import ServiceItemList from "./ServiceItemList";

interface ServiceOptionListProps {
    items: ServiceOption[];
    onUpdate: (items: ServiceOption[]) => void;
}

export default function ServiceOptionList({ items, onUpdate }: ServiceOptionListProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const addItem = () => {
        const newItem: ServiceOption = {
            id: crypto.randomUUID(),
            name: "New Service Option",
            short_description: "",
            detailed_description: "",
            caveats: [],
            assumptions: [],
            design_options: [] // Initialize empty design options
        };
        onUpdate([...items, newItem]);
        setEditingIndex(items.length);
    };

    const removeItem = (index: number) => {
        if (!confirm("Delete this Service Option?")) return;
        const newItems = [...items];
        newItems.splice(index, 1);
        onUpdate(newItems);
        if (editingIndex === index) setEditingIndex(null);
    };

    const updateItem = (index: number, updates: Partial<ServiceOption>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updates };
        onUpdate(newItems);
    };

    const updateDesignOptions = (index: number, designOptions: DesignOption[]) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], design_options: designOptions };
        onUpdate(newItems);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Service Options</h3>
                <button
                    onClick={addItem}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                    + Add Service Option
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {items.length === 0 ? (
                    <div className="py-10 text-center bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <p className="text-sm text-zinc-500">No Service Options added yet.</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div key={item.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800">
                                <button
                                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                                    className="flex-1 text-left font-medium text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 transition-colors"
                                >
                                    {item.name || "Unnamed Service Option"}
                                    {editingIndex !== index && item.short_description && (
                                        <span className="ml-3 font-normal text-zinc-500 text-xs hidden sm:inline">— {item.short_description}</span>
                                    )}
                                    <span className="ml-2 text-xs text-zinc-400">({item.design_options?.length || 0} Design Options)</span>
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
                                <div className="p-4 bg-white dark:bg-zinc-900 space-y-6">
                                    <ServiceItemForm
                                        item={item}
                                        onChange={(updates) => updateItem(index, updates)}
                                        title="Configure Service Option"
                                    />

                                    <div className="pl-4 border-l-2 border-zinc-100 dark:border-zinc-800">
                                        <ServiceItemList
                                            items={item.design_options || []}
                                            onUpdate={(options) => updateDesignOptions(index, options)}
                                            title="Nested Design Options"
                                            itemTypeLabel="Design Option"
                                            showDesignFields={true}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
