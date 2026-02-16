"use client";

import { useState, useEffect } from "react";
import { BOMService } from "@/src/lib/firebase";
import { BOMLogicRule } from "@/src/lib/bom-types";

export default function BOMRulesListPage() {
    const [rules, setRules] = useState<BOMLogicRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await BOMService.getAllRules();
            setRules(data);
        } catch (error) {
            console.error("Error loading rules:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRules();
    }, []);

    async function handleSeed() {
        if (!confirm("This will overwrite existing rules with defaults from code. Are you sure?")) return;
        setSeeding(true);
        try {
            const res = await fetch("/api/admin/seed");
            const json = await res.json();
            if (json.success) {
                alert("Seeding complete!");
                loadRules();
            } else {
                alert("Error seeding: " + json.error);
            }
        } catch (e) {
            alert("Error seeding database.");
        }
        setSeeding(false);
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">BOM Logic Rules</h1>
                    <p className="text-slate-500">Define rule-based equipment selection and configuration.</p>
                </div>
                <div className="space-x-4">
                    <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
                    >
                        {seeding ? "Seeding..." : "Reset Verified Defaults"}
                    </button>
                    <button
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded opacity-50 cursor-not-allowed"
                        disabled
                    >
                        + Create New Rule
                    </button>
                </div>
            </div>

            <div className="bg-white border rounded shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rule Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conditions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {rules.map((rule) => (
                            <tr key={rule.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {rule.priority}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-slate-900">{rule.name}</div>
                                    <div className="text-xs text-slate-500 font-mono">{rule.id}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {rule.conditions.map((c, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] border border-zinc-200">
                                                {c.field} {c.operator} {String(c.value)}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {rule.actions.map((a, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] border border-blue-100 font-medium">
                                                {a.type}: {a.targetId} {a.quantity ? `(x${a.quantity})` : ''}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {rules.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-slate-500 italic">
                                    No rules found. Click &quot;Reset Verified Defaults&quot; to seed the rule set.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
