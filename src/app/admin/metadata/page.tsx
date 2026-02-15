"use client";

import { useEffect, useState } from "react";
import { MetadataService } from "@/src/lib/firebase";
import { CatalogMetadata, CatalogField } from "@/src/lib/types";

export default function MetadataPage() {
    const [metadata, setMetadata] = useState<CatalogMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCatalog, setSelectedCatalog] = useState<CatalogMetadata | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showNewCatalogModal, setShowNewCatalogModal] = useState(false);
    const [newCatalogId, setNewCatalogId] = useState("");
    const [showNewFieldModal, setShowNewFieldModal] = useState(false);
    const [newFieldKey, setNewFieldKey] = useState("");

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        setLoading(true);
        try {
            const data = await MetadataService.getAllCatalogMetadata();
            setMetadata(data);
            if (data.length > 0 && !selectedCatalog) {
                setSelectedCatalog(data[0]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const seedDefaults = async () => {
        setIsSaving(true);
        try {
            const defaultEqMetadata: CatalogMetadata = {
                id: "equipment_catalog",
                fields: {
                    purposes: {
                        label: "Equipment Purposes",
                        values: ["SDWAN", "LAN", "WLAN"]
                    },
                    cellular_types: {
                        label: "Cellular Generations",
                        values: ["LTE", "5G", "LTE/5G"]
                    },
                    wifi_standards: {
                        label: "Wi-Fi Standards",
                        values: ["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"]
                    },
                    statuses: {
                        label: "Support Statuses",
                        values: ["Supported", "In development", "Not supported"]
                    },
                    interface_types: {
                        label: "Interface Types",
                        values: ["1GE RJ45", "10GE SFP+", "1GE RJ45/SFP Combo", "10GbE SFP+", "GE RJ45", "GE SFP", "10GE RJ45"]
                    },
                    mounting_options: {
                        label: "Mounting Options",
                        values: ["Rack", "Wall", "DIN Rail", "Desktop"]
                    },
                    power_connector_types: {
                        label: "Power Connector Types",
                        values: ["C13", "External Adapter", "Hardwired"]
                    },
                    recommended_use_cases: {
                        label: "Recommended Use Cases",
                        values: ["Small Branch", "Medium Branch", "Large Branch", "Hub", "Data Center", "Home Office"]
                    }
                }
            };
            await MetadataService.saveCatalogMetadata(defaultEqMetadata);
            await fetchMetadata();
            alert("Default metadata seeded successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to seed defaults.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!selectedCatalog) return;
        setIsSaving(true);
        try {
            await MetadataService.saveCatalogMetadata(selectedCatalog);
            setMetadata(metadata.map(m => m.id === selectedCatalog.id ? selectedCatalog : m));
            alert("Metadata saved successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to save metadata.");
        } finally {
            setIsSaving(false);
        }
    };

    const updateFieldValues = (fieldKey: string, valueString: string) => {
        if (!selectedCatalog) return;
        const values = valueString.split("\n").map(v => v.trim()).filter(v => v !== "");
        setSelectedCatalog({
            ...selectedCatalog,
            fields: {
                ...selectedCatalog.fields,
                [fieldKey]: {
                    ...selectedCatalog.fields[fieldKey],
                    values
                }
            }
        });
    };

    const updateFieldLabel = (fieldKey: string, label: string) => {
        if (!selectedCatalog) return;
        setSelectedCatalog({
            ...selectedCatalog,
            fields: {
                ...selectedCatalog.fields,
                [fieldKey]: {
                    ...selectedCatalog.fields[fieldKey],
                    label
                }
            }
        });
    };

    const addField = () => {
        if (!newFieldKey) return;
        setSelectedCatalog({
            ...selectedCatalog!,
            fields: {
                ...selectedCatalog!.fields,
                [newFieldKey]: {
                    label: newFieldKey.charAt(0).toUpperCase() + newFieldKey.slice(1).replace(/_/g, " "),
                    values: []
                }
            }
        });
        setNewFieldKey("");
        setShowNewFieldModal(false);
    };

    const removeField = (key: string) => {
        if (!selectedCatalog || !confirm(`Remove field "${key}"?`)) return;
        const newFields = { ...selectedCatalog.fields };
        delete newFields[key];
        setSelectedCatalog({
            ...selectedCatalog,
            fields: newFields
        });
    };

    const createNewCatalog = () => {
        if (!newCatalogId) return;
        const newCatalog: CatalogMetadata = {
            id: newCatalogId,
            fields: {}
        };
        setMetadata([...metadata, newCatalog]);
        setSelectedCatalog(newCatalog);
        setNewCatalogId("");
        setShowNewCatalogModal(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Catalog Metadata</h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">Manage dynamic dropdowns and field options across your catalogs.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={seedDefaults}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors shadow-sm"
                    >
                        Seed Equipment Defaults
                    </button>
                    <button
                        onClick={() => setShowNewCatalogModal(true)}
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm"
                    >
                        + New Catalog
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Catalog Sidebar */}
                <div className="md:col-span-1 space-y-2">
                    <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-4">Catalogs</h2>
                    {metadata.length === 0 ? (
                        <p className="text-sm text-zinc-500 px-2">No catalogs defined.</p>
                    ) : (
                        metadata.map((catalog) => (
                            <button
                                key={catalog.id}
                                onClick={() => setSelectedCatalog(catalog)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedCatalog?.id === catalog.id
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                                    }`}
                            >
                                {catalog.id}
                            </button>
                        ))
                    )}
                </div>

                {/* Fields Editor */}
                <div className="md:col-span-3">
                    {selectedCatalog ? (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedCatalog.id} Fields</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowNewFieldModal(true)}
                                        className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    >
                                        + Add Field
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                        {isSaving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-8">
                                {Object.keys(selectedCatalog.fields).length === 0 ? (
                                    <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                                        <p className="text-sm text-zinc-500">No fields defined for this catalog.</p>
                                        <button onClick={() => setShowNewFieldModal(true)} className="mt-4 text-blue-600 text-sm font-medium hover:underline">+ Add your first field</button>
                                    </div>
                                ) : (
                                    Object.entries(selectedCatalog.fields).map(([key, field]) => (
                                        <div key={key} className="group relative bg-zinc-50/30 dark:bg-zinc-950/30 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                            <button
                                                onClick={() => removeField(key)}
                                                className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                title="Delete Field"
                                            >
                                                ✕
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Field ID</label>
                                                        <code className="text-xs text-blue-600 dark:text-blue-400 font-mono">{key}</code>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Display Label</label>
                                                        <input
                                                            type="text"
                                                            value={field.label}
                                                            onChange={(e) => updateFieldLabel(key, e.target.value)}
                                                            className="w-full text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Options (One per line)</label>
                                                    <textarea
                                                        rows={6}
                                                        value={field.values.join("\n")}
                                                        onChange={(e) => updateFieldValues(key, e.target.value)}
                                                        className="w-full text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                                        placeholder="Enter options..."
                                                    />
                                                    <p className="mt-1 text-[10px] text-zinc-500">These will populate dropdowns and multi-select lists in the app.</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-zinc-50 dark:bg-zinc-950 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center min-h-[600px]">
                            <p className="text-zinc-500">Select or create a catalog to manage its metadata.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* New Catalog Modal */}
            {showNewCatalogModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className="font-semibold">New Catalog</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Catalog ID</label>
                                <input
                                    type="text"
                                    value={newCatalogId}
                                    onChange={(e) => setNewCatalogId(e.target.value)}
                                    placeholder="e.g. equipment_catalog"
                                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowNewCatalogModal(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 font-medium">Cancel</button>
                                <button
                                    onClick={createNewCatalog}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
                                >
                                    Create Catalog
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* New Field Modal */}
            {showNewFieldModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className="font-semibold">New Field</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Field ID (Key)</label>
                                <input
                                    type="text"
                                    value={newFieldKey}
                                    onChange={(e) => setNewFieldKey(e.target.value)}
                                    placeholder="e.g. equipment_purposes"
                                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowNewFieldModal(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 font-medium">Cancel</button>
                                <button
                                    onClick={addField}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
                                >
                                    Add Field
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
