import { PricingItem } from '@/src/lib/types';

interface PricingTableProps {
    data: PricingItem[];
    onEdit: (item: PricingItem) => void;
    onDelete: (id: string) => void;
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
}

export default function PricingTable({
    data,
    onEdit,
    onDelete,
    selectedIds,
    onSelectionChange,
}: PricingTableProps) {
    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
                <p className="text-zinc-500 dark:text-zinc-400">No pricing items found.</p>
            </div>
        );
    }

    const toggleAll = () => {
        if (selectedIds.size === data.length) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(data.map((d) => d.id)));
        }
    };

    const toggleRow = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        onSelectionChange(next);
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left">
                                <input
                                    type="checkbox"
                                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                    checked={data.length > 0 && selectedIds.size === data.length}
                                    onChange={toggleAll}
                                />
                            </th>
                            <th scope="col" className="px-6 py-4 text-left font-semibold text-zinc-900 dark:text-zinc-100">
                                SKU
                            </th>
                            <th scope="col" className="px-6 py-4 text-left font-semibold text-zinc-900 dark:text-zinc-100">
                                Description
                            </th>
                            <th scope="col" className="px-6 py-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                                List Price
                            </th>
                            <th scope="col" className="px-6 py-4 text-left font-semibold text-zinc-900 dark:text-zinc-100">
                                EoS Date
                            </th>
                            <th scope="col" className="px-6 py-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {data.map((item) => (
                            <tr
                                key={item.id}
                                className={`group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${
                                    selectedIds.has(item.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                }`}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                        checked={selectedIds.has(item.id)}
                                        onChange={() => toggleRow(item.id)}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                                    {item.id}
                                </td>
                                <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 max-w-xs truncate" title={item.description}>
                                    {item.description || "—"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-zinc-900 dark:text-zinc-100 font-medium">
                                    {typeof item.listPrice === 'number'
                                        ? `$${item.listPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                                        : "—"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {item.eosDate ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-400">
                                            {item.eosDate}
                                        </span>
                                    ) : (
                                        <span className="text-zinc-400">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                                    <button
                                        onClick={() => onEdit(item)}
                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Delete pricing item ${item.id}?`)) {
                                                onDelete(item.id);
                                            }
                                        }}
                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                    >
                                        Delete
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
