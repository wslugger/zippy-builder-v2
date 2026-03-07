"use client";

import { useState } from "react";
import { PricingItem } from "@/src/lib/types";
import { usePricing } from "@/src/hooks/usePricing";
import PricingTable from "@/src/components/admin/PricingTable";
import PricingModal from "@/src/components/admin/PricingModal";

export default function PricingCatalogPage() {
    const { pricingItems: data, loading, refreshPricingItems: fetchData } = usePricing();

    // Filter States
    const [search, setSearch] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PricingItem | null>(null);

    // Bulk Edit State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filter Logic
    const filteredData = data.filter((item) => {
        const lowerSearch = search.toLowerCase();
        return item.id.toLowerCase().includes(lowerSearch) ||
            item.description?.toLowerCase().includes(lowerSearch);
    });

    const handleAddNew = () => {
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (item: PricingItem) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch("/api/admin/pricing/delete", {
                method: "POST",
                body: JSON.stringify({ id }),
            });

            if (res.ok) {
                fetchData();
                // Remove from selection if it was selected
                const newSelection = new Set(selectedIds);
                if (newSelection.has(id)) {
                    newSelection.delete(id);
                    setSelectedIds(newSelection);
                }
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to delete pricing item");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;

        let successCount = 0;
        let errorCount = 0;

        for (const id of Array.from(selectedIds)) {
            try {
                const res = await fetch("/api/admin/pricing/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                });
                if (res.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (e) {
                errorCount++;
            }

            // Wait slightly to not overwhelm the API
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (errorCount > 0) {
            alert(`Finished: ${successCount} successful, ${errorCount} failed.`);
        } else {
            alert(`Successfully deleted ${successCount} items.`);
        }

        setSelectedIds(new Set());
        fetchData();
    };

    const handleSeed = async () => {
        if (!confirm("This will seed sample items into the pricing catalog. Continue?")) return;
        try {
            const res = await fetch("/api/admin/pricing/seed", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                fetchData();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to seed pricing items");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Pricing Catalog</h1>
                        <p className="text-zinc-400 mt-1">Manage independent pricing SKUs for equipment and licensing.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSeed}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-zinc-700 flex items-center gap-2"
                        >
                            <span>🌱</span>
                            Seed Sample
                        </button>
                        <button
                            onClick={handleAddNew}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                        >
                            + Add New Item
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl leading-5 bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Find pricing item by SKU or description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {selectedIds.size > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between shadow-sm gap-4">
                                <div className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                    {selectedIds.size} item(s) selected
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                                    >
                                        Delete Selected
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                        <PricingTable
                            data={filteredData}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                        />
                    </>
                )}
            </main>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <PricingModal
                    isOpen={isModalOpen}
                    item={selectedItem}
                    onClose={handleClose}
                    onSave={fetchData}
                />
            )}
        </div>
    );
}
