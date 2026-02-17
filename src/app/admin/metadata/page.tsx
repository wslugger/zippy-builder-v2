"use client";

import { useEffect, useState, useCallback } from "react";
import { MetadataService, SystemDefaultsService } from "@/src/lib/firebase";
import { CatalogMetadata, WorkflowStep } from "@/src/lib/types";
import { DEFAULT_WORKFLOW_STEPS } from "@/src/lib/workflow-defaults";

export default function MetadataPage() {
    const [metadata, setMetadata] = useState<CatalogMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCatalog, setSelectedCatalog] = useState<CatalogMetadata | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showNewCatalogModal, setShowNewCatalogModal] = useState(false);
    const [newCatalogId, setNewCatalogId] = useState("");
    const [showNewFieldModal, setShowNewFieldModal] = useState(false);
    const [newFieldKey, setNewFieldKey] = useState("");

    // Workflow Tab State
    const [activeTab, setActiveTab] = useState<'catalogs' | 'workflow'>('catalogs');
    const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
    const [originalWorkflowSteps, setOriginalWorkflowSteps] = useState<WorkflowStep[]>([]);

    const fetchMetadata = useCallback(async () => {
        setLoading(true);
        try {
            const [catalogData, stepsData] = await Promise.all([
                MetadataService.getAllCatalogMetadata(),
                SystemDefaultsService.getWorkflowSteps()
            ]);

            setMetadata(catalogData);
            setWorkflowSteps(stepsData || []);
            setOriginalWorkflowSteps(stepsData || []);

            // Only auto-select if nothing is currently selected
            setSelectedCatalog(prev => {
                if (!prev && catalogData.length > 0) return catalogData[0];
                if (prev) {
                    return catalogData.find(m => m.id === prev.id) || prev;
                }
                return prev;
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    const seedEquipmentDefaults = async () => {
        if (metadata.find(m => m.id === "equipment_catalog") && !confirm("Equipment metadata already exists. Overwrite with defaults?")) return;
        setIsSaving(true);
        try {
            const defaultEqMetadata: CatalogMetadata = {
                id: "equipment_catalog",
                name: "Equipment Catalog",
                description: "Hardware specifications for SD-WAN, LAN, and WLAN devices.",
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
                name: "Service Catalog",
                description: "Connectivity and service options including Fiber, Broadband, and Satellite.",
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
                name: "Feature Catalog",
                description: "Technical features and capabilities like Routing, Security, and SD-WAN.",
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


    const seedSiteTypeDefaults = async () => {
        if (metadata.find(m => m.id === "site_type_catalog") && !confirm("Site definition metadata already exists. Overwrite with defaults?")) return;
        setIsSaving(true);
        try {
            const defaultSiteMetadata: CatalogMetadata = {
                id: "site_type_catalog",
                name: "Site Definition Catalog",
                description: "Classifications, redundancy models, and technical constraints for site definitions.",
                fields: {
                    cpe_redundancy_types: {
                        label: "CPE Redundancy Types",
                        values: ["Single CPE", "Dual CPE (HA)", "Cluster"]
                    },
                    circuit_redundancy_types: {
                        label: "Circuit Redundancy Types",
                        values: ["Single Circuit", "Dual Circuit", "Hybrid (MPLS + Internet)", "Dual Internet", "LTE Backup"]
                    },
                    technical_constraint_types: {
                        label: "Technical Constraint Types",
                        values: ["Power", "Cooling", "Space", "Cabling", "Mounting", "Bandwidth", "Latency", "Jitter"]
                    },
                    slo_targets: {
                        label: "SLO Targets (%)",
                        values: ["99.999", "99.99", "99.9", "99.5", "99.0"]
                    }
                }
            };
            await MetadataService.saveCatalogMetadata(defaultSiteMetadata);
            await fetchMetadata();
            alert("Site Definition defaults seeded successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to seed site definition defaults.");
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
        if (!confirm("This will take a snapshot of your current database (Services, Features, Packages, Metadata) and save it as the system defaults. 'Seed Full Database' will restore from this snapshot. Continue?")) return;
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

    const seedWorkflowDefaults = async () => {
        if (workflowSteps.length > 0 && !confirm("Overwrite current workflow steps with defaults?")) return;
        setWorkflowSteps(DEFAULT_WORKFLOW_STEPS);
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

    const updateCatalogDetails = (field: 'name' | 'description', value: string) => {
        if (!selectedCatalog) return;
        setSelectedCatalog({
            ...selectedCatalog,
            [field]: value
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

    // Workflow Logic
    const handleSaveWorkflow = async () => {
        setIsSaving(true);
        try {
            await SystemDefaultsService.saveWorkflowSteps(workflowSteps);
            setOriginalWorkflowSteps(workflowSteps);
            alert("Workflow steps saved successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to save workflow steps.");
        } finally {
            setIsSaving(false);
        }
    };

    const addWorkflowStep = () => {
        const newId = `step_${workflowSteps.length + 1}`;
        setWorkflowSteps([...workflowSteps, { id: newId, label: "New Step", path: newId }]);
    };

    const updateWorkflowStep = (index: number, field: keyof WorkflowStep, value: string) => {
        const newSteps = [...workflowSteps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setWorkflowSteps(newSteps);
    };

    const removeWorkflowStep = (index: number) => {
        if (!confirm("Remove this step?")) return;
        const newSteps = workflowSteps.filter((_, i) => i !== index);
        setWorkflowSteps(newSteps);
    };

    const moveWorkflowStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === workflowSteps.length - 1) return;

        const newSteps = [...workflowSteps];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]];
        setWorkflowSteps(newSteps);
    };

    const createNewCatalog = () => {
        if (!newCatalogId) return;
        const newCatalog: CatalogMetadata = {
            id: newCatalogId,
            name: newCatalogId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description: "",
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
                    <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">Manage catalog metadata and project workflow steps.</p>
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
                        onClick={seedSiteTypeDefaults}
                        disabled={isSaving}
                        className="px-4 py-2 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors shadow-sm"
                    >
                        Seed Site Type Defaults
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
                        Set Defaults
                    </button>
                    <button
                        onClick={() => setShowNewCatalogModal(true)}
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm"
                    >
                        + New Catalog
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 mb-8">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('catalogs')}
                        className={`${activeTab === 'catalogs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Catalogs
                    </button>
                    <button
                        onClick={() => setActiveTab('workflow')}
                        className={`${activeTab === 'workflow' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Workflow Steps
                    </button>
                </nav>
            </div>

            {activeTab === 'catalogs' && (
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
                                    {catalog.name || catalog.id}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Fields Editor */}
                    <div className="md:col-span-3">
                        {selectedCatalog ? (
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                                    <div>
                                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedCatalog.name || selectedCatalog.id}</h3>
                                        {selectedCatalog.id !== selectedCatalog.name && (
                                            <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedCatalog.id}</p>
                                        )}
                                    </div>
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
                                    {/* Catalog Details */}
                                    <div className="bg-zinc-50/50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Catalog Name</label>
                                            <input
                                                type="text"
                                                value={selectedCatalog.name || ""}
                                                onChange={(e) => updateCatalogDetails('name', e.target.value)}
                                                className="w-full text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                placeholder="Human readable name"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Description</label>
                                            <input
                                                type="text"
                                                value={selectedCatalog.description || ""}
                                                onChange={(e) => updateCatalogDetails('description', e.target.value)}
                                                className="w-full text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                placeholder="Brief description of this catalog"
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Fields Configuration</h4>
                                        {Object.keys(selectedCatalog.fields).length === 0 ? (
                                            <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                                                <p className="text-sm text-zinc-500">No fields defined for this catalog.</p>
                                                <button onClick={() => setShowNewFieldModal(true)} className="mt-4 text-blue-600 text-sm font-medium hover:underline">+ Add your first field</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {Object.entries(selectedCatalog.fields).map(([key, field]) => (
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
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-zinc-50 dark:bg-zinc-950 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center min-h-[600px]">
                                <p className="text-zinc-500">Select or create a catalog to manage its metadata.</p>
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {
                activeTab === 'workflow' && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Project Workflow Steps</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={seedWorkflowDefaults}
                                    className="px-4 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-medium transition-colors"
                                >
                                    Load Defaults
                                </button>
                                <button
                                    onClick={handleSaveWorkflow}
                                    disabled={isSaving}
                                    className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {workflowSteps.length === 0 ? (
                                <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                                    <p className="text-sm text-zinc-500">No workflow steps defined.</p>
                                    <button onClick={addWorkflowStep} className="mt-4 text-blue-600 text-sm font-medium hover:underline">+ Add first step</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-zinc-400 uppercase tracking-widest px-4">
                                        <div className="col-span-1">Order</div>
                                        <div className="col-span-3">Step ID</div>
                                        <div className="col-span-4">Display Label</div>
                                        <div className="col-span-3">URL Path Part</div>
                                        <div className="col-span-1">Actions</div>
                                    </div>
                                    {workflowSteps.map((step, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-4 items-center bg-zinc-50/50 dark:bg-zinc-950/30 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                            <div className="col-span-1 flex flex-col gap-1">
                                                <button
                                                    onClick={() => moveWorkflowStep(index, 'up')}
                                                    disabled={index === 0}
                                                    className="text-zinc-400 hover:text-blue-600 disabled:opacity-30"
                                                >
                                                    ▲
                                                </button>
                                                <button
                                                    onClick={() => moveWorkflowStep(index, 'down')}
                                                    disabled={index === workflowSteps.length - 1}
                                                    className="text-zinc-400 hover:text-blue-600 disabled:opacity-30"
                                                >
                                                    ▼
                                                </button>
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="text"
                                                    value={step.id}
                                                    onChange={(e) => updateWorkflowStep(index, 'id', e.target.value)}
                                                    className="w-full text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    placeholder="e.g. package-selection"
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                <input
                                                    type="text"
                                                    value={step.label}
                                                    onChange={(e) => updateWorkflowStep(index, 'label', e.target.value)}
                                                    className="w-full text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    placeholder="e.g. 1. Package Selection"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="text"
                                                    value={step.path}
                                                    onChange={(e) => updateWorkflowStep(index, 'path', e.target.value)}
                                                    className="w-full text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    placeholder="e.g. package-selection"
                                                />
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <button
                                                    onClick={() => removeWorkflowStep(index)}
                                                    className="text-zinc-400 hover:text-red-500 p-2"
                                                    title="Remove Step"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={addWorkflowStep}
                                        className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 dark:hover:text-zinc-300 dark:hover:border-zinc-700 transition-colors"
                                    >
                                        + Add Step
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* New Catalog Modal */}
            {
                showNewCatalogModal && (
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
                )
            }

            {/* New Field Modal */}
            {
                showNewFieldModal && (
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
                )
            }
        </main >
    );
}
