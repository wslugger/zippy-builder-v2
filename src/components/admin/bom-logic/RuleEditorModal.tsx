import { useState, useEffect, useMemo } from "react";
import jsonLogic from "json-logic-js";
import { BOMLogicRule, BOMLogicAction, SYSTEM_PARAMETERS } from "@/src/lib/types";
import { AIService } from "@/src/lib/ai-service";

// --- Visual Builder Types & Constants ---
interface SimpleCondition {
    field: string;
    operator: string;
    value: string | number | boolean | string[];
}

interface FieldDef {
    label: string;
    value: string;
    hint?: string;  // Value hint shown next to the dropdown
}

const OPERATORS = [
    { label: "Equals (==)", value: "==" },
    { label: "Not Equals (!=)", value: "!=" },
    { label: "Greater Than (>)", value: ">" },
    { label: "Less Than (<)", value: "<" },
    { label: "Greater/Equal (>=)", value: ">=" },
    { label: "Less/Equal (<=)", value: "<=" },
    { label: "In List (in)", value: "in" },
];

// Common fields available in every service context
const FIELDS_COMMON: FieldDef[] = [
    { label: "Service ID", value: "serviceId", hint: '"sdwan" | "lan" | "wlan"' },
    { label: "Package ID", value: "packageId", hint: '"standard" | "premium" | "cost_centric"' },
    { label: "Site: Category", value: "site.category" },
    { label: "Site: User Count", value: "site.userCount" },
];

// SD-WAN specific fields
const FIELDS_SDWAN: FieldDef[] = [
    { label: "Site: Bandwidth Down (Mbps)", value: "site.bandwidthDownMbps" },
    { label: "Site: Bandwidth Up (Mbps)", value: "site.bandwidthUpMbps" },
    { label: "Site: WAN Links", value: "site.wanLinks" },
    { label: "Site: Redundancy Model", value: "site.redundancyModel", hint: "e.g. dual, single" },
];

// LAN specific fields — includes intent-collector outputs
const FIELDS_LAN: FieldDef[] = [
    { label: "Site: LAN Ports", value: "site.lanPorts" },
    { label: "Site: PoE Ports", value: "site.poePorts" },
    { label: "Site: Indoor APs", value: "site.indoorAPs" },
    { label: "LAN Intent: PoE Capability", value: "site.lanRequirements.poeCapabilities", hint: '"None" | "PoE" | "PoE+" | "UPOE" | "UPOE+"' },
    { label: "LAN Intent: Access Port Type", value: "site.lanRequirements.accessPortType", hint: '"RJ45-1G" | "RJ45-2.5G" | "RJ45-10G"' },
    { label: "LAN Intent: Uplink Port Type", value: "site.lanRequirements.uplinkPortType", hint: '"SFP+-10G" | "SFP-1G" | "QSFP+-40G"' },
    { label: "LAN Intent: Stackable Required", value: "site.lanRequirements.isStackable", hint: 'true | false' },
    { label: "LAN Intent: Rugged / Industrial", value: "site.lanRequirements.isRugged", hint: 'true | false' },
    { label: "LAN Intent: AP WiFi Standard", value: "site.lanRequirements.apWifiStandard", hint: '"Wi-Fi 5" | "Wi-Fi 6" | "Wi-Fi 6E" | "Wi-Fi 7"' },
    { label: "LAN Intent: Workstation Speed", value: "site.lanRequirements.highSpeedWorkstations", hint: '"Standard (1G)" | "mGig (2.5G/5G)" | "10G"' },
];

// WLAN specific fields
const FIELDS_WLAN: FieldDef[] = [
    { label: "Site: Indoor APs", value: "site.indoorAPs" },
    { label: "Site: Outdoor APs", value: "site.outdoorAPs" },
    { label: "Site: User Count", value: "site.userCount" },
];

const FIELDS_BY_SERVICE: Record<string, FieldDef[]> = {
    managed_sdwan: [...FIELDS_COMMON, ...FIELDS_SDWAN],
    sdwan: [...FIELDS_COMMON, ...FIELDS_SDWAN],
    managed_lan: [...FIELDS_COMMON, ...FIELDS_LAN],
    lan: [...FIELDS_COMMON, ...FIELDS_LAN],
    managed_wifi: [...FIELDS_COMMON, ...FIELDS_WLAN],
    wlan: [...FIELDS_COMMON, ...FIELDS_WLAN],
};

// Flat fallback for all other contexts or dynamic quantity field selector
const FIELDS_ALL: FieldDef[] = [...FIELDS_COMMON, ...FIELDS_SDWAN, ...FIELDS_LAN, ...FIELDS_WLAN];

// --- Parsers ---

function parseSingleCondition(clause: unknown): SimpleCondition | null {
    if (!clause || typeof clause !== "object") return null;
    const obj = clause as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length !== 1) return null;

    let op = keys[0];
    const args = obj[op];

    // Normalize strict equality to ==
    if (op === "===") op = "==";
    // Normalize !== to !=
    if (op === "!==") op = "!=";

    const validOps = OPERATORS.map(o => o.value);
    if (!validOps.includes(op)) return null;

    if (!Array.isArray(args) || args.length !== 2) return null;

    if (typeof args[0] !== "object" || args[0] === null || !("var" in args[0])) return null;

    const field = (args[0] as Record<string, unknown>)["var"];
    const value = args[1];

    return { field: field as string, operator: op, value };
}

function parseCondition(condition: unknown): SimpleCondition[] | null {
    if (!condition || typeof condition !== "object") return null;

    const obj = condition as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return [];
    if (keys.length !== 1) return null; // Too complex

    const rootOp = keys[0];

    if (rootOp === "and") {
        const clauses = obj["and"];
        if (!Array.isArray(clauses)) return null;

        const simpleConditions: SimpleCondition[] = [];
        for (const clause of clauses) {
            const parsed = parseSingleCondition(clause);
            if (!parsed) return null; // If any clause is complex, fallback
            simpleConditions.push(parsed);
        }
        return simpleConditions;
    } else {
        const parsed = parseSingleCondition(condition);
        if (parsed) return [parsed];
        return null;
    }
}

function buildJsonLogic(conditions: SimpleCondition[]): Record<string, unknown> {
    if (conditions.length === 0) {
        return {};
    }

    if (conditions.length === 1) {
        const c = conditions[0];
        // If 'in', formatting for arrays: {"in": [ value, {"var": field} ]} depending on standard json-logic
        // Our BOM engine evaluates json-logic natively 
        // We'll stick to: { "==": [{"var": "field"}, value] }
        return { [c.operator]: [{ "var": c.field }, c.value] };
    }

    return {
        "and": conditions.map(c => ({
            [c.operator]: [{ "var": c.field }, c.value]
        }))
    };
}

// --- Component ---
interface RuleEditorModalProps {
    isOpen: boolean;
    ruleToEdit: BOMLogicRule | null;
    serviceCategory: "sdwan" | "lan" | "wlan";
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
        condition: { "==": [{ "var": "serviceId" }, serviceCategory] } as Record<string, unknown>,
        actions: [],
    });
    const [saving, setSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isJsonImportOpen, setIsJsonImportOpen] = useState(false);
    const [jsonImportValue, setJsonImportValue] = useState("");
    const [verificationRule, setVerificationRule] = useState<Partial<BOMLogicRule> | null>(null);
    const [showDryRun, setShowDryRun] = useState(false);
    const [dryRunJson, setDryRunJson] = useState('');
    const [dryRunResult, setDryRunResult] = useState<{ matched: boolean; error?: string } | null>(null);

    // Evaluate the current rule condition against the dry-run context (client-side, no API)
    const evaluateDryRun = () => {
        if (!dryRunJson.trim()) return;
        try {
            const context = JSON.parse(dryRunJson);
            const matched = !!jsonLogic.apply(rule.condition, context);
            setDryRunResult({ matched });
        } catch (err) {
            setDryRunResult({ matched: false, error: err instanceof Error ? err.message : 'Invalid JSON context' });
        }
    };

    const handleJsonImport = () => {
        if (!jsonImportValue.trim()) return;
        try {
            const parsed = JSON.parse(jsonImportValue);

            // Basic validation for rule shape
            if (typeof parsed !== "object" || parsed === null || !parsed.name || !parsed.condition || !parsed.actions) {
                throw new Error("JSON must contain name, condition, and actions fields.");
            }

            setRule({
                ...rule,
                name: parsed.name,
                priority: typeof parsed.priority === "number" ? parsed.priority : rule.priority,
                condition: parsed.condition,
                actions: Array.isArray(parsed.actions) ? parsed.actions : rule.actions,
            });

            setIsJsonImportOpen(false);
            setJsonImportValue("");
            // Logic to check if simple mode should follow setRule
            // However, useMemo will re-calculate parsedSimpleConditions
        } catch (err) {
            console.error("JSON Import Error:", err);
            alert(err instanceof Error ? err.message : "Invalid JSON format");
        }
    };

    const handleAIGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await AIService.generateBOMLogicRule(aiPrompt, serviceCategory);
            setVerificationRule(result);
        } catch (err) {
            console.error(err);
            alert("Failed to generate rule with AI");
        } finally {
            setIsGenerating(false);
        }
    };

    const acceptVerificationRule = () => {
        if (!verificationRule) return;

        let finalCondition = (verificationRule.condition as Record<string, unknown>) || rule.condition;

        // Ensure serviceId filter is present so it shows up in the UI tabs
        const serviceFilter = { "==": [{ "var": "serviceId" }, serviceCategory] };
        const conditionString = JSON.stringify(finalCondition);

        if (!conditionString.includes(serviceCategory)) {
            finalCondition = {
                "and": [
                    serviceFilter,
                    finalCondition
                ]
            };
        }

        setRule({
            ...rule,
            name: verificationRule.name || rule.name,
            description: verificationRule.description || rule.description,
            condition: finalCondition,
            actions: (verificationRule.actions as BOMLogicAction[]) || rule.actions,
            source: "ai-generated"
        });

        setVerificationRule(null);
        setAiPrompt("");
        setShowRawJson(false); // Default to visual if possible
    };

    // Derived state for the visual builder
    const parsedSimpleConditions = useMemo(() => parseCondition(rule.condition), [rule.condition]);
    const isSimpleMode = parsedSimpleConditions !== null;
    const [showRawJson, setShowRawJson] = useState(!isSimpleMode);

    useEffect(() => {
        if (ruleToEdit) {
            setRule(ruleToEdit);
            const isSimple = parseCondition(ruleToEdit.condition) !== null;
            setShowRawJson(!isSimple);
        } else {
            const defaultCond = { "==": [{ "var": "serviceId" }, serviceCategory] };
            setRule({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
                name: "",
                priority: 10,
                condition: defaultCond as Record<string, unknown>,
                actions: [],
            });
            setShowRawJson(false); // New rules are inherently simple
        }
        setIsJsonImportOpen(false);
        setJsonImportValue("");
    }, [ruleToEdit, isOpen, serviceCategory]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Default to manual if it's a new rule without a source
            const ruleWithSource = {
                ...rule,
                source: rule.source || "manual"
            };
            await onSave(ruleWithSource);
            onClose();
        } catch (err) {
            alert("Failed to save rule.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // --- Visual Builder Handlers ---
    const updateVisualCondition = (index: number, updates: Partial<SimpleCondition>) => {
        if (!parsedSimpleConditions) return;
        const newConds = [...parsedSimpleConditions];
        newConds[index] = { ...newConds[index], ...updates };
        setRule({ ...rule, condition: buildJsonLogic(newConds) });
    };

    const addVisualCondition = () => {
        const current = parsedSimpleConditions || [];
        const newConds = [...current, { field: "site.bandwidthDownMbps", operator: "==", value: 0 }];
        setRule({ ...rule, condition: buildJsonLogic(newConds) });
    };

    const removeVisualCondition = (index: number) => {
        if (!parsedSimpleConditions) return;
        const newConds = parsedSimpleConditions.filter((_, i) => i !== index);
        if (newConds.length === 0) {
            setRule({ ...rule, condition: { "==": [{ "var": "serviceId" }, serviceCategory] } });
        } else {
            setRule({ ...rule, condition: buildJsonLogic(newConds) });
        }
    };

    const resetToSimple = () => {
        setRule({ ...rule, condition: { "==": [{ "var": "serviceId" }, serviceCategory] } });
        setShowRawJson(false);
    };

    // --- Action Handlers ---
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

    const formatValueForInput = (val: unknown) => {
        if (Array.isArray(val)) return val.join(", ");
        return String(val ?? "");
    };

    const parseValueFromInput = (val: string) => {
        if (val.trim() === "") return "";
        if (!isNaN(Number(val)) && val.trim() !== "") return Number(val);
        if (val.toLowerCase() === "true") return true;
        if (val.toLowerCase() === "false") return false;
        if (val.includes(",")) return val.split(",").map(s => s.trim());
        return val;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            {ruleToEdit ? "Edit BOM Engine Rule" : "Create New BOM Engine Rule"}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Rules dynamically process site parameters to select equipment.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            onClick={() => setIsJsonImportOpen(!isJsonImportOpen)}
                            className="text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded transition-colors shadow-sm"
                        >
                            {isJsonImportOpen ? "Close JSON Import" : "📋 Paste JSON"}
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {isJsonImportOpen && (
                    <div className="p-6 bg-slate-100 border-b border-slate-200 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 flex justify-between">
                            <span>Paste BOM Logic Rule JSON</span>
                            <span className="text-[10px] text-slate-400 normal-case font-normal">Fields: name, priority, condition, actions</span>
                        </label>
                        <textarea
                            value={jsonImportValue}
                            onChange={(e) => setJsonImportValue(e.target.value)}
                            rows={8}
                            placeholder='{&#10;  "name": "High Bandwidth Branch",&#10;  "priority": 15,&#10;  "condition": { "==": [{ "var": "site.bandwidthDownMbps" }, 1000] },&#10;  "actions": [ ... ]&#10;}'
                            className="w-full text-[13px] font-mono border-slate-300 rounded-lg p-3 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y bg-white"
                        />
                        <div className="mt-3 flex justify-end">
                            <button
                                type="button"
                                onClick={handleJsonImport}
                                className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 shadow-sm transition-colors"
                            >
                                Load JSON Rule
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    <form id="rule-form" onSubmit={handleSave} className="space-y-8">
                        {/* AI Assistant Section */}
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                <span>✨ Rule Copilot</span>
                            </h3>
                            <div className="flex gap-3 relative">
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Describe your intent (e.g., 'If a site has more than 100 users, require triage for switch stacking')"
                                    className="flex-1 border border-indigo-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 bg-white resize-none shadow-sm"
                                    rows={2}
                                    disabled={isGenerating}
                                />
                                <button
                                    type="button"
                                    onClick={handleAIGenerate}
                                    disabled={isGenerating || !aiPrompt.trim()}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                                >
                                    {isGenerating ? (
                                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : "Generate Rule"}
                                </button>
                            </div>

                            {verificationRule && (
                                <div className="mt-4 p-5 bg-white border-2 border-indigo-200 rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-[10px]">AI</span>
                                            Please Verify Generated Rule
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setVerificationRule(null)}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                            <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-1">Human Translation</p>
                                            <p className="text-sm text-slate-700 leading-relaxed italic">
                                                &ldquo;{verificationRule.description || "No translation provided."}&rdquo;
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logic Payload</p>
                                            <pre className="text-[10px] font-mono bg-slate-900 text-emerald-400 p-4 rounded-lg overflow-x-auto border border-slate-800 shadow-inner max-h-48">
                                                {JSON.stringify({
                                                    name: verificationRule.name,
                                                    condition: verificationRule.condition,
                                                    actions: verificationRule.actions
                                                }, null, 2)}
                                            </pre>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={acceptVerificationRule}
                                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                                            >
                                                <span>✓</span> Accept & Populate Form
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setVerificationRule(null)}
                                                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors"
                                            >
                                                Discard
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <section className="p-5 bg-white rounded-xl border border-slate-200/60 shadow-sm space-y-6">
                            <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Rule Name
                                    </label>
                                    <input
                                        type="text"
                                        value={rule.name}
                                        onChange={(e) => setRule({ ...rule, name: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                        placeholder="e.g. Standard High-Bandwidth Branch"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Priority &nbsp;<span className="normal-case tracking-normal font-normal text-slate-400">(Higher = fires first)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={rule.priority}
                                        onChange={(e) => setRule({ ...rule, priority: parseInt(e.target.value) || 0 })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Source Tag
                                    </label>
                                    <select
                                        value={rule.source || "manual"}
                                        onChange={(e) => setRule({ ...rule, source: e.target.value as import("@/src/lib/types").BOMLogicRule["source"] })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors font-medium text-slate-700"
                                    >
                                        <option value="manual">✏️ Manual</option>
                                        <option value="intent">🎯 Intent</option>
                                        <option value="ai-generated">✨ AI Generated</option>
                                        <option value="seed">🌱 Seed Rule</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Human Translation / Description
                                </label>
                                <textarea
                                    value={rule.description || ""}
                                    onChange={(e) => setRule({ ...rule, description: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors resize-none"
                                    placeholder="Plain English explanation of what this rule does..."
                                    rows={2}
                                />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                    Condition Triggers
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowRawJson(!showRawJson)}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${showRawJson ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'}`}
                                >
                                    {showRawJson ? "Hide Raw JSON" : "Show Raw JSON"}
                                </button>
                            </div>

                            {/* LAN Context Banner */}
                            {serviceCategory === "lan" && (
                                <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm flex gap-3 items-start">
                                    <span className="text-base mt-0.5">🎯</span>
                                    <div>
                                        <p className="font-semibold text-blue-900 text-xs uppercase tracking-wide mb-0.5">Intent-Aware LAN Rules</p>
                                        <p className="text-blue-700 text-xs leading-relaxed">
                                            LAN rules run <strong>after</strong> the Intent Collector sets requirements. Use <code className="bg-blue-100 px-1 rounded text-[11px]">site.lanRequirements.*</code> fields to match what the SA selected on the LAN tab.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Visual Builder UI */}
                            {!isSimpleMode && !showRawJson ? (
                                <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex justify-between items-center shadow-sm">
                                    <div>
                                        <strong className="block mb-1 text-amber-900">Complex Logic Detected</strong>
                                        This rule uses nested or advanced JSON Logic criteria that cannot be displayed visually.
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button type="button" onClick={() => setShowRawJson(true)} className="px-4 py-2 bg-amber-200 hover:bg-amber-300 rounded-lg text-amber-900 font-bold transition-colors">View JSON</button>
                                        <button type="button" onClick={resetToSimple} className="px-4 py-2 bg-white hover:bg-slate-50 border border-amber-300 rounded-lg font-bold transition-colors">Reset to Simple</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                    {isSimpleMode ? (
                                        <>
                                            {parsedSimpleConditions?.map((cond, i) => (
                                                <div key={i} className="flex gap-3 items-center relative group">
                                                    {i > 0 && <span className="text-[10px] font-black text-white bg-slate-400 uppercase w-8 text-center rounded py-1 px-1">And</span>}
                                                    {i === 0 && <span className="text-[10px] font-black text-white bg-blue-500 uppercase w-8 text-center rounded py-1 px-1">If</span>}

                                                    <div className="flex-1 flex gap-2">
                                                        <select
                                                            value={cond.field}
                                                            onChange={(e) => updateVisualCondition(i, { field: e.target.value })}
                                                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white transition-colors"
                                                        >
                                                            <optgroup label="— Common —">
                                                                {FIELDS_COMMON.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                                            </optgroup>
                                                            <optgroup label="— Service Specific —">
                                                                {(FIELDS_BY_SERVICE[serviceCategory] ?? FIELDS_ALL)
                                                                    .filter(f => !FIELDS_COMMON.find(c => c.value === f.value))
                                                                    .map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                                            </optgroup>
                                                            {!FIELDS_ALL.find(f => f.value === cond.field) && (
                                                                <option value={cond.field}>{cond.field} (Custom)</option>
                                                            )}
                                                        </select>

                                                        <select
                                                            value={cond.operator}
                                                            onChange={(e) => updateVisualCondition(i, { operator: e.target.value })}
                                                            className="w-40 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white font-bold text-slate-700 transition-colors cursor-pointer text-center appearance-none"
                                                        >
                                                            {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                        </select>

                                                        <input
                                                            type="text"
                                                            value={formatValueForInput(cond.value)}
                                                            onChange={(e) => updateVisualCondition(i, { value: parseValueFromInput(e.target.value) })}
                                                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors font-mono placeholder:text-slate-300 placeholder:font-sans"
                                                            placeholder="Value (e.g. 500, true, managed_sdwan)"
                                                        />
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeVisualCondition(i)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                                                        title="Remove Condition"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="pt-3 pl-11">
                                                <button
                                                    type="button"
                                                    onClick={addVisualCondition}
                                                    className="text-[11px] font-bold text-slate-500 hover:text-blue-700 flex items-center gap-1.5 uppercase tracking-wider bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"
                                                >
                                                    <span className="text-sm">+</span> Add AND Clause
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-sm text-slate-500 italic px-2 py-4 text-center">Visual editor unavailable for complex JSON logic. Expand raw JSON below to edit.</div>
                                    )}
                                </div>
                            )}

                            {/* Raw JSON Editor */}
                            {showRawJson && (
                                <div className="space-y-0 border rounded-xl overflow-hidden shadow-sm mt-4 ring-1 ring-slate-200">
                                    <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-xs text-slate-300 font-mono">
                                        <span>Raw JSON Logic Expression</span>
                                        {!isSimpleMode && <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-bold">Complex Mode</span>}
                                    </div>
                                    <textarea
                                        key={rule.id || "new"}
                                        defaultValue={JSON.stringify(rule.condition, null, 2)}
                                        onChange={(e) => {
                                            try {
                                                const parsed = JSON.parse(e.target.value);
                                                setRule({ ...rule, condition: parsed });
                                            } catch {
                                                // Allow invalid state while typing
                                            }
                                        }}
                                        className="w-full border-0 px-5 py-4 font-mono text-sm h-48 focus:ring-0 bg-slate-900 text-slate-100"
                                        placeholder='{ "==": [{ "var": "serviceId" }, "sdwan"] }'
                                        required
                                    />
                                </div>
                            )}
                        </section>

                        <section className="space-y-4 pt-6 border-t border-slate-200">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Actions ({rule.actions.length})
                                </h3>
                                <button
                                    type="button"
                                    onClick={addAction}
                                    className="text-sm font-bold text-white flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
                                >
                                    <span>+</span> Add Action
                                </button>
                            </div>
                            <div className="space-y-4">
                                {rule.actions.length === 0 && (
                                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-400 text-sm">
                                        No actions defined yet. Click &apos;Add Action&apos; to specify what building this rule does.
                                    </div>
                                )}
                                {rule.actions.map((a, i) => (
                                    <div key={i} className="space-y-4 p-5 border border-slate-200 rounded-xl bg-white relative shadow-sm group hover:border-indigo-200 transition-colors">
                                        <button
                                            type="button"
                                            onClick={() => removeAction(i)}
                                            className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 bg-white shadow-sm ring-1 ring-slate-100"
                                            title="Delete Action"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                        <div className="flex gap-4">
                                            <div className="w-1/3">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Action Type</label>
                                                <select
                                                    value={a.type}
                                                    onChange={(e) => updateAction(i, { type: e.target.value as import("@/src/lib/types").BOMLogicAction["type"] })}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 hover:bg-white transition-colors"
                                                >
                                                    <option value="select_equipment">Select Equipment</option>
                                                    <option value="enable_feature">Enable Feature</option>
                                                    <option value="set_configuration">Set Configuration</option>
                                                    <option value="set_parameter">Set Parameter</option>
                                                    <option value="modify_quantity">Modify Quantity</option>
                                                    <option value="require_triage">Require Triage (Guardrail)</option>
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target ID</label>
                                                {a.type === 'set_parameter' ? (
                                                    <select
                                                        value={a.targetId}
                                                        onChange={(e) => updateAction(i, { targetId: e.target.value, actionValue: '' })}
                                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 hover:bg-white transition-colors"
                                                    >
                                                        <option value="" disabled>Select Parameter</option>
                                                        {SYSTEM_PARAMETERS.map(p => (
                                                            <option key={p.id} value={p.id}>{p.label} ({p.id})</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={a.targetId}
                                                        onChange={(e) => updateAction(i, { targetId: e.target.value })}
                                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white font-mono text-slate-700 placeholder:text-slate-300 placeholder:font-sans transition-colors"
                                                        placeholder="e.g. meraki_mx85, default_uplink"
                                                        required
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {a.type === 'require_triage' && (
                                            <div className="space-y-4 pt-2 p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Severity</label>
                                                        <select
                                                            value={a.severity || 'medium'}
                                                            onChange={(e) => updateAction(i, { severity: e.target.value as 'low' | 'medium' | 'high' })}
                                                            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white transition-colors"
                                                        >
                                                            <option value="low">Low</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="high">High</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Resolution Paths (Comma Separated)</label>
                                                        <input
                                                            type="text"
                                                            value={a.resolutionPaths?.join(', ') || ''}
                                                            onChange={(e) => updateAction(i, { resolutionPaths: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                                            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white transition-colors"
                                                            placeholder="e.g. Increase AP Quantity, Upgrade to HD Models"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Triage Reason</label>
                                                    <input
                                                        type="text"
                                                        value={a.reason || ''}
                                                        onChange={(e) => updateAction(i, { reason: e.target.value })}
                                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white transition-colors"
                                                        placeholder="e.g. User density exceeds 40 users per Access Point."
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {(a.type === 'set_parameter' || a.type === 'set_configuration') && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Value To Set</label>
                                                {(() => {
                                                    const paramDef = SYSTEM_PARAMETERS.find(p => p.id === a.targetId);

                                                    const renderInput = () => {
                                                        if (paramDef && paramDef.options) {
                                                            return (
                                                                <select
                                                                    value={String(a.actionValue || '')}
                                                                    onChange={(e) => updateAction(i, { actionValue: e.target.value })}
                                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 hover:bg-white transition-colors"
                                                                    required
                                                                >
                                                                    <option value="" disabled>Select an option</option>
                                                                    {paramDef.options.map(opt => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                            );
                                                        }
                                                        if (paramDef && paramDef.type === 'boolean') {
                                                            return (
                                                                <select
                                                                    value={String(a.actionValue || '')}
                                                                    onChange={(e) => updateAction(i, { actionValue: e.target.value === 'true' })}
                                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 hover:bg-white transition-colors"
                                                                    required
                                                                >
                                                                    <option value="" disabled>Select True/False</option>
                                                                    <option value="true">True</option>
                                                                    <option value="false">False</option>
                                                                </select>
                                                            );
                                                        }
                                                        return (
                                                            <input
                                                                type="text"
                                                                value={String(a.actionValue || '')}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const numVal = Number(val);
                                                                    updateAction(i, { actionValue: (isNaN(numVal) || val === '') ? val : numVal });
                                                                }}
                                                                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white font-mono placeholder:text-slate-300 placeholder:font-sans transition-colors"
                                                                placeholder="e.g., 80 or true"
                                                                required
                                                            />
                                                        );
                                                    };

                                                    return (
                                                        <div className="space-y-2">
                                                            {renderInput()}
                                                            {paramDef && (
                                                                <div className="text-[11px] text-slate-500 bg-slate-100 p-2 rounded border border-slate-200">
                                                                    <span className="font-bold text-slate-700">Description:</span> {paramDef.description}<br />
                                                                    <span className="font-bold text-slate-700">System Default:</span> {String(paramDef.defaultValue)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {(a.type !== 'set_parameter' && a.type !== 'require_triage') && (
                                            <div className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/80">
                                                <div className="w-1/3">
                                                    <label className="block text-[11px] font-bold text-slate-400 tracking-wider mb-1.5 uppercase">Fixed Quantity</label>
                                                    <input
                                                        type="number"
                                                        value={a.quantity || ''}
                                                        onChange={(e) => updateAction(i, { quantity: parseInt(e.target.value) || undefined })}
                                                        className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="Optional (e.g. 1)"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[11px] font-bold text-slate-400 tracking-wider mb-1.5 uppercase focus:ring-indigo-500">Dynamic Quantity Based On</label>
                                                    <select
                                                        value={a.quantityMultiplierField || ''}
                                                        onChange={(e) => updateAction(i, { quantityMultiplierField: (e.target.value as keyof import("@/src/lib/types").Site) || undefined })}
                                                        className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    >
                                                        <option value="">None (Static)</option>
                                                        {FIELDS_ALL.filter(f => f.value.startsWith("site.")).map(f => (
                                                            <option key={f.value} value={f.value.replace(/^site\./, '')}>{f.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Dry-Run Simulator (Item 6) */}
                        <section className="pt-6 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => { setShowDryRun(!showDryRun); setDryRunResult(null); }}
                                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Test This Rule (Dry-Run)
                                </span>
                                <svg className={`w-4 h-4 text-slate-400 transition-transform ${showDryRun ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showDryRun && (
                                <div className="mt-3 space-y-4 p-4 bg-slate-900 rounded-xl border border-slate-700">
                                    <p className="text-xs text-slate-400">
                                        Paste a site context JSON below to test if this rule fires. Evaluated 100% client-side — no save required.
                                    </p>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Context JSON</label>
                                        <textarea
                                            value={dryRunJson}
                                            onChange={e => { setDryRunJson(e.target.value); setDryRunResult(null); }}
                                            rows={8}
                                            placeholder={`{\n  "serviceId": "managed_lan",\n  "packageId": "cost_centric",\n  "site": {\n    "lanPorts": 24,\n    "lanRequirements": {\n      "poeCapabilities": "PoE+",\n      "isStackable": false\n    }\n  }\n}`}
                                            className="w-full font-mono text-xs bg-slate-800 text-emerald-300 border border-slate-700 rounded-lg p-3 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={evaluateDryRun}
                                            disabled={!dryRunJson.trim()}
                                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            ▶ Run Test
                                        </button>
                                        {dryRunResult && (
                                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${dryRunResult.error
                                                ? 'bg-red-900/50 text-red-300 border border-red-700'
                                                : dryRunResult.matched
                                                    ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
                                                    : 'bg-slate-700 text-slate-300 border border-slate-600'
                                                }`}>
                                                {dryRunResult.error ? (
                                                    <>⚠ Parse Error: {dryRunResult.error}</>
                                                ) : dryRunResult.matched ? (
                                                    <>✓ MATCH — this rule would fire</>
                                                ) : (
                                                    <>✗ NO MATCH — rule condition not met</>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    </form>
                </div>

                <div className="px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-slate-100 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="rule-form"
                        className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-600/20 disabled:opacity-50 inline-flex items-center gap-2 transition-all"
                        disabled={saving}
                    >
                        {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {saving ? "Saving..." : "Save Rule Analysis"}
                    </button>
                </div>
            </div>
        </div>
    );
}
