/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { Equipment, VENDOR_LABELS, EQUIPMENT_PURPOSES } from "@/src/lib/types";
import { getEquipmentRole } from "@/src/lib/bom-utils";

interface EquipmentTableProps {
    data: Equipment[];
    onEdit: (item: Equipment) => void;
    onDelete: (id: string) => void;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
    onBulkDelete?: (ids: Set<string>) => void;
}

function AttributeCell({ attributes, role }: { attributes: any, role: string }) {
    // Safely parse attributes object
    const data = typeof attributes === 'string'
        ? (() => { try { return JSON.parse(attributes); } catch { return {}; } })()
        : (attributes || {});

    // We want 2-3 key attributes as pills
    const keyAttrs: { label: string; value: string }[] = [];

    if (role === 'WAN') {
        if (data.rawFirewallThroughputMbps) keyAttrs.push({ label: 'Firewall', value: `${data.rawFirewallThroughputMbps} Mbps` });
        if (data.sdwanCryptoThroughputMbps) keyAttrs.push({ label: 'Crypto', value: `${data.sdwanCryptoThroughputMbps} Mbps` });
        if (data.wanPortCount !== undefined) {
            const wanType = data.wanPortType ? ` ${data.wanPortType.replace('-Copper', 'C').replace('-Fiber', 'F')}` : '';
            const lanType = data.lanPortType ? ` ${data.lanPortType.replace('-Copper', 'C').replace('-Fiber', 'F')}` : '';
            keyAttrs.push({ label: 'Ports', value: `${data.wanPortCount}W${wanType} / ${data.lanPortCount || 0}L${lanType}` });
        }
    } else if (role === 'LAN') {
        if (data.accessPortCount) {
            keyAttrs.push({ label: 'Ports', value: `${data.accessPortCount}x ${data.accessPortType ? data.accessPortType.replace('-Copper', ' Copper').replace('-Fiber', ' Fiber') : 'Port'}` });
        } else if (data.ports) {
            keyAttrs.push({ label: 'Ports', value: `${data.ports} Ports` });
        }
        if (data.poeBudgetWatts !== undefined || data.poe_budget !== undefined) keyAttrs.push({ label: 'PoE', value: `${data.poeBudgetWatts ?? data.poe_budget}W` });
        if (data.isStackable || data.stackable) keyAttrs.push({ label: 'Stackable', value: 'Yes' });
    } else if (role === 'WLAN') {
        const wifi = data.wifiStandard || data.wifi_standard;
        const mimo = data.mimoBandwidth || data.mimo;
        if (wifi) keyAttrs.push({ label: 'Wi-Fi', value: wifi });
        if (mimo) keyAttrs.push({ label: 'MIMO', value: mimo });
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
                {keyAttrs.map((attr, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        <span className="opacity-60 mr-1">{attr.label}:</span>
                        {attr.value}
                    </span>
                ))}
            </div>

            <details className="group mt-1">
                <summary className="text-[10px] cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium list-none flex items-center gap-1 transition-colors">
                    <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Expand Data
                </summary>
                <div className="mt-2 p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded border border-zinc-100 dark:border-zinc-800 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 max-w-xs overflow-x-auto">
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                </div>
            </details>
        </div>
    );
}

export default function EquipmentTable({ data, onEdit, onDelete, selectedIds = new Set(), onSelectionChange, onBulkDelete }: EquipmentTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const lowerSearch = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                item.model.toLowerCase().includes(lowerSearch) ||
                (item.make || "").toLowerCase().includes(lowerSearch) ||
                item.id.toLowerCase().includes(lowerSearch);

            const matchesCategory = categoryFilter === "All" ||
                item.primary_purpose === categoryFilter ||
                item.primary_purpose?.toLowerCase() === categoryFilter.toLowerCase() ||
                getEquipmentRole(item) === categoryFilter ||
                (item.additional_purposes || []).some(p => p === categoryFilter || p.toLowerCase() === categoryFilter.toLowerCase()) ||
                (item.mapped_services || []).some(s => s === categoryFilter || s.toLowerCase() === categoryFilter.toLowerCase());

            return matchesSearch && matchesCategory;
        });
    }, [data, searchQuery, categoryFilter]);

    return (
        <div className="space-y-4">
            {/* Search and Filtering Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-4 max-w-2xl">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by make, model, or part number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="py-2 pl-3 pr-8 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 auto-cols-auto"
                    >
                        <option value="All">All Categories</option>
                        {EQUIPMENT_PURPOSES.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => {
                                if (onBulkDelete && confirm(`Are you sure you want to delete ${selectedIds.size} selected items?`)) {
                                    onBulkDelete(selectedIds);
                                } else if (!onBulkDelete) {
                                    // Fallback if not provided by parent, loop through deletes
                                    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected items?`)) {
                                        Array.from(selectedIds).forEach(id => onDelete(id));
                                        if (onSelectionChange) onSelectionChange(new Set());
                                    }
                                }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50 dark:hover:bg-red-900/40 transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 font-medium">
                            <tr>
                                {onSelectionChange && (
                                    <th className="px-6 py-4 w-12">
                                        <input
                                            type="checkbox"
                                            checked={filteredData.length > 0 && selectedIds.size === filteredData.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    onSelectionChange(new Set(filteredData.map((d) => d.id)));
                                                } else {
                                                    onSelectionChange(new Set());
                                                }
                                            }}
                                            className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-blue-500"
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-4">Model</th>
                                <th className="px-6 py-4">Vendor</th>
                                <th className="px-6 py-4">Purpose</th>
                                <th className="px-6 py-4">Mapped Services</th>
                                <th className="px-6 py-4 w-64 max-w-sm">Attributes</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <p className="text-zinc-500 dark:text-zinc-400">No equipment found matching criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => onEdit(item)}
                                        className="group cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors duration-200"
                                    >
                                        {onSelectionChange && (
                                            <td className="px-6 py-4 w-12" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={(e) => {
                                                        const newSet = new Set(selectedIds);
                                                        if (e.target.checked) {
                                                            newSet.add(item.id);
                                                        } else {
                                                            newSet.delete(item.id);
                                                        }
                                                        onSelectionChange(newSet);
                                                    }}
                                                    className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-blue-500"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                                {item.model}
                                                <div className="flex gap-1">
                                                    {getEquipmentRole(item) === 'WAN' && (
                                                        <>
                                                            {(item.specs as any).integrated_cellular && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800" title="Integrated Cellular">
                                                                    {(item.specs as any).cellular_type || "LTE"}
                                                                </span>
                                                            )}
                                                            {(item.specs as any).integrated_wifi && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800" title="Integrated Wi-Fi">
                                                                    {(item.specs as any).wifi_standard?.replace("Wi-Fi ", "W") || "WIFI"}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-500">{item.family}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <VendorBadge vendorId={item.vendor_id} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(() => {
                                                    const itemWithAny = item as any;
                                                    const purposes = [
                                                        itemWithAny.primary_purpose,
                                                        ...(itemWithAny.additional_purposes || [])
                                                    ].filter((p): p is string => Boolean(p) && EQUIPMENT_PURPOSES.includes(p as any));

                                                    return purposes.map((p) => (
                                                        <span key={p} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                                                            {p}
                                                        </span>
                                                    ));
                                                })()}
                                                {item.managementSize && item.managementSize !== 'None' && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800" title="Management Size">
                                                        {item.managementSize} Mgt
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(item.mapped_services || []).map((s) => (
                                                    <span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                                        {s}
                                                    </span>
                                                ))}
                                                {(!item.mapped_services || item.mapped_services.length === 0) && (
                                                    <span className="text-[10px] text-zinc-400 italic">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <AttributeCell attributes={item.specs} role={getEquipmentRole(item)} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={item.status || "Supported"} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Are you sure you want to delete ${item.model}?`)) {
                                                        onDelete(item.id);
                                                    }
                                                }}
                                                className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                title="Delete"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        "Supported": "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
        "In development": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
        "Not supported": "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[status] || "bg-zinc-100 text-zinc-800 border-zinc-200"}`}>
            {status}
        </span>
    );
}

function VendorBadge({ vendorId }: { vendorId: string }) {
    const colors: Record<string, string> = {
        cisco_catalyst: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
        meraki: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
        hpe_aruba_sdwan: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
        hpe_aruba_sdbranch: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${colors[vendorId] || "bg-zinc-100 text-zinc-800 border-zinc-200"}`}>
            {VENDOR_LABELS[vendorId as keyof typeof VENDOR_LABELS] || vendorId}
        </span>
    );
}
