import { useState } from "react";
import { TechnicalFeature, Service, Package } from "@/src/lib/types";
import { FeatureService } from "@/src/lib/firebase";
import FeatureModal from "@/src/components/modals/FeatureModal";

interface FeatureListProps {
    features: TechnicalFeature[];
    services: Service[];
    packages: Package[];
    onRefresh: () => void;
}

export default function FeatureList({ features, services, packages, onRefresh }: FeatureListProps) {
    const [ingesting, setIngesting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<TechnicalFeature | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'category', 'status', 'description', 'usage']);
    const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

    const filteredFeatures = features.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getUsageCount = (featureId: string) => {
        return getLinkedItems(featureId).length;
    };

    const getLinkedItems = (featureId: string) => {
        const items: { id: string, name: string, type: string, parentName?: string }[] = [];

        services.forEach(s => {
            if (s.supported_features?.includes(featureId)) {
                items.push({ id: s.id, name: s.name, type: 'Service' });
            }
            s.service_options?.forEach(so => {
                if (so.supported_features?.includes(featureId)) {
                    items.push({ id: so.id, name: so.name, type: 'Service Option', parentName: s.name });
                }
                so.design_options?.forEach(d => {
                    if (d.supported_features?.includes(featureId)) {
                        items.push({
                            id: d.id,
                            name: d.name,
                            type: 'Design Option',
                            parentName: `${s.name} › ${so.name}`
                        });
                    }
                });
            });
        });

        packages.forEach(p => {
            if (p.items.some(i => i.enabled_features?.some(f => f.feature_id === featureId))) {
                items.push({ id: p.id, name: p.name, type: 'Package' });
            }
        });

        return items;
    };

    const handleIngest = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIngesting(true);
        setUploadStatus("Uploading & Analyzing with Gemini...");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/ingest/features", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setUploadStatus(`Extracted ${data.data.length} features. Saving...`);

            // Batch save
            await FeatureService.saveFeatureBatch(data.data);

            setUploadStatus("Done! Refreshing...");
            onRefresh();
            setTimeout(() => setUploadStatus(null), 2000);

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setUploadStatus(`Error: ${err.message}`);
            } else {
                setUploadStatus("Error: Unknown error occurred");
            }
        } finally {
            setIngesting(false);
        }
    };

    const handleSave = async (feature: TechnicalFeature) => {
        await FeatureService.saveFeature(feature);
        onRefresh();
    };

    const handleDelete = async (id: string, name: string) => {
        const usage = getUsageCount(id);
        const confirmMsg = usage > 0
            ? `Warning: This feature is used in ${usage} items. Deleting it will leave broken links. Continue?`
            : `Are you sure you want to delete "${name}"?`;

        if (window.confirm(confirmMsg)) {
            await FeatureService.deleteFeature(id);
            onRefresh();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Technical Features</h2>
                    <p className="text-sm text-zinc-500">Manage technical capabilities and their assignments across the catalog.</p>
                </div>
                <div className="flex gap-4">
                    <label className={`btn bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all ${ingesting ? "opacity-50 pointer-events-none" : ""}`}>
                        {ingesting ? "Ingesting..." : "Ingest from Document"}
                        <input type="file" className="hidden" accept=".pdf,.txt,.md" onChange={handleIngest} disabled={ingesting} />
                    </label>
                    <button
                        onClick={() => {
                            setEditingFeature(null);
                            setIsModalOpen(true);
                        }}
                        className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-all shadow-lg shadow-zinc-500/10"
                    >
                        + Create Manual
                    </button>
                </div>
            </div>

            {/* Search Bar & Column Filters */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search features by name, category or description..."
                        className="block w-full pl-10 pr-3 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                    >
                        <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        Columns
                    </button>

                    {isColumnDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsColumnDropdownOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl z-20 p-2">
                                {['name', 'category', 'status', 'description', 'usage'].map(col => (
                                    <label key={col} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer text-sm capitalize">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.includes(col)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setVisibleColumns([...visibleColumns, col]);
                                                } else {
                                                    setVisibleColumns(visibleColumns.filter(c => c !== col));
                                                }
                                            }}
                                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        {col}
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {uploadStatus && (
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-xl border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-1">
                    {uploadStatus}
                </div>
            )}

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            {visibleColumns.includes('name') && <th className="px-6 py-3 font-medium text-zinc-500">Name</th>}
                            {visibleColumns.includes('category') && <th className="px-6 py-3 font-medium text-zinc-500">Category</th>}
                            {visibleColumns.includes('status') && <th className="px-6 py-3 font-medium text-zinc-500">Status</th>}
                            {visibleColumns.includes('description') && <th className="px-6 py-3 font-medium text-zinc-500">Description</th>}
                            {visibleColumns.includes('usage') && <th className="px-6 py-3 font-medium text-zinc-500 text-center">Usage</th>}
                            <th className="px-6 py-3 font-medium text-zinc-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {filteredFeatures.length > 0 ? (
                            filteredFeatures.map((feature) => (
                                <tr key={feature.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                    {visibleColumns.includes('name') && (
                                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{feature.name}</td>
                                    )}
                                    {visibleColumns.includes('category') && (
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                                {feature.category}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.includes('status') && (
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${feature.status === 'Supported' || !feature.status
                                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                                    : feature.status === 'In development'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                                                        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                }`}>
                                                {feature.status || "Supported"}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.includes('description') && (
                                        <td className="px-6 py-4 text-zinc-500 max-w-md truncate" title={feature.description}>
                                            {feature.description}
                                        </td>
                                    )}
                                    {visibleColumns.includes('usage') && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() => setExpandedFeatureId(expandedFeatureId === feature.id ? null : feature.id)}
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold transition-all hover:ring-2 hover:ring-blue-500/20 ${getUsageCount(feature.id) > 0 ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-pointer" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default"}`}
                                                >
                                                    {getUsageCount(feature.id)} Links
                                                </button>

                                                {expandedFeatureId === feature.id && getUsageCount(feature.id) > 0 && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setExpandedFeatureId(null)}></div>
                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl z-20 p-3 text-left">
                                                            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Used in:</div>
                                                            <div className="max-h-64 overflow-y-auto space-y-2">
                                                                {getLinkedItems(feature.id).map((item, idx) => (
                                                                    <div key={idx} className="flex flex-col text-xs py-1 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded">
                                                                        <div className="flex justify-between items-start">
                                                                            <span className="font-medium text-zinc-900 dark:text-white truncate">{item.name}</span>
                                                                            <span className="text-[10px] text-zinc-400 ml-2 whitespace-nowrap">({item.type})</span>
                                                                        </div>
                                                                        {item.parentName && (
                                                                            <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                                                                                in {item.parentName}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setEditingFeature(feature);
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                                title="Edit Feature"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(feature.id, feature.name)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                title="Delete Feature"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={visibleColumns.length + 1} className="px-6 py-12 text-center text-zinc-500">
                                    <div className="flex flex-col items-center">
                                        <svg className="w-12 h-12 text-zinc-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <p className="text-lg font-medium">No features found</p>
                                        <p className="text-sm">Try adjusting your search terms</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <FeatureModal
                key={editingFeature?.id || "new"}
                feature={editingFeature}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    );
}
