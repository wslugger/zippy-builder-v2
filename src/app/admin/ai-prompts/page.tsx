'use client';

import React, { useState, useEffect } from 'react';
import AIPromptEditor from '@/src/components/admin/AIPromptEditor';
import { AIPromptConfig, PromptId } from '@/src/lib/types';

export default function AIPromptsPage() {
    const [configs, setConfigs] = useState<AIPromptConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<PromptId>('package_selection');
    const [lastSaved, setLastSaved] = useState<string | null>(null);

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/ai-prompts');
            const data = await res.json();
            setConfigs(data);
        } catch (error) {
            console.error('Failed to load configs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (config: AIPromptConfig) => {
        try {
            const res = await fetch('/api/admin/ai-prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                setLastSaved(new Date().toLocaleTimeString());
                await loadConfigs();
            }
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    };

    const handleReset = async (id: PromptId) => {
        try {
            // We'll add a reset endpoint or just use the POST with default data
            // For now, let's just use the POST from the admin/seed pattern if we want
            // but a direct service call is faster. The UI currently sends the POST.
            // Actually, I'll just use the default from the service via a new route or just POSTing the default.
            // Let's implement a reset route for simplicity.
            const res = await fetch(`/api/admin/ai-prompts/reset?id=${id}`, { method: 'POST' });
            if (res.ok) {
                await loadConfigs();
            }
        } catch (error) {
            console.error('Failed to reset config:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-zinc-500 font-medium">Loading AI Configurations...</p>
                </div>
            </div>
        );
    }

    const currentConfig = configs.find(c => c.id === activeTab);

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                        AI <span className="text-blue-600">Prompts Control</span>
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                        Customize the system instructions and model parameters for the SA workflow steps.
                    </p>
                </div>
                {lastSaved && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium animate-in fade-in zoom-in">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Last saved at {lastSaved}
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    {configs.map(config => (
                        <button
                            key={config.id}
                            onClick={() => setActiveTab(config.id)}
                            className={`px-8 py-5 text-sm font-bold transition-all border-b-2 ${activeTab === config.id
                                ? 'border-blue-600 text-blue-600 bg-white dark:bg-zinc-900'
                                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                                }`}
                        >
                            {config.label}
                        </button>
                    ))}
                </div>

                <div className="p-8">
                    {currentConfig ? (
                        <AIPromptEditor
                            key={currentConfig.id}
                            config={currentConfig}
                            onSave={handleSave}
                            onReset={() => handleReset(currentConfig.id)}
                        />
                    ) : (
                        <div className="text-center py-20 text-zinc-400">
                            Select a prompt stage to configure.
                        </div>
                    )}
                </div>
            </div>

            <section className="mt-12 bg-zinc-900 text-zinc-100 p-8 rounded-3xl border border-zinc-800 shadow-2xl">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-blue-400 shrink-0">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold mb-2">Templating Guide</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                            The following variables are available depending on the prompt stage. Ensure you include them in your templates if they are critical for the LLM to function.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ul className="space-y-2 text-xs font-mono">
                                <li className="flex items-center gap-2"><span className="text-blue-400">{`{packageSummaries}`}</span> <span className="text-zinc-600">—</span> List of packages</li>
                                <li className="flex items-center gap-2"><span className="text-blue-400">{`{requirementsTextSection}`}</span> <span className="text-zinc-600">—</span> Formatted requirements</li>
                                <li className="flex items-center gap-2"><span className="text-blue-400">{`{siteTypesContext}`}</span> <span className="text-zinc-600">—</span> Catalog of site types</li>
                            </ul>
                            <ul className="space-y-2 text-xs font-mono">
                                <li className="flex items-center gap-2"><span className="text-blue-400">{`{sitesToClassify}`}</span> <span className="text-zinc-600">—</span> Raw site data from CSV</li>
                                <li className="flex items-center gap-2"><span className="text-blue-400">{`{payloadJSON}`}</span> <span className="text-zinc-600">—</span> Full HLD input payload</li>
                                <li className="flex items-center gap-2"><span className="text-blue-400">{`{customerName}`}</span> <span className="text-zinc-600">—</span> Project customer</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
