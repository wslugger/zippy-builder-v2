/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Equipment, VENDOR_LABELS } from "@/src/lib/types";
import { useEquipment } from "@/src/hooks/useEquipment";
import { useCatalogMetadata } from "@/src/hooks";
import EquipmentTable from "@/src/components/admin/EquipmentTable";
import EquipmentFilters from "@/src/components/admin/EquipmentFilters";
import EquipmentModal from "@/src/components/admin/EquipmentModal";

export default function CatalogPage() {
    const { equipment: data, loading, refreshEquipment: fetchData } = useEquipment();
    const { metadata, isLoading: isMetadataLoading } = useCatalogMetadata();

    // Filter States
    const [search, setSearch] = useState("");
    const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
    const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);

    // Bulk Edit State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkVendor, setBulkVendor] = useState<string>("");
    const [bulkPurpose, setBulkPurpose] = useState<string>("");
    const [bulkStatus, setBulkStatus] = useState<string>("");
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Filter Logic
    const filteredData = data.filter((item) => {
        const lowerSearch = search.toLowerCase();
        const matchesSearch = item.model.toLowerCase().includes(lowerSearch) ||
            item.description?.toLowerCase().includes(lowerSearch) ||
            item.id.toLowerCase().includes(lowerSearch) ||
            (lowerSearch === "cellular" || lowerSearch === "lte" || lowerSearch === "5g" ? (item as any).specs.integrated_cellular : false) ||
            (lowerSearch === "wifi" || lowerSearch === "wireless" ? (item as any).specs.integrated_wifi : false) ||
            (item as any).specs.cellular_type?.toLowerCase().includes(lowerSearch) ||
            (item as any).specs.wifi_standard?.toLowerCase().includes(lowerSearch) ||
            item.status?.toLowerCase().includes(lowerSearch);
        const matchesVendor = selectedVendor
            ? (item.vendor_id === selectedVendor || VENDOR_LABELS[item.vendor_id as keyof typeof VENDOR_LABELS] === selectedVendor)
            : true;

        const itemWithAny = item as any;
        const matchesPurpose = selectedPurpose
            ? (
                itemWithAny.primary_purpose === selectedPurpose ||
                (itemWithAny.additional_purposes || []).includes(selectedPurpose) ||
                // Handle case where purpose might be different in taxonomy vs stored values
                itemWithAny.primary_purpose?.toLowerCase() === selectedPurpose.toLowerCase()
            )
            : true;

        return matchesSearch && matchesVendor && matchesPurpose;
    });

    const handleAddNew = () => {
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (item: Equipment) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch("/api/admin/catalog/delete", {
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
            alert("Failed to delete equipment");
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedIds.size === 0) return;
        if (!bulkVendor && !bulkPurpose && !bulkStatus) {
            alert("Please select at least one field to update.");
            return;
        }

        if (!confirm(`Are you sure you want to update ${selectedIds.size} items?`)) return;

        setIsBulkUpdating(true);
        let successCount = 0;
        let errorCount = 0;

        for (const id of Array.from(selectedIds)) {
            const item = data.find((d) => d.id === id);
            if (!item) continue;

            const updatedItem = { ...item };
            if (bulkVendor) updatedItem.vendor_id = bulkVendor as Equipment["vendor_id"];
            if (bulkStatus) updatedItem.status = bulkStatus as Equipment["status"];

            if (bulkPurpose) {
                (updatedItem as any).primary_purpose = bulkPurpose;
                // Auto-infer role if strictly mapping to standard ones
                const pLower = bulkPurpose.toLowerCase();
                if (pLower.includes("wlan") || pLower.includes("ap")) {
                    updatedItem.role = "WLAN";
                } else if (pLower.includes("lan") || pLower.includes("switch")) {
                    updatedItem.role = "LAN";
                } else if (pLower.includes("sdwan") || pLower.includes("edge") || pLower.includes("gateway") || pLower.includes("router")) {
                    updatedItem.role = "WAN";
                }
            }

            try {
                const res = await fetch("/api/admin/catalog/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ equipment: updatedItem }),
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

        setIsBulkUpdating(false);
        if (errorCount > 0) {
            alert(`Finished: ${successCount} successful, ${errorCount} failed.`);
        } else {
            alert(`Successfully updated ${successCount} items.`);
        }

        setSelectedIds(new Set());
        setBulkVendor("");
        setBulkPurpose("");
        setBulkStatus("");
        fetchData();
    };

    return (
        <div className="">

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Equipment Catalog</h1>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">Manage standard hardware profiles and specifications.</p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="inline-flex items-center justify-center rounded-md bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 shadow-sm hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                    >
                        + Add Equipment
                    </button>
                </div>

                <EquipmentFilters
                    search={search}
                    onSearchChange={setSearch}
                    selectedVendor={selectedVendor}
                    onVendorChange={setSelectedVendor}
                    selectedPurpose={selectedPurpose}
                    onPurposeChange={setSelectedPurpose}
                />

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
                                    <select
                                        value={bulkVendor}
                                        onChange={(e) => setBulkVendor(e.target.value)}
                                        className="text-sm rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black py-1.5"
                                        disabled={isMetadataLoading}
                                    >
                                        <option value="">-- Change Vendor --</option>
                                        {metadata.vendors.map((v: string) => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                    <select
                                        value={bulkPurpose}
                                        onChange={(e) => setBulkPurpose(e.target.value)}
                                        className="text-sm rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black py-1.5"
                                        disabled={isMetadataLoading}
                                    >
                                        <option value="">-- Change Purpose --</option>
                                        {metadata.purposes.map((p: string) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <select
                                        value={bulkStatus}
                                        onChange={(e) => setBulkStatus(e.target.value)}
                                        className="text-sm rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black py-1.5"
                                    >
                                        <option value="">-- Change Status --</option>
                                        <option value="Supported">Supported</option>
                                        <option value="In development">In development</option>
                                        <option value="Not supported">Not supported</option>
                                    </select>
                                    <button
                                        onClick={handleBulkUpdate}
                                        disabled={isBulkUpdating || (!bulkVendor && !bulkPurpose && !bulkStatus)}
                                        className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                                    >
                                        {isBulkUpdating ? "Updating..." : "Apply Changes"}
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
                        <EquipmentTable
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
                <EquipmentModal
                    isOpen={isModalOpen}
                    equipment={selectedItem}
                    onClose={handleClose}
                    onSave={fetchData}
                />
            )}
        </div>
    );
}
