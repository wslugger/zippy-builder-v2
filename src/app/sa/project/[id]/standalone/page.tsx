'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Service, ServiceOption, PackageItem } from '@/src/lib/types';
import { ProjectService, ServiceService } from '@/src/lib/firebase';

export default function StandaloneServiceSelectionPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;

    const [project, setProject] = useState<Project | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState<PackageItem[]>([]);
    const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

    const loadData = useCallback(async () => {
        try {
            const [proj, svcs] = await Promise.all([
                ProjectService.getProject(projectId),
                ServiceService.getAllServices(),
            ]);
            setProject(proj);
            setServices(svcs.filter(s => s.active));
            if (proj?.customizedItems && proj.customizedItems.length > 0) {
                setItems(proj.customizedItems);
                // Auto-expand services that have selections
                const selectedServiceIds = new Set(proj.customizedItems.map(i => i.service_id));
                setExpandedServices(selectedServiceIds);
            }
        } catch (err) {
            console.error("Failed to load data:", err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // --- Selection logic ---

    const isServiceSelected = (serviceId: string) =>
        items.some(i => i.service_id === serviceId);

    const getSelectedOptionId = (serviceId: string): string | undefined =>
        items.find(i => i.service_id === serviceId && i.service_option_id && !i.design_option_id)?.service_option_id;

    const getSelectedDesignForCategory = (serviceId: string, optionId: string, category: string): string | undefined => {
        const service = services.find(s => s.id === serviceId);
        const option = service?.service_options?.find(o => o.id === optionId);
        return items.find(i => {
            if (i.service_id !== serviceId || i.service_option_id !== optionId || !i.design_option_id) return false;
            const design = option?.design_options?.find(d => d.id === i.design_option_id);
            return design?.category === category;
        })?.design_option_id;
    };

    const toggleService = (serviceId: string) => {
        const alreadySelected = isServiceSelected(serviceId);
        if (alreadySelected) {
            // Deselect: remove service and all sub-items
            setItems(prev => prev.filter(i => i.service_id !== serviceId));
            setExpandedServices(prev => { const s = new Set(prev); s.delete(serviceId); return s; });
        } else {
            // Select: add service-level item and expand
            setItems(prev => [...prev, { service_id: serviceId, enabled_features: [], inclusion_type: 'optional' }]);
            setExpandedServices(prev => new Set([...prev, serviceId]));
        }
    };

    const selectOption = (serviceId: string, optionId: string) => {
        setItems(prev => {
            // Remove existing option-level and design-level items for this service
            const without = prev.filter(i =>
                !(i.service_id === serviceId && i.service_option_id)
            );
            return [...without, { service_id: serviceId, service_option_id: optionId, enabled_features: [], inclusion_type: 'optional' }];
        });
    };

    const selectDesignOption = (serviceId: string, optionId: string, designId: string) => {
        const service = services.find(s => s.id === serviceId);
        const option = service?.service_options?.find(o => o.id === optionId);
        const design = option?.design_options?.find(d => d.id === designId);
        const category = design?.category;

        setItems(prev => {
            // Remove conflicting designs in the same category
            const withoutConflicts = category
                ? prev.filter(i => {
                    if (i.service_id !== serviceId || i.service_option_id !== optionId || !i.design_option_id) return true;
                    const otherDesign = option?.design_options?.find(d => d.id === i.design_option_id);
                    return otherDesign?.category !== category;
                })
                : prev;
            return [...withoutConflicts, { service_id: serviceId, service_option_id: optionId, design_option_id: designId, enabled_features: [], inclusion_type: 'optional' }];
        });
    };

    const toggleExpanded = (serviceId: string) => {
        setExpandedServices(prev => {
            const s = new Set(prev);
            if (s.has(serviceId)) s.delete(serviceId); else s.add(serviceId);
            return s;
        });
    };

    // --- Group design options by category ---
    const groupDesignsByCategory = (option: ServiceOption): Record<string, typeof option.design_options> => {
        const groups: Record<string, typeof option.design_options> = {};
        for (const d of option.design_options || []) {
            const cat = d.category || 'General';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(d);
        }
        return groups;
    };

    const handleSave = async (goNext = false) => {
        if (!project) return;
        setSaving(true);
        try {
            await ProjectService.updateProject(projectId, {
                customizedItems: items,
                status: goNext ? 'completed' : 'customizing',
                ...(goNext ? { currentStep: 5 } : {}),
            });
            if (goNext) {
                router.push(`/sa/project/${projectId}/design-doc`);
            } else {
                alert('Progress saved.');
            }
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const selectedCount = new Set(items.map(i => i.service_id)).size;

    if (loading) return <div className="p-10 text-center text-neutral-400">Loading services...</div>;
    if (!project) return <div className="p-10 text-center text-red-500">Project not found.</div>;

    return (
        <div className="max-w-5xl mx-auto p-6 pb-32">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Individual Sites &amp; Additional Services</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Select the services needed for <span className="font-medium text-neutral-700 dark:text-neutral-200">{project.customerName}</span>, then configure options and design choices.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {selectedCount > 0 && (
                        <span className="text-sm text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                            {selectedCount} service{selectedCount !== 1 ? 's' : ''} selected
                        </span>
                    )}
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        Save Progress
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving || selectedCount === 0}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Saving...' : 'Continue →'}
                    </button>
                </div>
            </div>

            {/* Service list */}
            {services.length === 0 ? (
                <div className="text-center py-20 text-neutral-400">No active services in catalog.</div>
            ) : (
                <div className="space-y-4">
                    {services.map(service => {
                        const selected = isServiceSelected(service.id);
                        const expanded = expandedServices.has(service.id);
                        const selectedOptionId = getSelectedOptionId(service.id);

                        return (
                            <div
                                key={service.id}
                                className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                                    selected
                                        ? 'border-blue-500 dark:border-blue-500 shadow-lg shadow-blue-500/10'
                                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                                } bg-white dark:bg-neutral-900`}
                            >
                                {/* Service header row */}
                                <div className="flex items-center gap-4 p-5">
                                    {/* Toggle checkbox */}
                                    <button
                                        onClick={() => toggleService(service.id)}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                            selected
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-neutral-300 dark:border-neutral-600 hover:border-blue-400'
                                        }`}
                                        aria-label={selected ? `Deselect ${service.name}` : `Select ${service.name}`}
                                    >
                                        {selected && (
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Service info — clicking expands if selected */}
                                    <div
                                        className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => selected ? toggleExpanded(service.id) : toggleService(service.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-base text-neutral-900 dark:text-neutral-100 truncate">{service.name}</h3>
                                            {service.service_options?.length > 0 && (
                                                <span className="text-xs text-neutral-400 shrink-0">
                                                    {service.service_options.length} option{service.service_options.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        {service.short_description && (
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">{service.short_description}</p>
                                        )}
                                    </div>

                                    {/* Expand chevron (only when selected and has options/designs) */}
                                    {selected && service.service_options?.length > 0 && (
                                        <button
                                            onClick={() => toggleExpanded(service.id)}
                                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors shrink-0"
                                        >
                                            <svg className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Expanded: service options & design options */}
                                {selected && expanded && service.service_options?.length > 0 && (
                                    <div className="border-t border-neutral-100 dark:border-neutral-800 px-5 pb-5 pt-4 space-y-5 bg-neutral-50/50 dark:bg-neutral-950/30">
                                        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Service Options</p>

                                        <div className="space-y-3">
                                            {service.service_options.map(option => {
                                                const optSelected = selectedOptionId === option.id;
                                                const designGroups = groupDesignsByCategory(option);
                                                const hasDesigns = option.design_options?.length > 0;

                                                return (
                                                    <div key={option.id} className={`rounded-xl border transition-all ${
                                                        optSelected
                                                            ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                                                            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900'
                                                    }`}>
                                                        {/* Option header */}
                                                        <button
                                                            onClick={() => selectOption(service.id, option.id)}
                                                            className="w-full flex items-start gap-3 p-4 text-left"
                                                        >
                                                            <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                                                optSelected ? 'border-blue-600 bg-blue-600' : 'border-neutral-300 dark:border-neutral-600'
                                                            }`}>
                                                                {optSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100">{option.name}</div>
                                                                {option.short_description && (
                                                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{option.short_description}</div>
                                                                )}
                                                            </div>
                                                        </button>

                                                        {/* Design options — only visible when this option is selected */}
                                                        {optSelected && hasDesigns && (
                                                            <div className="px-4 pb-4 space-y-4 border-t border-blue-100 dark:border-blue-900/30 pt-4">
                                                                {Object.entries(designGroups).map(([category, designs]) => {
                                                                    const selectedDesignId = getSelectedDesignForCategory(service.id, option.id, category);
                                                                    return (
                                                                        <div key={category}>
                                                                            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">{category}</p>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                {designs.map(design => {
                                                                                    const isActive = selectedDesignId === design.id;
                                                                                    return (
                                                                                        <button
                                                                                            key={design.id}
                                                                                            onClick={() => selectDesignOption(service.id, option.id, design.id)}
                                                                                            className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                                                                                                isActive
                                                                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                                                                    : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-neutral-900'
                                                                                            }`}
                                                                                        >
                                                                                            <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                                                isActive ? 'border-blue-600 bg-blue-600' : 'border-neutral-300 dark:border-neutral-600'
                                                                                            }`}>
                                                                                                {isActive && <span className="w-1 h-1 rounded-full bg-white" />}
                                                                                            </span>
                                                                                            <div className="min-w-0">
                                                                                                <div className="text-sm font-medium leading-tight">{design.name}</div>
                                                                                                {design.short_description && (
                                                                                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{design.short_description}</div>
                                                                                                )}
                                                                                            </div>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Sticky bottom summary bar */}
            {selectedCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between shadow-xl z-30">
                    <div className="text-sm text-neutral-600 dark:text-neutral-300">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{selectedCount}</span> service{selectedCount !== 1 ? 's' : ''} selected
                        {items.filter(i => i.design_option_id).length > 0 && (
                            <span className="ml-2 text-neutral-400">· {items.filter(i => i.design_option_id).length} design choice{items.filter(i => i.design_option_id).length !== 1 ? 's' : ''}</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSave(false)}
                            disabled={saving}
                            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
                            Save Progress
                        </button>
                        <button
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
                        >
                            {saving ? 'Saving...' : 'Continue to Design Doc →'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
