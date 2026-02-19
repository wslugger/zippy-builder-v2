"use client";

import { useState } from "react";
import { Equipment } from "@/src/lib/types";
import { useEquipment } from "@/src/hooks/useEquipment";
import EquipmentTable from "@/src/components/admin/EquipmentTable";
import EquipmentFilters from "@/src/components/admin/EquipmentFilters";
import EquipmentModal from "@/src/components/admin/EquipmentModal";
import Link from "next/link";

export default function CatalogPage() {
    const { equipment: data, loading, refreshEquipment: fetchData } = useEquipment();

    // Filter States
    const [search, setSearch] = useState("");
    const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
    const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);

    // Filter Logic
    const filteredData = data.filter((item) => {
        const lowerSearch = search.toLowerCase();
        const matchesSearch = item.model.toLowerCase().includes(lowerSearch) ||
            item.description?.toLowerCase().includes(lowerSearch) ||
            item.id.toLowerCase().includes(lowerSearch) ||
            (lowerSearch === "cellular" || lowerSearch === "lte" || lowerSearch === "5g" ? item.specs.integrated_cellular : false) ||
            (lowerSearch === "wifi" || lowerSearch === "wireless" ? item.specs.integrated_wifi : false) ||
            item.specs.cellular_type?.toLowerCase().includes(lowerSearch) ||
            item.specs.wifi_standard?.toLowerCase().includes(lowerSearch) ||
            item.status?.toLowerCase().includes(lowerSearch);
        const matchesVendor = selectedVendor ? item.vendor_id === selectedVendor : true;
        const matchesPurpose = selectedPurpose
            ? Array.isArray(item.purpose)
                ? (item.purpose as string[]).includes(selectedPurpose)
                : (item.purpose as string) === selectedPurpose
            : true;

        return matchesSearch && matchesVendor && matchesPurpose;
    });

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
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to delete equipment");
        }
    };

    return (
        <div className="">

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Equipment Catalog</h1>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">Manage standard hardware profiles and specifications.</p>
                    </div>
                    <Link
                        href="/admin/ingest"
                        className="inline-flex items-center justify-center rounded-md bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 shadow-sm hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                    >
                        + Add Equipment
                    </Link>
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
                    <EquipmentTable data={filteredData} onEdit={handleEdit} onDelete={handleDelete} />
                )}
            </main>

            {/* Edit Modal */}
            {selectedItem && isModalOpen && (
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
