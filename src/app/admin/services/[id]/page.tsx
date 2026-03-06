"use client";

import { useEffect, useState, use } from "react";
import { Service, ServiceItem, SERVICE_CATEGORIES as DEFAULT_CATEGORIES, SystemConfig } from "@/src/lib/types";
import { ServiceService, SystemDefaultsService } from "@/src/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ServiceItemForm from "@/src/components/admin/ServiceItemForm";
import ServiceOptionList from "@/src/components/admin/ServiceOptionList";
import { useSystemConfig } from "@/src/hooks/useSystemConfig";
import { useServices } from "@/src/hooks/useServices";

export default function ServiceEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const isNew = resolvedParams.id === "new";

    const [service, setService] = useState<Partial<Service>>({
        id: isNew ? "" : resolvedParams.id,
        name: "",
        short_description: "",
        detailed_description: "",
        caveats: [],
        assumptions: [],
        service_options: [],
        active: true,
        metadata: { category: "" }
    });

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"general" | "service-options">("general");

    const { config, updateConfigAsync } = useSystemConfig();
    const { services: allServices } = useServices();
    const categories: string[] = (config?.taxonomy as Record<string, string[]>)?.service_categories || [...DEFAULT_CATEGORIES];

    // Non-attachment base services for the attaches_to multi-select
    const baseServices = allServices.filter(s => !s.is_attachment && s.id !== (service.id || ""));

    useEffect(() => {
        if (!isNew) {
            const fetchService = async () => {
                try {
                    const data = await ServiceService.getServiceById(resolvedParams.id);
                    if (data) {
                        setService(data);
                    } else {
                        router.push("/admin/services");
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            fetchService();
        }
    }, [resolvedParams.id, isNew, router]);

    const handleSave = async () => {
        if (!service.name) {
            alert("Please enter a service name.");
            return;
        }

        setSaving(true);
        try {
            const finalCategory = service.metadata?.category?.trim() || "";
            const finalService = {
                ...service,
                id: isNew && !service.id ? service.name.toLowerCase().replace(/\s+/g, "_") : service.id,
                metadata: { ...service.metadata, category: finalCategory }
            } as Service;

            let taxonomyUpdated = false;
            const updatedTaxonomy: Record<string, string[]> = { ...(config?.taxonomy as Record<string, string[]> || {}) };

            // If category is new, add it to taxonomy
            if (finalCategory && !categories.includes(finalCategory)) {
                updatedTaxonomy.service_categories = [...(updatedTaxonomy.service_categories || []), finalCategory];
                taxonomyUpdated = true;
            }

            // Also check for new design option categories
            const designCategories = updatedTaxonomy.design_option_categories || [];
            const newDesignCategories = new Set<string>();
            finalService.service_options?.forEach(opt => {
                opt.design_options?.forEach(design => {
                    if (design.category && !designCategories.includes(design.category)) {
                        newDesignCategories.add(design.category);
                    }
                });
            });

            if (newDesignCategories.size > 0) {
                updatedTaxonomy.design_option_categories = [...designCategories, ...Array.from(newDesignCategories)];
                taxonomyUpdated = true;
            }

            if (taxonomyUpdated) {
                await updateConfigAsync({ taxonomy: updatedTaxonomy } as Partial<SystemConfig>);
            }

            await ServiceService.saveService(finalService);

            // Also update the system defaults (snapshot)
            await SystemDefaultsService.updateServiceInDefaults(finalService);

            alert("Service saved successfully!");
            if (isNew) {
                router.push(`/admin/services/${finalService.id}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to save service.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
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
                        <Link href="/admin/services" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm transition-colors">
                            ← Back to Catalog
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isNew ? "New Service" : `Edit ${service.name}`}
                    </h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setService(s => ({ ...s, active: !s.active }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${service.active
                            ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                            }`}
                    >
                        {service.active ? "Active" : "Draft"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {saving ? "Saving..." : "Save Service"}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-8 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab("general")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "general"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-zinc-500 hover:text-zinc-700"
                        }`}
                >
                    General Info
                </button>
                <button
                    onClick={() => setActiveTab("service-options")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "service-options"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-zinc-500 hover:text-zinc-700"
                        }`}
                >
                    Service Options & Designs ({service.service_options?.length || 0})
                </button>
            </div>

            <div className="space-y-8 animate-in fade-in duration-300">
                {activeTab === "general" && (
                    <div className="max-w-4xl">
                        <ServiceItemForm
                            item={service as ServiceItem}
                            onChange={(updates) => setService(s => ({ ...s, ...updates }))}
                            title="Primary Service Details"
                        />

                        <div className="mt-8 bg-zinc-50 dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-4">Metadata & Organization</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Service Category</label>
                                    <div className="space-y-2">
                                        <select
                                            value={categories.includes(service.metadata?.category || "") ? (service.metadata?.category || "") : (service.metadata?.category === "" ? "" : "custom")}
                                            onChange={(e) => {
                                                if (e.target.value === "custom") {
                                                    setService(s => ({ ...s, metadata: { ...s.metadata, category: " " } })); // Space to trigger custom input
                                                } else {
                                                    setService(s => ({ ...s, metadata: { ...s.metadata, category: e.target.value } }));
                                                }
                                            }}
                                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="">Select Category...</option>
                                            {categories.map((cat: string) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                            <option value="custom">＋ Create New Category...</option>
                                        </select>

                                        {(!service.metadata?.category || !categories.includes(service.metadata?.category)) && (
                                            <input
                                                type="text"
                                                value={service.metadata?.category?.trim() || ""}
                                                onChange={(e) => setService(s => ({ ...s, metadata: { ...s.metadata, category: e.target.value } }))}
                                                placeholder="Enter new category name..."
                                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 animate-in fade-in slide-in-from-top-1"
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Service Persistence ID</label>
                                    <input
                                        type="text"
                                        value={service.id || ""}
                                        onChange={(e) => setService(s => ({ ...s, id: e.target.value }))}
                                        disabled={!isNew}
                                        placeholder="managed_dia"
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 font-mono"
                                    />
                                    {isNew && <p className="text-[10px] text-zinc-400 mt-1">Leave blank to auto-generate from name.</p>}
                                </div>
                            </div>

                            {/* Attachment Service Configuration */}
                            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">This is an Attachment Service</h4>
                                        <p className="text-xs text-zinc-500 mt-0.5">Enable this only if this service itself is an add-on that attaches to other base services (e.g. a management tier like &quot;Zippy Managed Services&quot;). Do NOT enable on base services like SD-WAN or LAN.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setService(s => ({ ...s, is_attachment: !s.is_attachment, attaches_to: s.is_attachment ? [] : s.attaches_to }))}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${service.is_attachment ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${service.is_attachment ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {service.is_attachment && (
                                    <div className="animate-in fade-in slide-in-from-top-1">
                                        <label className="block text-xs font-medium text-zinc-500 mb-2">Attaches To (select base services)</label>
                                        <div className="space-y-2">
                                            {baseServices.length === 0 && (
                                                <p className="text-xs text-zinc-400 italic">No base services found.</p>
                                            )}
                                            {baseServices.map(s => {
                                                const isChecked = service.attaches_to?.includes(s.id) ?? false;
                                                return (
                                                    <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                const current = service.attaches_to || [];
                                                                setService(svc => ({
                                                                    ...svc,
                                                                    attaches_to: isChecked
                                                                        ? current.filter(id => id !== s.id)
                                                                        : [...current, s.id]
                                                                }));
                                                            }}
                                                            className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/10"
                                                        />
                                                        <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                                                            {s.name}
                                                            <span className="ml-2 text-xs text-zinc-400 font-mono">{s.id}</span>
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "service-options" && (
                    <div className="animate-in slide-in-from-right-2 duration-300">
                        <ServiceOptionList
                            items={service.service_options || []}
                            onUpdate={(items) => setService(s => ({ ...s, service_options: items }))}
                        />
                    </div>
                )}
            </div>
        </main>
    );
}
