"use client";

import { useEffect, useState, useCallback } from "react";
import { MetadataService } from "@/src/lib/firebase";
import { CatalogMetadata } from "@/src/lib/types";

export default function MetadataPage() {
    const [metadata, setMetadata] = useState<CatalogMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCatalog, setSelectedCatalog] = useState<CatalogMetadata | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showNewCatalogModal, setShowNewCatalogModal] = useState(false);
    const [newCatalogId, setNewCatalogId] = useState("");
    const [showNewFieldModal, setShowNewFieldModal] = useState(false);
    const [newFieldKey, setNewFieldKey] = useState("");

    const fetchMetadata = useCallback(async () => {
        setLoading(true);
        try {
            const data = await MetadataService.getAllCatalogMetadata();
            setMetadata(data);
            // Only auto-select if nothing is currently selected
            setSelectedCatalog(prev => {
                if (!prev && data.length > 0) return data[0];
                // If something was selected, try to find it in the new data to keep it in sync
                if (prev) {
                    return data.find(m => m.id === prev.id) || prev;
                }
                return prev;
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []); // Removed selectedCatalog from dependencies

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    const seedEquipmentDefaults = async () => {
        if (metadata.find(m => m.id === "equipment_catalog") && !confirm("Equipment metadata already exists. Overwrite with defaults?")) return;
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
                        values: ["Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"]
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
            alert("Equipment defaults seeded successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to seed equipment defaults.");
        } finally {
            setIsSaving(false);
        }
    };

    const seedServiceDefaults = async () => {
        if (metadata.find(m => m.id === "service_catalog") && !confirm("Service metadata already exists. Overwrite with defaults?")) return;
        setIsSaving(true);
        try {
            const defaultServiceMetadata: CatalogMetadata = {
                id: "service_catalog",
                fields: {
                    service_categories: {
                        label: "Service Categories",
                        values: ["Fiber", "Broadband", "Satellite", "Wireless", "Cybersecurity", "Managed Services"]
                    },
                    design_option_categories: {
                        label: "Design Option Categories",
                        values: ["Topology", "East-West Security", "Internet Breakout"]
                    }
                }
            };
            await MetadataService.saveCatalogMetadata(defaultServiceMetadata);
            await fetchMetadata();
            alert("Service defaults seeded successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to seed service defaults.");
        } finally {
            setIsSaving(false);
        }
    };

    const seedFeatureDefaults = async () => {
        if (metadata.find(m => m.id === "feature_catalog") && !confirm("Feature metadata already exists. Overwrite with defaults?")) return;
        setIsSaving(true);
        try {
            const defaultFeatureMetadata: CatalogMetadata = {
                id: "feature_catalog",
                fields: {
                    feature_categories: {
                        label: "Feature Categories",
                        values: [
                            "Routing",
                            "Security",
                            "Management",
                            "SD-WAN",
                            "High Availability",
                            "Cloud Integration",
                            "Monitoring",
                            "Performance",
                            "QoS"
                        ]
                    }
                }
            };
            await MetadataService.saveCatalogMetadata(defaultFeatureMetadata);
            await fetchMetadata();
            alert("Feature defaults seeded successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to seed feature defaults.");
        } finally {
            setIsSaving(false);
        }
    };

    const seedFullDatabase = async () => {
        if (!confirm("WARNING: This will overwrite ALL Services, Features, and Packages with the default seed data. This action cannot be undone. Are you sure?")) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/seed");
            const data = await res.json();
            if (data.success) {
                await fetchMetadata();
                alert(data.message);
            } else {
                throw new Error(data.error || "Unknown error occurred");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to seed full database: " + String(e));
        } finally {
            setIsSaving(false);
        }
    };

    const bootstrapDefaults = async () => {
        if (!confirm("This will read the hardcoded 'seed-data.ts' file and save it to the 'system_defaults' collection in the database. This is a one-time migration. Continue?")) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/bootstrap", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                await fetchMetadata();
                alert(data.message);
            } else {
                throw new Error(data.error || "Unknown error occurred");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to bootstrap defaults: " + String(e));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!selectedCatalog) return;
        setIsSaving(true);
        try {
            // Clean up the data before saving: trim whitespace and remove empty lines
            const cleanedCatalog: CatalogMetadata = {
                ...selectedCatalog,
                fields: Object.fromEntries(
                    Object.entries(selectedCatalog.fields).map(([k, f]) => [
                        k,
                        { ...f, values: f.values.map(v => v.trim()).filter(v => v !== "") }
                    ])
                )
            };

            await MetadataService.saveCatalogMetadata(cleanedCatalog);

            // Update local state with cleaned data
            setMetadata(metadata.map(m => m.id === selectedCatalog.id ? cleanedCatalog : m));
            setSelectedCatalog(cleanedCatalog);

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
        // Don't trim or filter yet, so the user can type spaces and newlines freely
        const values = valueString.split("\n");
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
                        onClick={seedServiceDefaults}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors shadow-sm"
                    >
                        Seed Service Catalog
                    </button>
                    <button
                        onClick={seedFeatureDefaults}
                        disabled={isSaving}
                        className="px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors shadow-sm"
                    >
                        Seed Feature Defaults
                    </button>
                    <button
                        onClick={seedEquipmentDefaults}
                        disabled={isSaving}
                        className="px-4 py-2 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors shadow-sm"
                    >
                        Seed Equipment Defaults
                    </button>
                    <button
                        onClick={seedFullDatabase}
                        disabled={isSaving}
                        className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors shadow-sm border border-red-200 dark:border-red-800"
                    >
                        Seed Full Database (Reset)
                    </button>
                    <button
                        onClick={bootstrapDefaults}
                        disabled={isSaving}
                        className="px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors shadow-sm border border-purple-200 dark:border-purple-800"
                    >
                        Ingest Code to DB Defaults
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
