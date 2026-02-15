"use client";

import { useEffect, useState, use } from "react";
import { Package, InclusionType, PackageItem, PackageCollateral } from "@/src/lib/types";
import { PackageService } from "@/src/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useServices } from "@/src/hooks/useServices";
import { useTechnicalFeatures } from "@/src/hooks/useTechnicalFeatures";

const COLLATERAL_TYPES = [
    { value: 'solution_brief', label: 'Solution Brief' },
    { value: 'technical_reference', label: 'Technical Reference' },
    { value: 'diagram', label: 'Diagram' },
    { value: 'other', label: 'Other Asset' }
] as const;

export default function PackageEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const isNew = resolvedParams.id === "new";

    const [pkg, setPkg] = useState<Partial<Package>>({
        id: isNew ? "" : resolvedParams.id,
        name: "",
        short_description: "",
        detailed_description: "",
        items: [],
        collateral: [],
        active: true
    });

    const { services, loading: loadingServices } = useServices();
    const { features, loading: loadingFeatures } = useTechnicalFeatures();
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!isNew) {
            const fetchPackage = async () => {
                try {
                    const data = await PackageService.getPackageById(resolvedParams.id);
                    if (data) {
                        setPkg(data);
                    } else {
                        router.push("/admin/packages");
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            fetchPackage();
        }
    }, [resolvedParams.id, isNew, router]);

    const handleSave = async () => {
        if (!pkg.name || !pkg.short_description) {
            alert("Please enter a name and short description.");
            return;
        }

        setSaving(true);
        try {
            const finalPkg = {
                ...pkg,
                id: isNew && !pkg.id ? pkg.name.toLowerCase().replace(/\s+/g, "_") : pkg.id,
            } as Package;

            await PackageService.savePackage(finalPkg);
            alert("Package saved successfully!");
            if (isNew) {
                router.push(`/admin/packages/${finalPkg.id}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to save package.");
        } finally {
            setSaving(false);
        }
    };

    const toggleItem = (serviceId: string, optionId?: string, designId?: string) => {
        const current = pkg.items || [];
        const exists = current.find(i =>
            i.service_id === serviceId &&
            i.service_option_id === optionId &&
            i.design_option_id === designId
        );

        if (exists) {
            setPkg({
                ...pkg,
                items: current.filter(i => i !== exists)
            });
        } else {
            const newItem: PackageItem = {
                service_id: serviceId,
                service_option_id: optionId,
                design_option_id: designId,
                enabled_features: [],
                inclusion_type: 'required'
            };
            setPkg({
                ...pkg,
                items: [...current, newItem]
            });
        }
    };

    const updateInclusion = (serviceId: string, type: InclusionType, optionId?: string, designId?: string) => {
        const current = [...(pkg.items || [])];
        const idx = current.findIndex(i =>
            i.service_id === serviceId &&
            i.service_option_id === optionId &&
            i.design_option_id === designId
        );
        if (idx > -1) {
            current[idx].inclusion_type = type;
            setPkg({ ...pkg, items: current });
        }
    };

    const toggleFeature = (serviceId: string, featureId: string, optionId?: string, designId?: string) => {
        const current = [...(pkg.items || [])];
        const idx = current.findIndex(i =>
            i.service_id === serviceId &&
            i.service_option_id === optionId &&
            i.design_option_id === designId
        );

        if (idx > -1) {
            const enabled = [...(current[idx].enabled_features || [])];
            if (enabled.includes(featureId)) {
                current[idx].enabled_features = enabled.filter(fid => fid !== featureId);
            } else {
                current[idx].enabled_features = [...enabled, featureId];
            }
            setPkg({ ...pkg, items: current });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!pkg.id) {
            alert("Please provide a name/save the package first to enable uploads.");
            return;
        }

        console.log("Starting upload process for type:", type);
        setUploading(true);
        try {
            const asset = await PackageService.uploadCollateral(pkg.id, file, type);
            console.log("Upload successful, updating package state...");

            const updatedCollateral = [...(pkg.collateral || []), asset as PackageCollateral];
            const updatedPkg = {
                ...pkg,
                collateral: updatedCollateral
            };

            setPkg(updatedPkg);

            // Persist the change immediately to Firestore
            console.log("Auto-saving package with new asset...");
            await PackageService.savePackage(updatedPkg as Package);
            console.log("Package auto-saved successfully.");

        } catch (error: unknown) {
            console.error("Upload or Save failed:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            alert(`Failed: ${message}`);
        } finally {
            setUploading(false);
        }
    };

    const deleteCollateral = async (asset: PackageCollateral) => {
        if (!confirm("Delete this asset?")) return;
        try {
            // We'd ideally delete from storage too, but for now just from doc
            setPkg({
                ...pkg,
                collateral: (pkg.collateral || []).filter(c => c.id !== asset.id)
            });
        } catch (e) {
            console.error(e);
        }
    };

    if (loading || loadingServices || loadingFeatures) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/admin/packages" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm transition-colors">
                            ← Back to Catalog
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isNew ? "New Package" : `Edit ${pkg.name}`}
                    </h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setPkg(p => ({ ...p, active: !p.active }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${pkg.active
                            ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                            }`}
                    >
                        {pkg.active ? "Active" : "Draft"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {saving ? "Saving..." : "Save Package"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Details & Collateral */}
                <div className="lg:col-span-1 space-y-8">
                    <section className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6">Package Info</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Package Name</label>
                                <input
                                    type="text"
                                    value={pkg.name || ""}
                                    onChange={(e) => setPkg({ ...pkg, name: e.target.value })}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Standard Enterprise"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Short Description</label>
                                <input
                                    type="text"
                                    value={pkg.short_description || ""}
                                    onChange={(e) => setPkg({ ...pkg, short_description: e.target.value })}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Standard connectivity bundle..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Full Description</label>
                                <textarea
                                    value={pkg.detailed_description || ""}
                                    onChange={(e) => setPkg({ ...pkg, detailed_description: e.target.value })}
                                    rows={5}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Detailed value proposition..."
                                />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Collateral</h2>
                            {uploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
                        </div>

                        <div className="space-y-4">
                            {COLLATERAL_TYPES.map(type => (
                                <div key={type.value} className="p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{type.label}</span>
                                        <label className="cursor-pointer text-[10px] font-bold text-blue-600 hover:text-blue-700 py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded transition-colors">
                                            {pkg.collateral?.find(c => c.type === type.value) ? "Replace" : "Upload"}
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, type.value)}
                                                disabled={uploading || isNew}
                                            />
                                        </label>
                                    </div>
                                    {isNew && <p className="text-[10px] text-zinc-400 italic">Save package first to upload collateral.</p>}
                                    <div className="space-y-2">
                                        {pkg.collateral?.filter(c => c.type === type.value).map(asset => (
                                            <div key={asset.id} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg text-xs">
                                                <span className="truncate flex-1 mr-2 text-zinc-600 dark:text-zinc-400 font-medium">{asset.file_name}</span>
                                                <div className="flex gap-2">
                                                    <a href={asset.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View</a>
                                                    <button onClick={() => deleteCollateral(asset)} className="text-red-500 hover:text-red-600">✕</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right: Service Builder */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="flex justify-between items-end mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Service Bundling</h2>
                                <p className="text-sm text-zinc-500 mt-1">Select services and define their inclusion rules.</p>
                            </div>
                            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                {pkg.items?.length || 0} Selection{pkg.items?.length === 1 ? '' : 's'}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {services.map(service => {
                                const isServiceSelected = pkg.items?.some(i => i.service_id === service.id && !i.service_option_id);
                                const serviceItem = pkg.items?.find(i => i.service_id === service.id && !i.service_option_id);

                                return (
                                    <div key={service.id} className={`border rounded-2xl transition-all overflow-hidden ${isServiceSelected ? 'border-blue-200 dark:border-blue-900 shadow-sm' : 'border-zinc-100 dark:border-zinc-800'}`}>
                                        <div className={`px-5 py-4 flex items-center justify-between ${isServiceSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-transparent'}`}>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => toggleItem(service.id)}
                                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isServiceSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700'}`}
                                                >
                                                    {isServiceSelected && <span className="text-xs">✓</span>}
                                                </button>
                                                <div>
                                                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 leading-none">{service.name}</h3>
                                                    <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">{service.metadata?.category || 'Service'}</p>
                                                </div>
                                            </div>

                                            {isServiceSelected && (
                                                <div className="flex items-center gap-3">
                                                    {service.supported_features && service.supported_features.length > 0 && (
                                                        <div className="flex -space-x-1 overflow-hidden">
                                                            {service.supported_features.map(fid => {
                                                                const feature = features.find(f => f.id === fid);
                                                                const isEnabled = serviceItem?.enabled_features?.includes(fid);
                                                                return (
                                                                    <button
                                                                        key={fid}
                                                                        onClick={(e) => { e.stopPropagation(); toggleFeature(service.id, fid); }}
                                                                        title={feature?.name || fid}
                                                                        className={`w-5 h-5 rounded-full border text-[8px] flex items-center justify-center transition-all ${isEnabled ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'}`}
                                                                    >
                                                                        {feature?.name?.charAt(0) || '?'}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    <select
                                                        value={serviceItem?.inclusion_type}
                                                        onChange={(e) => updateInclusion(service.id, e.target.value as InclusionType)}
                                                        className="text-xs font-bold bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none pointer-events-auto"
                                                    >
                                                        <option value="required">Required</option>
                                                        <option value="standard">Standard (Opt-out)</option>
                                                        <option value="optional">Optional (Opt-in)</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {isServiceSelected && service.service_options?.length > 0 && (
                                            <div className="px-10 pb-5 pt-2 space-y-6 border-t border-zinc-50 dark:border-zinc-800/50">
                                                {service.service_options.map(option => {
                                                    const isOptionSelected = pkg.items?.some(i => i.service_id === service.id && i.service_option_id === option.id && !i.design_option_id);
                                                    const optionItem = pkg.items?.find(i => i.service_id === service.id && i.service_option_id === option.id && !i.design_option_id);

                                                    return (
                                                        <div key={option.id} className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => toggleItem(service.id, option.id)}
                                                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isOptionSelected ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900' : 'border-zinc-300 dark:border-zinc-700'}`}
                                                                    >
                                                                        {isOptionSelected && <span className="text-[10px]">✓</span>}
                                                                    </button>
                                                                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{option.name}</span>
                                                                </div>
                                                                {isOptionSelected && (
                                                                    <div className="flex items-center gap-3">
                                                                        {option.supported_features && option.supported_features.length > 0 && (
                                                                            <div className="flex gap-1">
                                                                                {option.supported_features.map(fid => {
                                                                                    const feature = features.find(f => f.id === fid);
                                                                                    const isEnabled = optionItem?.enabled_features?.includes(fid);
                                                                                    return (
                                                                                        <button
                                                                                            key={fid}
                                                                                            onClick={(e) => { e.stopPropagation(); toggleFeature(service.id, fid, option.id); }}
                                                                                            title={feature?.name || fid}
                                                                                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all ${isEnabled ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-800 dark:border-white' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}
                                                                                        >
                                                                                            {feature?.name || fid}
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                        <select
                                                                            value={optionItem?.inclusion_type}
                                                                            onChange={(e) => updateInclusion(service.id, e.target.value as InclusionType, option.id)}
                                                                            className="text-[10px] font-bold bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-0.5 outline-none"
                                                                        >
                                                                            <option value="required">Required</option>
                                                                            <option value="standard">Standard</option>
                                                                            <option value="optional">Optional</option>
                                                                        </select>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {isOptionSelected && option.design_options?.length > 0 && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                                                                    {option.design_options.map(design => {
                                                                        const isDesignSelected = pkg.items?.some(i => i.service_id === service.id && i.service_option_id === option.id && i.design_option_id === design.id);
                                                                        const designItem = pkg.items?.find(i => i.service_id === service.id && i.service_option_id === option.id && i.design_option_id === design.id);

                                                                        return (
                                                                            <div key={design.id} className={`p-3 rounded-xl border transition-all flex items-center justify-between ${isDesignSelected ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700' : 'border-zinc-100 dark:border-zinc-800 opacity-60'}`}>
                                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isDesignSelected}
                                                                                        onChange={() => toggleItem(service.id, option.id, design.id)}
                                                                                        className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/10"
                                                                                    />
                                                                                    <div className="truncate">
                                                                                        <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">{design.name}</p>
                                                                                        <p className="text-[9px] text-zinc-500 font-medium">{design.category || 'Design'}</p>
                                                                                    </div>
                                                                                </div>
                                                                                {isDesignSelected && (
                                                                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                                                                        {design.supported_features && design.supported_features.length > 0 && (
                                                                                            <div className="flex gap-1 mr-1">
                                                                                                {design.supported_features.map(fid => {
                                                                                                    const isEnabled = designItem?.enabled_features?.includes(fid);
                                                                                                    return (
                                                                                                        <button
                                                                                                            key={fid}
                                                                                                            onClick={(e) => { e.stopPropagation(); toggleFeature(service.id, fid, option.id, design.id); }}
                                                                                                            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${isEnabled ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-transparent'}`}
                                                                                                        >
                                                                                                            <span className="text-[6px]">★</span>
                                                                                                        </button>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        )}
                                                                                        <select
                                                                                            value={designItem?.inclusion_type}
                                                                                            onChange={(e) => updateInclusion(service.id, e.target.value as InclusionType, option.id, design.id)}
                                                                                            className="text-[9px] font-bold bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-md px-1 py-0.5 outline-none"
                                                                                        >
                                                                                            <option value="required">REQ</option>
                                                                                            <option value="standard">STD</option>
                                                                                            <option value="optional">OPT</option>
                                                                                        </select>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
