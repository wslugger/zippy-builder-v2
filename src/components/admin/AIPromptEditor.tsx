'use client';

import React, { useState } from 'react';
import { AIPromptConfig } from '@/src/lib/types';

interface AIPromptEditorProps {
    config: AIPromptConfig;
    onSave: (config: AIPromptConfig) => Promise<void>;
    onReset: () => Promise<void>;
}

export default function AIPromptEditor({ config, onSave, onReset }: AIPromptEditorProps) {
    const [draft, setDraft] = useState<AIPromptConfig>(config);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(draft);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset this prompt to default?")) return;
        setIsResetting(true);
        try {
            await onReset();
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Model and Temperature */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">AI Model</label>
                        <select
                            value={draft.model}
                            onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <optgroup label="Stable Models">
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                            </optgroup>
                            <optgroup label="Preview & Experimental">
                                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Preview)</option>
                                <option value="gemini-3-pro-preview">Gemini 3 Pro (Preview)</option>
                                <option value="gemini-3-flash-preview">Gemini 3 Flash (Preview)</option>
                            </optgroup>
                        </select>
                        <p className="mt-2 text-[11px] text-zinc-400">Select the Gemini model to power this step.</p>
                    </div>

                    <div>
                        <div className="flex justify-between items-baseline mb-2">
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Temperature</label>
                            <span className="text-sm font-mono font-bold text-blue-600">{draft.temperature}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={draft.temperature}
                            onChange={(e) => setDraft({ ...draft, temperature: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                            <span>Precise (0.0)</span>
                            <span>Creative (1.0)</span>
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 mb-2">Prompt Strategy</h4>
                    <p className="text-xs text-blue-800/70 dark:text-blue-400/70 leading-relaxed mb-4">
                        {draft.description}
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>Use <code>{`{variables}`}</code> to inject dynamic context.</span>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

            {/* System Instruction */}
            <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">System Instruction</label>
                <textarea
                    rows={4}
                    value={draft.systemInstruction || ''}
                    onChange={(e) => setDraft({ ...draft, systemInstruction: e.target.value })}
                    placeholder="E.g. You are a Solutions Architect expert..."
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
            </div>

            {/* User Prompt Template */}
            <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">User Prompt Template</label>
                <textarea
                    rows={12}
                    value={draft.userPromptTemplate}
                    onChange={(e) => setDraft({ ...draft, userPromptTemplate: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y"
                />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4">
                <button
                    onClick={handleReset}
                    disabled={isResetting || isSaving}
                    className="text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                    {isResetting ? 'Resetting...' : 'Reset to Default'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving || isResetting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : 'Save Prompt Changes'}
                </button>
            </div>
        </div>
    );
}
