'use client';

import React, { useState, useEffect } from 'react';
import { useSystemConfig } from '@/src/hooks/useSystemConfig';
import { SystemConfig, SystemConfigSchema, SYSTEM_PARAMETERS, SystemParameterDefinition, BOMLogicRule } from '@/src/lib/types';
import { useBOMRules } from "@/src/hooks/useBOMRules";
import RuleList from "@/src/components/admin/bom-logic/RuleList";
import RuleEditorModal from "@/src/components/admin/bom-logic/RuleEditorModal";
import { BOMService } from "@/src/lib/firebase/bom-service";
import ManagementPricingEditor from "@/src/components/admin/ManagementPricingEditor";

// Tab enum
type Tab = 'general' | 'taxonomy' | 'bom_logic' | 'pricing_matrix';

export default function AdminSettingsPage() {
    const { config, isLoading, updateConfigAsync } = useSystemConfig();
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [draftConfig, setDraftConfig] = useState<SystemConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    // Rules Management State
    const { rules, loading: rulesLoading, refreshRules: loadRules } = useBOMRules();
    const [seeding, setSeeding] = useState(false);
    const [activeRuleCategory, setActiveRuleCategory] = useState<"managed_sdwan" | "managed_lan" | "managed_wifi">("managed_sdwan");
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [ruleToEdit, setRuleToEdit] = useState<BOMLogicRule | null>(null);

    const [localTaxonomyStrings, setLocalTaxonomyStrings] = useState<Record<string, string>>({});

    useEffect(() => {
        if (config) {
            setDraftConfig(config);
            // Initialize local strings for taxonomy textareas
            const initialStrings: Record<string, string> = {};
            if (config.taxonomy) {
                Object.entries(config.taxonomy).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        initialStrings[key] = value.join(', ');
                    }
                });
            }
            setLocalTaxonomyStrings(initialStrings);
        } else if (config === null && !isLoading) {
            setDraftConfig(SystemConfigSchema.parse({}));
        }
    }, [config, isLoading]);

    const handleSave = async () => {
        if (!draftConfig) return;
        setIsSaving(true);
        try {
            await updateConfigAsync(draftConfig);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        } catch (error) {
            console.error('Failed to save config:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Rule Handlers
    const handleSeedRules = async () => {
        if (!confirm("This will overwrite existing rules with defaults. Are you sure?")) return;
        setSeeding(true);
        try {
            const res = await fetch("/api/admin/seed");
            const json = await res.json();
            if (json.success) {
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
                loadRules();
            }
        } catch (e) { console.error(e); }
        setSeeding(false);
    };

    const handleSaveRule = async (rule: BOMLogicRule) => {
        await BOMService.saveRule(rule);
        setIsRuleModalOpen(false);
        setRuleToEdit(null);
        loadRules();
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm("Delete this rule?")) return;
        await BOMService.deleteRule(id);
        loadRules();
    };

    const openCreateRule = () => {
        setRuleToEdit(null);
        setIsRuleModalOpen(true);
    };

    const openEditRule = (rule: BOMLogicRule) => {
        setRuleToEdit(rule);
        setIsRuleModalOpen(true);
    };

    const handleArrayChange = (category: 'taxonomy', field: string, stringValue: string) => {
        if (!draftConfig) return;

        // Update local string immediately so the user can see what they are typing (including commas)
        setLocalTaxonomyStrings(prev => ({ ...prev, [field]: stringValue }));

        // Parse and update the actual draft configuration array
        const arrayValue = stringValue.split(',').map(s => s.trim()).filter(Boolean);
        setDraftConfig({
            ...draftConfig,
            [category]: {
                ...draftConfig[category],
                [field]: arrayValue
            }
        });
    };

    const handleNumberChange = (category: 'defaults' | 'calculationBaselines', field: string, value: string) => {
        if (!draftConfig) return;
        setDraftConfig({
            ...draftConfig,
            [category]: {
                ...draftConfig[category],
                [field]: parseFloat(value) || 0
            }
        });
    };

    const handleStringChange = (category: 'defaults', field: string, value: string) => {
        if (!draftConfig) return;
        setDraftConfig({
            ...draftConfig,
            [category]: {
                ...draftConfig[category],
                [field]: value
            }
        });
    };

    const handleBOMParameterChange = (id: string, value: string | number | boolean) => {
        if (!draftConfig) return;
        setDraftConfig({
            ...draftConfig,
            calculationBaselines: {
                ...draftConfig.calculationBaselines,
                [id]: value
            }
        });
    };

    const renderBOMParameterInput = (paramDef: SystemParameterDefinition) => {
        const value = draftConfig?.calculationBaselines?.[paramDef.id] !== undefined
            ? draftConfig.calculationBaselines[paramDef.id]
            : paramDef.defaultValue;

        if (paramDef.options) {
            return (
                <select
                    value={value as string}
                    onChange={(e) => handleBOMParameterChange(paramDef.id, e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                    {paramDef.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        if (paramDef.type === 'boolean') {
            return (
                <div className="flex items-center mt-2">
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => handleBOMParameterChange(paramDef.id, e.target.checked)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-slate-600 font-medium">{value ? "Enabled" : "Disabled"}</span>
                </div>
            );
        }

        return (
            <input
                type={paramDef.type === 'number' ? "number" : "text"}
                value={value as string | number}
                onChange={(e) => {
                    const val = e.target.value;
                    const parsedVal = paramDef.type === "number" ? (val === '' ? '' : Number(val)) : val;
                    handleBOMParameterChange(paramDef.id, parsedVal);
                }}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
        );
    };

    if (isLoading || !draftConfig) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium tracking-tight">Loading Settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:block w-64 border-r border-slate-200 bg-white p-6 min-h-screen">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-8">System Settings</h2>
                <nav className="space-y-2">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('taxonomy')}
                        className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'taxonomy' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        Site Taxonomy
                    </button>
                    <button
                        onClick={() => setActiveTab('bom_logic')}
                        className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'bom_logic' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        BOM Logic
                    </button>
                    <button
                        onClick={() => setActiveTab('pricing_matrix')}
                        className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'pricing_matrix' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        Pricing Matrix
                    </button>
                </nav>
            </aside>

            {/* Tabs (Mobile) */}
            <nav className="md:hidden flex overflow-x-auto border-b border-slate-200 bg-white p-4 space-x-2">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 bg-slate-50'
                        }`}
                >
                    General
                </button>
                <button
                    onClick={() => setActiveTab('taxonomy')}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'taxonomy' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 bg-slate-50'
                        }`}
                >
                    Site Taxonomy
                </button>
                <button
                    onClick={() => setActiveTab('bom_logic')}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'bom_logic' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 bg-slate-50'
                        }`}
                >
                    BOM Logic
                </button>
                <button
                    onClick={() => setActiveTab('pricing_matrix')}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'pricing_matrix' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 bg-slate-50'
                        }`}
                >
                    Pricing Matrix
                </button>
            </nav>

            {/* Content Area */}
            <main className="flex-1 p-6 md:p-10 relative">
                <div className="max-w-3xl">
                    <h1 className="text-3xl font-extrabold text-[#00A3FF] tracking-tight mb-8">
                        {activeTab === 'general' && 'General Settings'}
                        {activeTab === 'taxonomy' && 'Site Taxonomy'}
                        {activeTab === 'bom_logic' && 'BOM Logic Baselines'}
                        {activeTab === 'pricing_matrix' && 'Management Pricing Matrix'}
                    </h1>

                    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
                        {/* GENERAL TAB */}
                        {activeTab === 'general' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                                    <input
                                        type="text"
                                        value={draftConfig.defaults.currency}
                                        onChange={(e) => handleStringChange('defaults', 'currency', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Default Term (Months)</label>
                                    <input
                                        type="number"
                                        value={draftConfig.defaults.defaultTermMonths}
                                        onChange={(e) => handleNumberChange('defaults', 'defaultTermMonths', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </>
                        )}

                        {/* TAXONOMY TAB */}
                        {activeTab === 'taxonomy' && (
                            <>
                                <div className="mb-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <h2 className="text-lg font-bold text-blue-800 mb-4">LAN Infrastructure Taxonomy</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Valid PoE Types</label>
                                            <input
                                                type="text"
                                                value={draftConfig.validPoeTypes || ''}
                                                onChange={(e) => setDraftConfig({ ...draftConfig, validPoeTypes: e.target.value })}
                                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Enter values separated by commas (e.g., &apos;None, PoE+, UPoE&apos;)</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Valid Redundancy Modes</label>
                                            <input
                                                type="text"
                                                value={draftConfig.validRedundancyModes || ''}
                                                onChange={(e) => setDraftConfig({ ...draftConfig, validRedundancyModes: e.target.value })}
                                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Enter values separated by commas (e.g., &apos;None, PoE+, UPoE&apos;)</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Regions (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.regions || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'regions', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Site Types (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.siteTypes || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'siteTypes', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Vendors (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.vendors || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'vendors', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Equipment Purposes (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.purposes || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'purposes', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Cellular Types (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.cellular_types || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'cellular_types', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Wi-Fi Standards (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.wifi_standards || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'wifi_standards', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Mounting Options (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.mounting_options || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'mounting_options', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Recommended Use Cases (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.recommended_use_cases || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'recommended_use_cases', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Interface Types (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.interface_types || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'interface_types', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Feature Categories (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.feature_categories || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'feature_categories', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Service Categories (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.service_categories || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'service_categories', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Design Option Categories (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={localTaxonomyStrings.design_option_categories || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'design_option_categories', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </>
                        )}

                        {/* BOM LOGIC TAB */}
                        {activeTab === 'bom_logic' && (
                            <div className="space-y-10">
                                <section>
                                    <h2 className="text-xl font-bold text-slate-800 mb-2">Calculation Baselines</h2>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Foundational factors and buffers that impact every device selection.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Default Redundancy Factor</label>
                                            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                                                The multiplier applied to equipment quantities when redundant/HA hardware is required.
                                            </p>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={draftConfig.calculationBaselines.defaultRedundancyFactor}
                                                onChange={(e) => handleNumberChange('calculationBaselines', 'defaultRedundancyFactor', e.target.value)}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">WAN Throughput Buffer (%)</label>
                                            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                                                Additional capacity buffer added to site bandwidth requirements when selecting WAN devices.
                                            </p>
                                            <input
                                                type="number"
                                                value={draftConfig.calculationBaselines.wanThroughputBuffer}
                                                onChange={(e) => handleNumberChange('calculationBaselines', 'wanThroughputBuffer', e.target.value)}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <hr className="border-slate-100" />

                                <section>
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800 mb-2">BOM Logic Rules</h2>
                                            <p className="text-sm text-slate-500">
                                                Conditional rules that drive equipment selection based on site specs.
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSeedRules}
                                                disabled={seeding}
                                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                            >
                                                {seeding ? 'Seeding...' : 'Reset Defaults'}
                                            </button>
                                            <button
                                                onClick={openCreateRule}
                                                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                + New Rule
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sub-tabs for Rules */}
                                    <div className="flex space-x-1 border-b border-slate-100 mb-6">
                                        {[
                                            { id: "managed_sdwan", label: "SD-WAN" },
                                            { id: "managed_lan", label: "LAN" },
                                            { id: "managed_wifi", label: "WLAN" }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveRuleCategory(tab.id as "managed_sdwan" | "managed_lan" | "managed_wifi")}
                                                className={`px-4 py-2 font-bold text-xs tracking-tight transition-all rounded-t-xl border-t border-l border-r
                                                    ${activeRuleCategory === tab.id
                                                        ? "bg-white border-slate-100 text-blue-600 -mb-px"
                                                        : "text-slate-400 border-transparent bg-transparent hover:text-slate-600"}
                                                `}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    <RuleList
                                        rules={rules.filter(r => JSON.stringify(r.condition || {}).includes(activeRuleCategory))}
                                        onEdit={openEditRule}
                                        onDelete={handleDeleteRule}
                                    />
                                </section>

                                <hr className="border-slate-100" />

                                <section>
                                    <h2 className="text-xl font-bold text-slate-800 mb-2">Global Parameters</h2>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Fallbacks and thresholds used when no specific rules apply.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                                        {SYSTEM_PARAMETERS.map(paramDef => (
                                            <div key={paramDef.id} className="group">
                                                <div className="flex items-baseline justify-between mb-1">
                                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">{paramDef.label}</label>
                                                    <span className="text-[9px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{paramDef.id}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">{paramDef.description}</p>
                                                {renderBOMParameterInput(paramDef)}
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <RuleEditorModal
                                    isOpen={isRuleModalOpen}
                                    ruleToEdit={ruleToEdit}
                                    serviceCategory={activeRuleCategory}
                                    onClose={() => setIsRuleModalOpen(false)}
                                    onSave={handleSaveRule}
                                />
                            </div>
                        )}

                        {/* PRICING MATRIX TAB */}
                        {activeTab === 'pricing_matrix' && (
                            <ManagementPricingEditor />
                        )}
                    </div>
                </div>

                {/* Sticky Action Bar */}
                <div className="fixed bottom-6 pl-6 right-6 md:right-10 flex gap-4 pointer-events-none">
                    {/* Toast Notification */}
                    {showSuccessToast && (
                        <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce transition-all pointer-events-auto">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="font-medium">Settings saved successfully</span>
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold tracking-tight shadow-md hover:shadow-lg transition-all disabled:opacity-50 pointer-events-auto flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </main >
        </div >
    );
}
