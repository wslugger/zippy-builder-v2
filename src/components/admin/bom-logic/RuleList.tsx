import { BOMLogicRule } from "@/src/lib/types";
import { formatLogicCondition } from "@/src/lib/bom-utils";

interface RuleListProps {
    rules: BOMLogicRule[];
    onEdit: (rule: BOMLogicRule) => void;
    onDelete: (ruleId: string) => void;
}

const SOURCE_BADGE: Record<NonNullable<BOMLogicRule["source"]>, { label: string; icon: string; className: string }> = {
    seed: { label: "Seed", icon: "🌱", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    "ai-generated": { label: "AI", icon: "✨", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    intent: { label: "Intent", icon: "🎯", className: "bg-blue-50 text-blue-700 border-blue-200" },
    manual: { label: "Manual", icon: "✏️", className: "bg-slate-50 text-slate-600 border-slate-200" },
};

export default function RuleList({ rules, onEdit, onDelete }: RuleListProps) {
    if (rules.length === 0) {
        return (
            <div className="bg-white border rounded-xl shadow-sm p-10 text-center text-slate-500 italic">
                No rules found for this category.
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-16">Priority</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rule Name</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Human Translation / Description</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Manage</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                    {rules.map((rule) => {
                        const sourceBadge = rule.source ? SOURCE_BADGE[rule.source] : null;
                        const isSeed = rule.source === "seed";

                        return (
                            <tr key={rule.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-5 py-4 text-center">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                                        {rule.priority}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-bold text-slate-900 text-sm">{rule.name}</span>
                                        {sourceBadge && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sourceBadge.className}`}>
                                                {sourceBadge.icon} {sourceBadge.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-zinc-300 font-mono mt-1">{rule.id}</div>
                                </td>
                                <td className="px-5 py-4 max-w-sm">
                                    <div className="text-sm font-medium text-slate-900 leading-snug">
                                        {rule.description || formatLogicCondition(rule.condition)}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 mt-1 truncate max-w-[280px]" title={JSON.stringify(rule.condition, null, 2)}>
                                        Logic: {JSON.stringify(rule.condition)}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {rule.actions.map((a, i) => {
                                            if (a.type === "require_triage") {
                                                const severityColor =
                                                    a.severity === "high"
                                                        ? "bg-red-100 text-red-800 border-red-200"
                                                        : a.severity === "low"
                                                            ? "bg-slate-100 text-slate-700 border-slate-200"
                                                            : "bg-amber-100 text-amber-800 border-amber-200";
                                                return (
                                                    <span key={i} className={`px-2 py-0.5 rounded text-[10px] border font-medium ${severityColor}`} title={a.reason}>
                                                        ⚠️ {a.severity}: {a.reason?.substring(0, 28)}{a.reason && a.reason.length > 28 ? "…" : ""}
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] border border-blue-100 font-medium">
                                                    {a.type}: {a.targetId}{a.actionValue !== undefined ? (typeof a.actionValue === "object" ? " f(x)" : ` = ${a.actionValue}`) : ""}{a.quantity ? ` ×${a.quantity}` : ""}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                    <button
                                        onClick={() => onEdit(rule)}
                                        className="text-blue-600 hover:text-blue-900 font-semibold text-xs"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            const label = isSeed
                                                ? `"${rule.name}" is a seed rule. Deleting it will require re-seeding to restore it. Continue?`
                                                : `Delete rule "${rule.name}"?`;
                                            if (confirm(label)) onDelete(rule.id);
                                        }}
                                        className={`font-semibold text-xs ${isSeed ? "text-slate-400 hover:text-red-500" : "text-red-500 hover:text-red-700"}`}
                                        title={isSeed ? "Seed rule — reseedable via Reset Verified Defaults" : "Delete"}
                                    >
                                        {isSeed ? "🌱 Delete" : "Delete"}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
