"use client";

import { useEffect, useState, use } from "react";
import { Package, InclusionType, PackageItem, PackageCollateral } from "@/src/lib/types";
import { PackageService } from "@/src/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useServices } from "@/src/hooks/useServices";
import { useTechnicalFeatures } from "@/src/hooks/useTechnicalFeatures";
import { InclusionToggle } from "@/src/components/admin/inclusion-toggle";
import { InlineCopilotTrigger } from "@/src/components/common/InlineCopilotTrigger";
import { CopilotSuggestion } from "@/src/components/common/CopilotSuggestion";

const COLLATERAL_TYPES = [
    { value: 'solution_brief', label: 'Solution Brief' },
    { value: 'technical_reference', label: 'Technical Reference' },
    { value: 'diagram', label: 'Diagram' },
    { value: 'other', label: 'Other Asset' }
] as const;

interface EditingItem {
    serviceId: string;
    optionId?: string;
    designId?: string;
    label: string;
    supportedFeatures: string[];
}

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
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

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
                        name: pkg.name,
                        shortDescription: pkg.short_description
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
            // Find all items that are either the exact item, or a child of the item being removed.
            // A child has the same service_id, and if optionId is provided, the same service_option_id.
            const itemsToRemove = current.filter(i => {
                if (i.service_id !== serviceId) return false;
                if (optionId && i.service_option_id !== optionId) return false;
                if (designId && i.design_option_id !== designId) return false;
                return true;
            });

            setPkg({
                ...pkg,
                items: current.filter(i => !itemsToRemove.includes(i))
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
            const newItem = { ...current[idx], inclusion_type: type };
            current[idx] = newItem;
            setPkg({ ...pkg, items: current });
        }
    };

    const updateFeatureInclusion = (featureId: string, type: InclusionType | 'none') => {
        if (!editingItem) return;

        const current = [...(pkg.items || [])];
        const idx = current.findIndex(i =>
            i.service_id === editingItem.serviceId &&
            i.service_option_id === editingItem.optionId &&
            i.design_option_id === editingItem.designId
        );

        if (idx > -1) {
            const currentFeatures = [...(current[idx].enabled_features || [])];

            if (type === 'none') {
                current[idx].enabled_features = currentFeatures.filter(f => f.feature_id !== featureId);
            } else {
                const existingIdx = currentFeatures.findIndex(f => f.feature_id === featureId);
                if (existingIdx > -1) {
                    currentFeatures[existingIdx] = { ...currentFeatures[existingIdx], inclusion_type: type };
                } else {
                    currentFeatures.push({ feature_id: featureId, inclusion_type: type });
                }
                current[idx].enabled_features = currentFeatures;
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
                                <label className="block text-xs font-semibold text-zinc-500 mb-1 flex items-center">
                                    Full Description
                                    <InlineCopilotTrigger
                                        onClick={handleAskDescriptionCopilot}
                                        isLoading={isLoadingDescriptionCopilot}
                                        title="Generate a professional description"
                                    />
                                </label>
                                <CopilotSuggestion
                                    suggestion={descriptionSuggestion}
                                    onAccept={() => {
                                        setPkg({ ...pkg, detailed_description: descriptionSuggestion || "" });
                                        setDescriptionSuggestion(null);
                                    }}
                                    onReject={() => setDescriptionSuggestion(null)}
                                >
                                    <textarea
                                        value={pkg.detailed_description || ""}
                                        onChange={(e) => {
                                            setPkg({ ...pkg, detailed_description: e.target.value });
                                            setDescriptionSuggestion(null);
                                        }}
                                        rows={5}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Detailed value proposition..."
                                    />
                                </CopilotSuggestion>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Throughput Matching Basis</label>
                                <select
                                    value={pkg.throughput_basis || "sdwanCryptoThroughputMbps"}
                                    onChange={(e) => setPkg({ ...pkg, throughput_basis: e.target.value as "rawFirewallThroughputMbps" | "sdwanCryptoThroughputMbps" | "advancedSecurityThroughputMbps" })}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="rawFirewallThroughputMbps">Raw Firewall Throughput</option>
                                    <option value="sdwanCryptoThroughputMbps">SD-WAN Crypto Throughput</option>
                                    <option value="advancedSecurityThroughputMbps">Advanced Security Throughput</option>
                                </select>
                                <p className="text-xs text-zinc-400 mt-1">Determines which equipment spec is compared against site bandwidth.</p>
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
                                        <label className="cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-700 py-1.5 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded transition-colors">
                                            {pkg.collateral?.find(c => c.type === type.value) ? "Replace" : "Upload"}
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, type.value)}
                                                disabled={uploading || isNew}
                                            />
                                        </label>
                                    </div>
                                    {isNew && <p className="text-xs text-zinc-400 italic">Save package first to upload collateral.</p>}
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
                                                    <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-wider">{service.metadata?.category || 'Service'}</p>
                                                </div>
                                            </div>

                                            {isServiceSelected && (
                                                <div className="flex items-center gap-3">
                                                    {service.supported_features && service.supported_features.length > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingItem({
                                                                    serviceId: service.id,
                                                                    label: service.name,
                                                                    supportedFeatures: service.supported_features || []
                                                                });
                                                            }}
                                                            className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                        >
                                                            Features ({serviceItem?.enabled_features?.length || 0})
                                                        </button>
                                                    )}
                                                    <InclusionToggle
                                                        value={serviceItem?.inclusion_type || 'required'} // Default to required if missing, though schema might say otherwise
                                                        onChange={(val) => updateInclusion(service.id, val)}
                                                        className="text-sm"
                                                    />
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
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingItem({
                                                                                        serviceId: service.id,
                                                                                        optionId: option.id,
                                                                                        label: option.name,
                                                                                        supportedFeatures: option.supported_features || []
                                                                                    });
                                                                                }}
                                                                                className="text-xs font-bold text-zinc-500 hover:text-blue-600 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded transition-colors"
                                                                            >
                                                                                Features ({optionItem?.enabled_features?.length || 0})
                                                                            </button>
                                                                        )}
                                                                        <InclusionToggle
                                                                            value={optionItem?.inclusion_type || 'required'}
                                                                            onChange={(val) => updateInclusion(service.id, val, option.id)}
                                                                            className="py-1 px-2"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {isOptionSelected && option.design_options?.length > 0 && (
                                                                <div className="space-y-6 pt-2">
                                                                    {Object.entries(
                                                                        option.design_options.reduce((acc, design) => {
                                                                            const cat = design.category || 'General Settings';
                                                                            if (!acc[cat]) acc[cat] = [];
                                                                            acc[cat].push(design);
                                                                            return acc;
                                                                        }, {} as Record<string, typeof option.design_options>)
                                                                    ).map(([category, designs]) => (
                                                                        <div key={category} className="space-y-3">
                                                                            <h4 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] pl-10 flex items-center gap-2">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800"></span>
                                                                                {category}
                                                                            </h4>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10">
                                                                                {designs.map(design => {
                                                                                    const isDesignSelected = pkg.items?.some(i => i.service_id === service.id && i.service_option_id === option.id && i.design_option_id === design.id);
                                                                                    const designItem = pkg.items?.find(i => i.service_id === service.id && i.service_option_id === option.id && i.design_option_id === design.id);

                                                                                    return (
                                                                                        <div key={design.id} className={`p-3 rounded-xl border transition-all flex items-center justify-between ${isDesignSelected ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 shadow-sm' : 'border-zinc-100 dark:border-zinc-800 opacity-60 hover:opacity-100'}`}>
                                                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={isDesignSelected}
                                                                                                    onChange={() => toggleItem(service.id, option.id, design.id)}
                                                                                                    className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/10 cursor-pointer"
                                                                                                />
                                                                                                <div className="truncate cursor-pointer" onClick={() => toggleItem(service.id, option.id, design.id)}>
                                                                                                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{design.name}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                            {isDesignSelected && (
                                                                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                                                                    {design.supported_features && design.supported_features.length > 0 && (
                                                                                                        <button
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                setEditingItem({
                                                                                                                    serviceId: service.id,
                                                                                                                    optionId: option.id,
                                                                                                                    designId: design.id,
                                                                                                                    label: design.name,
                                                                                                                    supportedFeatures: design.supported_features || []
                                                                                                                });
                                                                                                            }}
                                                                                                            className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors text-zinc-400 hover:text-blue-600"
                                                                                                            title="Manage Features"
                                                                                                        >
                                                                                                            <span className="text-xs">⚙</span>
                                                                                                        </button>
                                                                                                    )}
                                                                                                    <InclusionToggle
                                                                                                        value={designItem?.inclusion_type || 'required'}
                                                                                                        onChange={(val) => updateInclusion(service.id, val, option.id, design.id)}
                                                                                                        className="py-1 px-1.5 scale-90 origin-right" // Make it slightly smaller
                                                                                                    />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ))}
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
            {/* Feature Editor Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold">Configure Features</h3>
                                <p className="text-sm text-zinc-500">{editingItem.label}</p>
                            </div>
                            <button onClick={() => setEditingItem(null)} className="text-zinc-400 hover:text-zinc-600">✕</button>
                        </div>
                        <div className="p-2 max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium">Feature</th>
                                        <th className="px-4 py-3 text-right font-medium">Inclusion Rule</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editingItem.supportedFeatures.map(fid => {
                                        const feature = features.find(f => f.id === fid);
                                        const currentItem = pkg.items?.find(i =>
                                            i.service_id === editingItem.serviceId &&
                                            i.service_option_id === editingItem.optionId &&
                                            i.design_option_id === editingItem.designId
                                        );
                                        const featureState = currentItem?.enabled_features?.find(f => f.feature_id === fid);
                                        const inclusion = featureState?.inclusion_type || 'none';

                                        return (
                                            <tr key={fid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{feature?.name || fid}</div>
                                                    <div className="text-xs text-zinc-500">{feature?.category}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                                                        {(['none', 'required', 'standard', 'optional'] as const).map((type) => (
                                                            <button
                                                                key={type}
                                                                onClick={() => updateFeatureInclusion(fid, type === 'none' ? 'none' : type as InclusionType)}
                                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${(inclusion === type) || (type === 'none' && !featureState)
                                                                    ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm'
                                                                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                                                    }`}
                                                            >
                                                                {type === 'none' ? 'Off' : type.charAt(0).toUpperCase() + type.slice(1)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
