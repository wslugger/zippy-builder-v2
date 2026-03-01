import { BOMLogicRule } from "@/src/lib/types";

interface RuleListProps {
    rules: BOMLogicRule[];
    onEdit: (rule: BOMLogicRule) => void;
    onDelete: (ruleId: string) => void;
}

export default function RuleList({ rules, onEdit, onDelete }: RuleListProps) {
    if (rules.length === 0) {
        return (
            <div className="bg-white border rounded shadow-sm p-10 text-center text-slate-500 italic">
                No rules found for this category.
            </div>
        );
    }

    return (
        <div className="bg-white border rounded shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rule Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conditions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        <th className="px-6 py-3 right text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Manage</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {rules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {rule.priority}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-bold text-slate-900">{rule.name}</div>
                                {rule.description && (
                                    <div className="text-xs text-blue-600 italic max-w-sm truncate" title={rule.description}>
                                        {rule.description}
                                    </div>
                                )}
                                <div className="text-[10px] text-slate-400 font-mono">{rule.id}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-[10px] font-mono whitespace-pre text-zinc-600 max-w-xs overflow-hidden text-ellipsis h-12">
                                    {JSON.stringify(rule.condition, null, 2)}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                    {rule.actions.map((a, i) => {
                                        if (a.type === 'require_triage') {
                                            const severityColor = a.severity === 'high' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200';
                                            return (
                                                <span key={i} className={`px-2 py-0.5 rounded text-[10px] border font-medium ${severityColor}`} title={a.reason}>
                                                    ⚠️ Guardrail: {a.reason?.substring(0, 30)}{a.reason && a.reason.length > 30 ? '...' : ''}
                                                </span>
                                            );
                                        }
                                        return (
                                            <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] border border-blue-100 font-medium">
                                                {a.type}: {a.targetId} {a.actionValue !== undefined ? (typeof a.actionValue === 'object' ? 'f(x)' : `= ${a.actionValue}`) : ""} {a.quantity ? `(x${a.quantity})` : ''} {a.quantityMultiplierField ? `(* ${a.quantityMultiplierField})` : ''}
                                            </span>
                                        );
                                    })}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                    onClick={() => onEdit(rule)}
                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm("Are you sure you want to delete this rule?")) {
                                            onDelete(rule.id);
                                        }
                                    }}
                                    className="text-red-600 hover:text-red-900"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
