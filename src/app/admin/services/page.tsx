"use client";

import { useState, useEffect } from "react";
import { useServices } from "@/src/hooks/useServices";
import { ServiceService } from "@/src/lib/firebase";
import { Service } from "@/src/lib/types";
import Link from "next/link";

export default function ServicesPage() {
    const { services, loading, refreshServices } = useServices();
    const [orderedServices, setOrderedServices] = useState<Service[]>([]);
    const [orderDirty, setOrderDirty] = useState(false);
    const [savingOrder, setSavingOrder] = useState(false);

    // Sync local order state when services load/refresh
    useEffect(() => {
        setOrderedServices(services);
        setOrderDirty(false);
    }, [services]);

    const deleteService = async (id: string) => {
        if (!confirm("Delete this service? This action cannot be undone.")) return;
        try {
            const res = await fetch("/api/admin/services/delete", {
                method: "POST",
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                refreshServices();
            } else {
                alert("Failed to delete service.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const moveService = (index: number, direction: "up" | "down") => {
        const newList = [...orderedServices];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newList.length) return;
        [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
        setOrderedServices(newList);
        setOrderDirty(true);
    };

    const saveOrder = async () => {
        setSavingOrder(true);
        try {
            const updates = orderedServices.map((s, i) => ({ id: s.id, sortOrder: i }));
            await ServiceService.updateServiceSortOrders(updates);
            await refreshServices();
            setOrderDirty(false);
        } catch (e) {
            console.error(e);
            alert("Failed to save sort order.");
        } finally {
            setSavingOrder(false);
        }
    };

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Service Catalog</h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">Manage products, service packages, and design requirements.</p>
                </div>
                <div className="flex items-center gap-3">
                    {orderDirty && (
                        <button
                            id="save-sort-order-btn"
                            onClick={saveOrder}
                            disabled={savingOrder}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {savingOrder ? "Saving…" : "Save Order"}
                        </button>
                    )}
                    <Link
                        href="/admin/services/new"
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm"
                    >
                        + New Service
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orderedServices.length === 0 ? (
                        <div className="md:col-span-3 py-20 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center">
                            <p className="text-zinc-500 mb-4">No services found in the catalog.</p>
                            <Link
                                href="/admin/services/new"
                                className="text-blue-600 font-medium hover:underline"
                            >
                                Create your first service
                            </Link>
                        </div>
                    ) : (
                        orderedServices.map((service, index) => (
                            <div key={service.id} className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${service.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                            {service.active ? 'Active' : 'Draft'}
                                        </div>
                                        {service.is_attachment && (
                                            <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                Attachment
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {/* Sort Order Controls */}
                                        <button
                                            id={`move-up-${service.id}`}
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveService(index, "up"); }}
                                            disabled={index === 0}
                                            className="relative z-10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all p-1 text-sm"
                                            title="Move Up"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            id={`move-down-${service.id}`}
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveService(index, "down"); }}
                                            disabled={index === orderedServices.length - 1}
                                            className="relative z-10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all p-1 text-sm"
                                            title="Move Down"
                                        >
                                            ▼
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                deleteService(service.id);
                                            }}
                                            className="relative z-10 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">{service.name}</h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-6 flex-grow">{service.short_description}</p>

                                <div className="flex items-center gap-4 text-xs font-medium text-zinc-400 pt-4 border-t border-zinc-50 dark:border-zinc-800">
                                    <div className="text-zinc-300 dark:text-zinc-600 font-mono">#{index + 1}</div>
                                    <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
                                    <div>{service.service_options?.length || 0} Options</div>
                                    <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
                                    <div>
                                        {(service.service_options || []).reduce((acc, opt) => acc + (opt.design_options?.length || 0), 0)} Designs
                                    </div>
                                </div>

                                <Link
                                    href={`/admin/services/${service.id}`}
                                    className="absolute inset-0 z-0"
                                    aria-label={`Edit ${service.name}`}
                                />
                            </div>
                        ))
                    )}
                </div>
            )}
        </main>
    );
}
