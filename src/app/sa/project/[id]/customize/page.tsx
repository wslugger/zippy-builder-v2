'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Package, PackageItem, Service, InclusionType } from '@/src/lib/types';
import { ProjectService, PackageService, ServiceService } from '@/src/lib/firebase';

// Helper to determine if a service is considered a "Primary" network service
// (SDWAN, LAN, WLAN) vs a secondary service (DIA, Broadband).
const isPrimaryService = (svc: Service | undefined) => {
    if (!svc) return false;
    const name = svc.name.toLowerCase();
    const id = svc.id.toLowerCase();
    // Exclude basic connectivity
    if (name.includes('dia') || name.includes('broadband') || name.includes('internet') || id.includes('dia') || id.includes('broadband')) return false;
    // Include primary networking
    if (name.includes('sd-wan') || name.includes('sdwan') || name.includes('lan') || name.includes('wlan') || name.includes('wifi')) return true;
    return ['sdwan', 'lan', 'wlan', 'mwlan'].includes(id);
};

export default function CustomizeProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;
    const [project, setProject] = useState<Project | null>(null);
    const [pkg, setPkg] = useState<Package | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State for the customized items
    const [items, setItems] = useState<PackageItem[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const proj = await ProjectService.getProject(projectId);
                setProject(proj);

                if (proj?.selectedPackageId) {
                    const [packageData, servicesData] = await Promise.all([
                        PackageService.getPackageById(proj.selectedPackageId),
                        ServiceService.getAllServices()
                    ]);

                    setPkg(packageData);
                    setServices(servicesData);

                    // Initialize items if not already customized
                    if (proj.customizedItems && proj.customizedItems.length > 0) {
                        setItems(proj.customizedItems);
                    } else if (packageData) {
                        // Seed from package
                        const initialItems = packageData.items.filter(i => i.inclusion_type !== 'optional');
                        setItems(initialItems);
                    }
                }
            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            loadData();
        }
    }, [projectId]);

    const getDesignCategory = (serviceId: string, optionId: string, designId: string) => {
        const service = services.find(s => s.id === serviceId);
        const option = service?.service_options?.find(o => o.id === optionId);
        const design = option?.design_options?.find(d => d.id === designId);
        return design?.category;
    };

    const handleSave = async (gotoNext = false) => {
        if (!project) return;
        setSaving(true);
        try {
            await ProjectService.updateProject(projectId, {
                customizedItems: items,
                status: gotoNext ? 'completed' : 'customizing' // or 'customized'
            });

            if (gotoNext) {
                // Move to next step (Design Doc)
                await ProjectService.updateProject(projectId, {
                    currentStep: 5
                });
                router.push(`/sa/project/${projectId}/design-doc`);
            } else {
                alert("Progress saved!");
            }
        } catch (error) {
            console.error("Failed to save:", error);
            alert("Failed to save progress.");
        } finally {
            setSaving(false);
        }
    };

    const toggleItem = (serviceId: string, optionId?: string, designId?: string, pkgInclusionType: InclusionType = 'optional') => {
        // Validation: Cannot toggle Required items
        if (pkgInclusionType === 'required') {
            alert("This item is required by the selected package and cannot be removed.");
            return;
        }

        const existsIdx = items.findIndex(i =>
            i.service_id === serviceId &&
            i.service_option_id === optionId &&
            i.design_option_id === designId
        );

        // Top-level service toggle: also manage attachment services
        const isTopLevelToggle = !optionId && !designId;
        const baseService = isTopLevelToggle ? services.find(s => s.id === serviceId) : undefined;
        const attachmentServices = baseService && !baseService.is_attachment
            ? services.filter(s => {
                if (!s.is_attachment || !s.attaches_to?.includes(serviceId)) return false;
                // Specifically restrict Zippy Managed Services to Primary Services
                if (s.id === 'zippy_managed_services') {
                    return isPrimaryService(baseService);
                }
                return true;
            })
            : [];

        if (existsIdx > -1) {
            // Remove (Opt-out) — also remove attachment items for this service
            const attachmentIds = new Set(attachmentServices.map(a => a.id));
            const newItems = items.filter((i, idx) => idx !== existsIdx && !attachmentIds.has(i.service_id));
            setItems(newItems);
        } else {
            // Add (Opt-in)
            let updatedItems = [...items];

            // If it's a design option, enforce category mutual exclusivity
            if (designId && optionId) {
                const currentCategory = getDesignCategory(serviceId, optionId, designId);
                if (currentCategory) {
                    // Check for conflicts
                    const conflicts = updatedItems.filter(i => {
                        if (i.service_id === serviceId && i.service_option_id === optionId && i.design_option_id) {
                            const otherCategory = getDesignCategory(i.service_id, i.service_option_id, i.design_option_id);
                            return otherCategory === currentCategory && i.design_option_id !== designId;
                        }
                        return false;
                    });

                    // If any conflict is REQUIRED, block the switch
                    const hasRequiredConflict = conflicts.some(i =>
                        getPackageRule(i.service_id, i.service_option_id, i.design_option_id) === 'required'
                    );

                    if (hasRequiredConflict) {
                        alert("Cannot select this option because it would replace a required item in the same category.");
                        return;
                    }

                    // Remove all items in the same category before adding the new one
                    const conflictIds = new Set(conflicts.map(i => i.design_option_id));
                    updatedItems = updatedItems.filter(i => !conflictIds.has(i.design_option_id));
                }
            }

            const newItem: PackageItem = {
                service_id: serviceId,
                service_option_id: optionId,
                design_option_id: designId,
                enabled_features: [],
                inclusion_type: pkgInclusionType
            };

            // Auto-add default tier for each attachment service when activating a base service
            const attachmentDefaults: PackageItem[] = isTopLevelToggle
                ? attachmentServices
                    .filter(a => a.service_options?.length > 0)
                    .map(a => {
                        // Use package-defined tier if specified, else default to first option
                        const pkgTierId = pkg?.items.find(i => i.service_id === a.id && i.service_option_id)?.service_option_id;
                        return {
                            service_id: a.id,
                            service_option_id: pkgTierId || a.service_options[0].id,
                            enabled_features: [],
                            inclusion_type: 'required' as const,
                        };
                    })
                : [];

            setItems([...updatedItems, newItem, ...attachmentDefaults]);
        }
    };

    const isItemActive = (serviceId: string, optionId?: string, designId?: string) => {
        return items.some(i =>
            i.service_id === serviceId &&
            i.service_option_id === optionId &&
            i.design_option_id === designId
        );
    };

    if (loading || !pkg) return <div className="p-10 text-center">Loading Customizer...</div>;

    // Helper to get rule from Package Definition
    const getPackageRule = (serviceId: string, optionId?: string, designId?: string): InclusionType | null => {
        const item = pkg.items.find(i =>
            i.service_id === serviceId &&
            i.service_option_id === optionId &&
            i.design_option_id === designId
        );
        return item?.inclusion_type || null;
    };

    return (
        <div className="max-w-7xl mx-auto p-6 pb-24">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Customize Design</h1>
                    <p className="text-neutral-500">Tailor the {pkg.name} package for {project?.customerName}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        Save Progress
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20"
                    >
                        Finalize Design &rarr;
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Main Configurator */}
                <div className="lg:col-span-3 space-y-8">
                    {services.filter(s => !s.is_attachment).map(service => {
                        const serviceRule = getPackageRule(service.id);

                        // If the service itself is not in the package, skip it?
                        // Actually, some packages might not have the "Service" itself as a rule,
                        // but have sub-items. But usually the service is the top level.
                        // Let's check if ANY sub-item is in the package if the service itself is null.
                        const hasWhitelistedContent = serviceRule !== null ||
                            service.service_options?.some(opt =>
                                getPackageRule(service.id, opt.id) !== null ||
                                opt.design_options?.some(design => getPackageRule(service.id, opt.id, design.id) !== null)
                            );

                        if (!hasWhitelistedContent) return null;

                        const attachmentServices = services.filter(s => {
                            if (!s.is_attachment || !s.attaches_to?.includes(service.id)) return false;
                            // Specifically restrict Zippy Managed Services to Primary Services
                            if (s.id === 'zippy_managed_services') {
                                return isPrimaryService(service);
                            }
                            return true;
                        });

                        const isServiceActive = isItemActive(service.id);
                        const isServiceRequired = serviceRule === 'required';
                        const effectiveServiceRule = serviceRule || 'optional'; // Fallback for display if sub-items exist
                        return (
                            <div key={service.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                                <div className={`p-6 flex items-center justify-between ${isServiceActive ? 'bg-blue-50/10' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => toggleItem(service.id, undefined, undefined, effectiveServiceRule)}
                                            disabled={isServiceRequired}
                                            className={`
                                                w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                                                ${isServiceActive
                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                    : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-400'}
                                                ${isServiceRequired ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            {isServiceActive && "✓"}
                                        </button>
                                        <div>
                                            <h3 className="text-xl font-bold">{service.name}</h3>
                                            <div className="flex gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider ${effectiveServiceRule === 'required' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    effectiveServiceRule === 'standard' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                                                    }`}>
                                                    {effectiveServiceRule}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Attached Services — mandatory options when service is active */}
                                {isServiceActive && attachmentServices.length > 0 && (
                                    <div className="border-t border-purple-100 dark:border-purple-900/30 p-6 bg-purple-50/30 dark:bg-purple-900/5">
                                        <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.15em] mb-4 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                            Attached Services
                                        </p>
                                        <div className="space-y-4">
                                            {attachmentServices.map(attachment => {
                                                const pkgAttachItem = pkg?.items.find(i => i.service_id === attachment.id && i.service_option_id && !i.design_option_id);
                                                const isAttachmentRequired = pkgAttachItem?.inclusion_type === 'required';
                                                const currentTierItem = items.find(i => i.service_id === attachment.id && i.service_option_id && !i.design_option_id);
                                                const currentTierId = currentTierItem?.service_option_id || pkgAttachItem?.service_option_id || attachment.service_options?.[0]?.id || "";
                                                return (
                                                    <div key={attachment.id} className="flex items-center gap-4">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{attachment.name}</span>
                                                                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">REQUIRED</span>
                                                            </div>
                                                            <select
                                                                value={currentTierId}
                                                                disabled={isAttachmentRequired}
                                                                onChange={(e) => {
                                                                    const withoutOld = items.filter(i => i.service_id !== attachment.id);
                                                                    setItems([...withoutOld, {
                                                                        service_id: attachment.id,
                                                                        service_option_id: e.target.value,
                                                                        enabled_features: [],
                                                                        inclusion_type: 'required',
                                                                    }]);
                                                                }}
                                                                className="w-full bg-white dark:bg-neutral-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                                            >
                                                                {attachment.service_options?.map(opt => (
                                                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                                ))}
                                                            </select>
                                                            {isAttachmentRequired && (
                                                                <p className="text-[10px] text-neutral-400 mt-1">Tier locked by package definition.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Service Options */}
                                {isServiceActive && service.service_options?.length > 0 && (
                                    <div className="border-t border-neutral-100 dark:border-neutral-800 p-6 space-y-6 bg-neutral-50 dark:bg-neutral-950/30">
                                        {service.service_options.map(option => {
                                            const optionRule = getPackageRule(service.id, option.id);

                                            // Check if this option or any of its children are whitelisted
                                            const hasWhitelistedOptionContent = optionRule !== null ||
                                                option.design_options?.some(design => getPackageRule(service.id, option.id, design.id) !== null);

                                            if (!hasWhitelistedOptionContent) return null;

                                            const isOptionActive = isItemActive(service.id, option.id);
                                            const isOptionRequired = optionRule === 'required';
                                            const effectiveOptionRule = optionRule || 'optional';

                                            return (
                                                <div key={option.id} className="pl-4 border-l-2 border-neutral-200 dark:border-neutral-800">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <button
                                                            onClick={() => toggleItem(service.id, option.id, undefined, effectiveOptionRule)}
                                                            disabled={isOptionRequired}
                                                            className={`
                                                                w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                                                ${isOptionActive
                                                                    ? 'bg-neutral-800 dark:bg-neutral-200 border-neutral-800 dark:border-neutral-200 text-white dark:text-neutral-900'
                                                                    : 'border-neutral-300 dark:border-neutral-700'}
                                                                ${isOptionRequired ? 'opacity-50 cursor-not-allowed' : ''}
                                                            `}
                                                        >
                                                            {isOptionActive && <span className="text-xs font-bold">✓</span>}
                                                        </button>
                                                        <span className="font-semibold">{option.name}</span>
                                                        <span className="text-xs text-neutral-400 uppercase">({effectiveOptionRule})</span>
                                                    </div>

                                                    {/* Design Options — grouped by category */}
                                                    {isOptionActive && option.design_options?.length > 0 && (() => {
                                                        // Filter to whitelisted options first
                                                        const visibleDesigns = option.design_options.filter(d => getPackageRule(service.id, option.id, d.id) !== null);

                                                        // Group by category
                                                        const grouped = visibleDesigns.reduce<Record<string, typeof visibleDesigns>>((acc, design) => {
                                                            const cat = design.category || 'Other';
                                                            if (!acc[cat]) acc[cat] = [];
                                                            acc[cat].push(design);
                                                            return acc;
                                                        }, {});

                                                        const categories = Object.keys(grouped);
                                                        if (categories.length === 0) return null;

                                                        return (
                                                            <div className="pl-8 space-y-4 mt-2">
                                                                {categories.map(cat => (
                                                                    <div key={cat}>
                                                                        {/* Category header */}
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{cat}</span>
                                                                            <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
                                                                        </div>

                                                                        {/* Options in this category */}
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                            {grouped[cat].map(design => {
                                                                                const designRule = getPackageRule(service.id, option.id, design.id)!;
                                                                                const isDesignActive = isItemActive(service.id, option.id, design.id);
                                                                                const isDesignRequired = designRule === 'required';

                                                                                return (
                                                                                    <div
                                                                                        key={design.id}
                                                                                        onClick={() => !isDesignRequired && toggleItem(service.id, option.id, design.id, designRule)}
                                                                                        className={`
                                                                                            p-3 rounded-xl border transition-all flex justify-between items-center group
                                                                                            ${isDesignRequired ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}
                                                                                            ${isDesignActive
                                                                                                ? 'bg-white dark:bg-neutral-800 border-blue-500 shadow-sm'
                                                                                                : 'bg-transparent border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'}
                                                                                        `}
                                                                                    >
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0
                                                                                                ${isDesignActive ? 'border-blue-500 bg-blue-500' : 'border-neutral-400'}
                                                                                            `}>
                                                                                                {isDesignActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                                                            </div>
                                                                                            <span className="text-sm font-medium">{design.name}</span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                                                                            {designRule === 'required' ? (
                                                                                                <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded font-bold">REQ</span>
                                                                                            ) : designRule === 'standard' ? (
                                                                                                <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-1.5 py-0.5 rounded font-bold">STD</span>
                                                                                            ) : (
                                                                                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-bold">OPT</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}

                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Sidebar Summary */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-lg shadow-neutral-100 dark:shadow-none">
                        <h3 className="font-bold text-lg mb-4">Design Summary</h3>

                        <div className="space-y-4 mb-6 relative">
                            {/* Stats */}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-500">Services</span>
                                <span className="font-mono font-bold">{items.filter(i => !i.service_option_id).length}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-500">Service Options</span>
                                <span className="font-mono font-bold">{items.filter(i => i.service_option_id && !i.design_option_id).length}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-500">Design Decisions</span>
                                <span className="font-mono font-bold">{items.filter(i => i.design_option_id).length}</span>
                            </div>

                            <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-4" />

                            {/* Recent Changes List could go here */}
                            <p className="text-xs text-neutral-400 text-center">
                                Changes are auto-saved locally. Click Save Progress to persist.
                            </p>
                        </div>

                        <button
                            onClick={() => handleSave(true)}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all"
                        >
                            Finalize Design
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
