import { useState, useEffect } from "react";
import { BOMLogicRule, LogicCondition, BOMLogicAction } from "@/src/lib/types";

interface RuleEditorModalProps {
    isOpen: boolean;
    ruleToEdit: BOMLogicRule | null;
    serviceCategory: "managed_sdwan" | "managed_lan" | "managed_wifi";
    onClose: () => void;
    onSave: (rule: BOMLogicRule) => Promise<void>;
}

export default function RuleEditorModal({
    isOpen,
    ruleToEdit,
    serviceCategory,
    onClose,
    onSave,
}: RuleEditorModalProps) {
    const [rule, setRule] = useState<BOMLogicRule>({
        id: "",
        name: "",
        priority: 10,
        conditions: [
            { field: "serviceId", operator: "equals", value: serviceCategory },
        ],
        actions: [],
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (ruleToEdit) {
            setRule(ruleToEdit);
        } else {
            setRule({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
                name: "",
                priority: 10,
                conditions: [
                    { field: "serviceId", operator: "equals", value: serviceCategory },
                ],
                actions: [],
            });
        }
    }, [ruleToEdit, isOpen, serviceCategory]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(rule);
            onClose();
        } catch (err) {
            alert("Failed to save rule.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const addCondition = () => {
        setRule({
            ...rule,
            conditions: [...rule.conditions, { field: "bandwidthDownMbps", operator: "equals", value: "" }],
        });
    };

    const updateCondition = (index: number, updates: Partial<LogicCondition>) => {
        const newConditions = [...rule.conditions];
        newConditions[index] = { ...newConditions[index], ...updates } as LogicCondition;
        // Fix up numeric vs string
        if (updates.value !== undefined) {
            if (updates.operator?.includes("than") || newConditions[index].operator.includes("than")) {
                newConditions[index].value = Number(updates.value);
            }
        }
        setRule({ ...rule, conditions: newConditions });
    };

    const removeCondition = (index: number) => {
        setRule({
            ...rule,
            conditions: rule.conditions.filter((_, i) => i !== index),
        });
    };

    const addAction = () => {
        setRule({
            ...rule,
            actions: [...rule.actions, { type: "select_equipment", targetId: "" }],
        });
    };

    const updateAction = (index: number, updates: Partial<BOMLogicAction>) => {
        const newActions = [...rule.actions];
        newActions[index] = { ...newActions[index], ...updates } as BOMLogicAction;
        setRule({ ...rule, actions: newActions });
    };

    const removeAction = (index: number) => {
        setRule({
            ...rule,
            actions: rule.actions.filter((_, i) => i !== index),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">
                        {ruleToEdit ? "Edit Rule" : "Create New Rule"}
                    </h2>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    <form id="rule-form" onSubmit={handleSave} className="space-y-6">
                        <section className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Rule Name
                                </label>
                                <input
                                    type="text"
                                    value={rule.name}
                                    onChange={(e) => setRule({ ...rule, name: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Priority (Higher number = evaluated first)
                                </label>
                                <input
                                    type="number"
                                    value={rule.priority}
                                    onChange={(e) => setRule({ ...rule, priority: parseInt(e.target.value) || 0 })}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800">Conditions</h3>
                                <button type="button" onClick={addCondition} className="text-sm text-blue-600 hover:text-blue-800">+ Add Condition</button>
                            </div>
                            <div className="space-y-2 border rounded p-4 bg-slate-50">
                                {rule.conditions.map((c, i) => (
                                    <div key={i} className="flex flex-wrap md:flex-nowrap gap-2 items-center">
                                        <input
                                            type="text"
                                            value={c.field}
                                            onChange={(e) => updateCondition(i, { field: e.target.value as keyof import("@/src/lib/types").Site | "packageId" | "serviceId" | "designOptionId" })}
                                            className="flex-1 border rounded px-2 py-1 text-sm"
                                            placeholder="Field name (e.g., bandwidthDownMbps)"
                                            required
                                        />
                                        <select
                                            value={c.operator}
                                            onChange={(e) => updateCondition(i, { operator: e.target.value as import("@/src/lib/types").LogicOperator })}
                                            className="flex-1 border rounded px-2 py-1 text-sm bg-white"
                                        >
                                            <option value="equals">equals</option>
                                            <option value="not_equals">not equals</option>
                                            <option value="greater_than">&gt;</option>
                                            <option value="less_than">&lt;</option>
                                            <option value="contains">contains</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={String(c.value)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // auto convert to number if possible and not empty
                                                const numVal = Number(val);
                                                updateCondition(i, { value: (isNaN(numVal) || val === '') ? val : numVal });
                                            }}
                                            className="flex-1 border rounded px-2 py-1 text-sm"
                                            placeholder="Value"
                                            required
                                        />
                                        <button type="button" onClick={() => removeCondition(i)} className="p-1 text-red-500 hover:text-red-700">✕</button>
                                    </div>
                                ))}
                                {rule.conditions.length === 0 && <span className="text-sm text-slate-500">No conditions. Adding an action applies to all matching the service type.</span>}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800">Actions</h3>
                                <button type="button" onClick={addAction} className="text-sm text-blue-600 hover:text-blue-800">+ Add Action</button>
                            </div>
                            <div className="space-y-4 border rounded p-4 bg-slate-50">
                                {rule.actions.map((a, i) => (
                                    <div key={i} className="space-y-2 p-3 border border-slate-200 rounded bg-white relative">
                                        <button type="button" onClick={() => removeAction(i)} className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 text-sm">✕</button>
                                        <div className="flex gap-2">
                                            <select
                                                value={a.type}
                                                onChange={(e) => updateAction(i, { type: e.target.value as import("@/src/lib/types").BOMLogicAction["type"] })}
                                                className="w-1/3 border rounded px-2 py-1 text-sm"
                                            >
                                                <option value="select_equipment">Select Equipment</option>
                                                <option value="enable_feature">Enable Feature</option>
                                                <option value="set_configuration">Set Configuration</option>
                                                <option value="set_parameter">Set Parameter</option>
                                                <option value="modify_quantity">Modify Quantity</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={a.targetId}
                                                onChange={(e) => updateAction(i, { targetId: e.target.value })}
                                                className="flex-1 border rounded px-2 py-1 text-sm"
                                                placeholder="Target ID (e.g. meraki_mx85, or default_uplink)"
                                                required
                                            />
                                        </div>
                                        {(a.type === 'set_parameter' || a.type === 'set_configuration') && (
                                            <div>
                                                <input
                                                    type="text"
                                                    value={String(a.actionValue || '')}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const numVal = Number(val);
                                                        updateAction(i, { actionValue: (isNaN(numVal) || val === '') ? val : numVal });
                                                    }}
                                                    className="w-full border rounded px-2 py-1 text-sm"
                                                    placeholder="Action Value (e.g., 10GbE or true)"
                                                    required
                                                />
                                            </div>
                                        )}
                                        {(a.type !== 'set_parameter') && (
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={a.quantity || ''}
                                                    onChange={(e) => updateAction(i, { quantity: parseInt(e.target.value) || undefined })}
                                                    className="w-1/2 border rounded px-2 py-1 text-sm"
                                                    placeholder="Fixed Quantity (Optional)"
                                                />
                                                <input
                                                    type="text"
                                                    value={a.quantityMultiplierField || ''}
                                                    onChange={(e) => updateAction(i, { quantityMultiplierField: (e.target.value as keyof import("@/src/lib/types").Site) || undefined })}
                                                    className="flex-1 border rounded px-2 py-1 text-sm"
                                                    placeholder="Multiplier Field (Optional, e.g. indoorAPs)"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </form>
                </div>

                <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-700 bg-white border rounded hover:bg-slate-100"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="rule-form"
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save Rule"}
                    </button>
                </div>
            </div>
        </div>
    );
}
