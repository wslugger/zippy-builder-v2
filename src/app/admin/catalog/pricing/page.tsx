"use client";
import { useState, useMemo } from "react";
import { PricingItem } from "@/src/lib/types";
import { usePricing } from "@/src/hooks/usePricing";
import PricingTable from "@/src/components/admin/PricingTable";
import PricingModal from "@/src/components/admin/PricingModal";

export default function PricingCatalogPage() {
    const { pricingItems: data, loading, refreshPricingItems: fetchData } = usePricing();

    // Filter States
    const [search, setSearch] = useState("");
    const [isSyncingHw, setIsSyncingHw] = useState<string | null>(null);
    const [isSyncingLic, setIsSyncingLic] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PricingItem | null>(null);

    // Bulk Edit State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Memoized Filter Logic
    const filteredData = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return data.filter((item) => {
            return (item.id || "").toLowerCase().includes(lowerSearch) ||
                (item.description || "").toLowerCase().includes(lowerSearch);
        });
    }, [data, search]);

    // Paginated Data
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const handleSyncHardware = async (category: string) => {
        if (!confirm(`Step 1: This will generate Hardware SKUs and Pricing for all ${category} equipment using AI. This ensures the base units have prices. Continue?`)) return;

        setIsSyncingHw(category);
        try {
            const res = await fetch("/api/admin/pricing/sync-hardware", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category })
            });
            const result = await res.json();
            if (res.ok) {
                alert(`Hardware Sync complete: ${result.count} devices processed.`);
                fetchData();
            } else {
                alert(`Sync failed: ${result.error}`);
            }
        } catch (e) {
            console.error(e);
            alert("Hardware Sync error occurred.");
        } finally {
            setIsSyncingHw(null);
        }
    };

    const handleSyncLicensing = async (category: string) => {
        if (!confirm(`Step 2: This will generate and attach Licensing SKUs for all ${category} equipment in the catalog. This ensures devices have valid Software/Support tiers. Continue?`)) return;

        setIsSyncingLic(category);
        try {
            const res = await fetch("/api/admin/pricing/sync-category", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category })
            });
            const result = await res.json();
            if (res.ok) {
                alert(`Licensing Sync complete: ${result.count} devices processed.`);
                fetchData();
            } else {
                alert(`Sync failed: ${result.error}`);
            }
        } catch (e) {
            console.error(e);
            alert("Licensing Sync error occurred.");
        } finally {
            setIsSyncingLic(null);
        }
    };

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
                if (res.ok) successCount++;
                else errorCount++;
            } catch (e) {
                errorCount++;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (errorCount > 0) alert(`Finished: ${successCount} successful, ${errorCount} failed.`);
        else alert(`Successfully deleted ${successCount} items.`);

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
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">
                            Pricing <span className="text-blue-500">Catalog</span>
                        </h1>
                        <p className="text-zinc-400 mt-2 max-w-xl">
                            Manage independent pricing SKUs. Use the AI Sync tools below to automatically link equipment to catalog prices and discover appropriate licensing.
                        </p>

                        <div className="space-y-4 mt-6">
                            {(['WAN', 'LAN', 'WLAN'] as const).map(cat => (
                                <div key={cat} className="flex flex-col gap-2 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">{cat} Category</h3>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {/* Step 1: Hardware */}
                                        <button
                                            onClick={() => handleSyncHardware(cat)}
                                            disabled={isSyncingHw !== null || isSyncingLic !== null}
                                            className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${isSyncingHw === cat
                                                ? 'bg-blue-600 border-blue-500 text-white animate-pulse'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-blue-500/50 hover:text-blue-400'
                                                }`}
                                        >
                                            {isSyncingHw === cat ? (
                                                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <span className="opacity-70 font-mono text-[10px] bg-white/5 px-1 rounded">1</span>
                                            )}
                                            Sync {cat} Hardware
                                        </button>

                                        {/* Step 2: Licensing */}
                                        <button
                                            onClick={() => handleSyncLicensing(cat)}
                                            disabled={isSyncingHw !== null || isSyncingLic !== null}
                                            className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${isSyncingLic === cat
                                                ? 'bg-purple-600 border-purple-500 text-white animate-pulse'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-purple-500/50 hover:text-purple-400'
                                                }`}
                                        >
                                            {isSyncingLic === cat ? (
                                                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <span className="opacity-70 font-mono text-[10px] bg-white/5 px-1 rounded">2</span>
                                            )}
                                            Sync {cat} Licensing
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={handleSeed}
                            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl text-sm font-bold transition-all border border-zinc-800 flex items-center gap-2"
                        >
                            <span>🌱</span>
                            Seed Catalog
                        </button>
                        <button
                            onClick={handleAddNew}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-900/40 active:scale-95 border border-blue-400/20"
                        >
                            + Add New SKU
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
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
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
                            data={paginatedData}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                        />

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-4 py-3 sm:px-6 rounded-b-xl">
                                <div className="flex flex-1 justify-between sm:hidden">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative ml-3 inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-400">
                                            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of{' '}
                                            <span className="font-medium">{filteredData.length}</span> results
                                        </p>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                            className="text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            <option value={25}>25 per page</option>
                                            <option value={50}>50 per page</option>
                                            <option value={100}>100 per page</option>
                                            <option value={250}>250 per page</option>
                                        </select>
                                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                            >
                                                <span className="sr-only">Previous</span>
                                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01.02 1.06L8.832 10l3.978 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            <div className="px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-white ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700">
                                                Page {currentPage} of {totalPages}
                                            </div>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                            >
                                                <span className="sr-only">Next</span>
                                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.19 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
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
