"use client";

import { EQUIPMENT_PURPOSES as DEFAULT_PURPOSES, VENDOR_IDS, VENDOR_LABELS } from "@/src/lib/types";
import { useCatalogMetadata } from "@/src/hooks/useCatalogMetadata";

interface EquipmentFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    selectedVendor: string | null;
    onVendorChange: (value: string | null) => void;
    selectedPurpose: string | null;
    onPurposeChange: (value: string | null) => void;
}

export default function EquipmentFilters({
    search,
    onSearchChange,
    selectedVendor,
    onVendorChange,
    selectedPurpose,
    onPurposeChange,
}: EquipmentFiltersProps) {
    const { metadata } = useCatalogMetadata("equipment_catalog");
    const activePurposes = metadata?.fields?.purposes?.values || DEFAULT_PURPOSES;
    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg
                            className="h-4 w-4 text-zinc-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search models..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    />
                </div>

                {/* Purpose Dropdown (as Tabs) */}
                <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
                    <button
                        onClick={() => onPurposeChange(null)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${selectedPurpose === null
                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                            }`}
                    >
                        All
                    </button>
                    {activePurposes.map((purpose) => (
                        <button
                            key={purpose}
                            onClick={() => onPurposeChange(purpose)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${selectedPurpose === purpose
                                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                }`}
                        >
                            {purpose}
                        </button>
                    ))}
                </div>
            </div>

            {/* Vendor Pills */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => onVendorChange(null)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${selectedVendor === null
                        ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white"
                        : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-black dark:text-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700"
                        }`}
                >
                    All Vendors
                </button>
                {VENDOR_IDS.map((vendor) => (
                    <button
                        key={vendor}
                        onClick={() => onVendorChange(vendor)}
                        className={`px-3 py-1 text-xs rounded-full border transition-all ${selectedVendor === vendor
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-black dark:text-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700"
                            }`}
                    >
                        {VENDOR_LABELS[vendor]}
                    </button>
                ))}
            </div>
        </div>
    );
}
