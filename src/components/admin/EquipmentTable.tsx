/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Equipment, VENDOR_LABELS, EQUIPMENT_PURPOSES } from "@/src/lib/types";

interface EquipmentTableProps {
    data: Equipment[];
    onEdit: (item: Equipment) => void;
    onDelete: (id: string) => void;
}

export default function EquipmentTable({ data, onEdit, onDelete }: EquipmentTableProps) {
    if (data.length === 0) {
        return (
            <div className="text-center py-20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                <p className="text-zinc-500 dark:text-zinc-400">No equipment found matching your filters.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 font-medium">
                        <tr>
                            <th className="px-6 py-4">Model</th>
                            <th className="px-6 py-4">Vendor</th>
                            <th className="px-6 py-4">Purpose</th>
                            <th className="px-6 py-4">Key Specs</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {data.map((item) => (
                            <tr
                                key={item.id}
                                onClick={() => onEdit(item)}
                                className="group cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors duration-200"
                            >
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                        {item.model}
                                        <div className="flex gap-1">
                                            {item.role === 'WAN' && (
                                                <>
                                                    {item.specs.integrated_cellular && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800" title="Integrated Cellular">
                                                            {item.specs.cellular_type || "LTE"}
                                                        </span>
                                                    )}
                                                    {item.specs.integrated_wifi && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800" title="Integrated Wi-Fi">
                                                            {item.specs.wifi_standard?.replace("Wi-Fi ", "W") || "WIFI"}
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
                                            ].filter(Boolean);

                                            return purposes.map((p) => (
                                                <span key={p} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                                                    {p}
                                                </span>
                                            ));
                                        })()}                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                                        {item.role === 'WAN' && (
                                            <>
                                                {item.specs.ngfw_throughput_mbps && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="opacity-50">⚡</span>
                                                        Throughput: {item.specs.ngfw_throughput_mbps} Mbps
                                                    </div>
                                                )}
                                                {item.specs.vpn_throughput_mbps && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="opacity-50">🔒</span>
                                                        Crypto: {item.specs.vpn_throughput_mbps} Mbps
                                                    </div>
                                                )}
                                                {(item.specs as any).wanPortCount !== undefined && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="opacity-50">🔌</span>
                                                        Ports: {(item.specs as any).wanPortCount}W / {(item.specs as any).lanPortCount}L
                                                        {item.specs.poe_budget && item.specs.poe_budget > 0 && ` (${item.specs.poe_budget}W PoE)`}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {item.role === 'LAN' && (
                                            <>
                                                {item.specs.switching_capacity_gbps && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="opacity-50">⚡</span>
                                                        Capacity: {item.specs.switching_capacity_gbps} Gbps
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <span className="opacity-50">🔌</span>
                                                    Ports: {(item.specs as any).accessPortCount || 0}
                                                    {item.specs.poe_budget_watts && item.specs.poe_budget_watts > 0 && ` (${item.specs.poe_budget_watts}W PoE)`}
                                                </div>
                                                {item.specs.stackable && (
                                                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                                        <span className="opacity-50">📚</span>
                                                        Stackable: Yes
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {item.role === 'WLAN' && (
                                            <>
                                                {item.specs.wifi_standard && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="opacity-50">📡</span>
                                                        {item.specs.wifi_standard}
                                                    </div>
                                                )}
                                                {item.specs.mimo && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="opacity-50">📶</span>
                                                        {item.specs.mimo} MIMO
                                                    </div>
                                                )}
                                                {item.specs.max_concurrent_clients && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="opacity-50">👥</span>
                                                        Clients: {item.specs.max_concurrent_clients}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {item.role === 'SECURITY' && (
                                            <div className="flex items-center gap-1">
                                                <span className="opacity-50">🛡️</span>
                                                Security Appliance
                                            </div>
                                        )}
                                    </div>
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
                        ))}
                    </tbody>
                </table>
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
