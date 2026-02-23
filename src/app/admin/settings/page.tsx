'use client';

import React, { useState, useEffect } from 'react';
import { useSystemConfig } from '@/src/hooks/useSystemConfig';
import { SystemConfig, SystemConfigSchema } from '@/src/lib/types';

// Tab enum
type Tab = 'general' | 'taxonomy' | 'bom_logic';

export default function AdminSettingsPage() {
    const { config, isLoading, updateConfigAsync } = useSystemConfig();
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [draftConfig, setDraftConfig] = useState<SystemConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
        if (config) {
            setDraftConfig(config);
            // If config is explicitly null and we broke out of loading state, that means we need to populate a default
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

    const handleArrayChange = (category: 'taxonomy', field: string, value: string) => {
        if (!draftConfig) return;
        const arrayValue = value.split(',').map(s => s.trim()).filter(Boolean);
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
            </nav>

            {/* Content Area */}
            <main className="flex-1 p-6 md:p-10 relative">
                <div className="max-w-3xl">
                    <h1 className="text-3xl font-extrabold text-[#00A3FF] tracking-tight mb-8">
                        {activeTab === 'general' && 'General Settings'}
                        {activeTab === 'taxonomy' && 'Site Taxonomy'}
                        {activeTab === 'bom_logic' && 'BOM Logic Baselines'}
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Regions (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.regions.join(', ')}
                                        onChange={(e) => handleArrayChange('taxonomy', 'regions', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Site Types (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.siteTypes.join(', ')}
                                        onChange={(e) => handleArrayChange('taxonomy', 'siteTypes', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Vendors (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.vendors.join(', ')}
                                        onChange={(e) => handleArrayChange('taxonomy', 'vendors', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Equipment Purposes (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.purposes?.join(', ') || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'purposes', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Cellular Types (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.cellular_types?.join(', ') || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'cellular_types', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Wi-Fi Standards (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.wifi_standards?.join(', ') || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'wifi_standards', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Mounting Options (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.mounting_options?.join(', ') || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'mounting_options', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Recommended Use Cases (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.recommended_use_cases?.join(', ') || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'recommended_use_cases', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Interface Types (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.interface_types?.join(', ') || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'interface_types', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Feature Categories (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.feature_categories?.join(', ') || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'feature_categories', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Service Categories (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.service_categories?.join(', ') || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'service_categories', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Design Option Categories (Comma separated)</label>
                                    <textarea
                                        rows={3}
                                        value={draftConfig.taxonomy.design_option_categories?.join(', ') || ''}
                                        onChange={(e) => handleArrayChange('taxonomy', 'design_option_categories', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </>
                        )}

                        {/* BOM LOGIC TAB */}
                        {activeTab === 'bom_logic' && (
                            <>
                                <p className="text-sm text-gray-500 -mt-2 mb-6">
                                    These calculation baselines directly impact the BOM Engine output.
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Default Redundancy Factor</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={draftConfig.calculationBaselines.defaultRedundancyFactor}
                                        onChange={(e) => handleNumberChange('calculationBaselines', 'defaultRedundancyFactor', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">WAN Throughput Buffer (%)</label>
                                    <input
                                        type="number"
                                        value={draftConfig.calculationBaselines.wanThroughputBuffer}
                                        onChange={(e) => handleNumberChange('calculationBaselines', 'wanThroughputBuffer', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </>
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
            </main>
        </div>
    );
}
