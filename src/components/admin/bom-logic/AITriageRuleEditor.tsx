"use client";

import React, { useState, useEffect } from 'react';
import { BOMService } from '@/src/lib/firebase/bom-service';
import { TriageCriterion } from '@/src/lib/types';

export const AITriageRuleEditor: React.FC = () => {
    const [criteria, setCriteria] = useState<TriageCriterion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCriterion, setEditingCriterion] = useState<TriageCriterion | null>(null);
    const [toastMessage, setToastMessage] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // Form state
    const [id, setId] = useState('');
    const [label, setLabel] = useState('');
    const [type, setType] = useState<'boolean' | 'string' | 'number'>('boolean');
    const [promptInstruction, setPromptInstruction] = useState('');
    const [forcesGuidedFlow, setForcesGuidedFlow] = useState(false);

    // JSON Import state
    const [isJsonImportOpen, setIsJsonImportOpen] = useState(false);
    const [jsonImportValue, setJsonImportValue] = useState('');

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const fetchCriteria = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await BOMService.fetchTriageCriteria();
            setCriteria(data);
        } catch (error) {
            console.error("Failed to fetch triage criteria:", error);
            showToast("Failed to load AI formatting rules", 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCriteria();
    }, [fetchCriteria]);

    const handleOpenModal = (criterion?: TriageCriterion) => {
        setIsJsonImportOpen(false);
        setJsonImportValue('');
        if (criterion) {
            setEditingCriterion(criterion);
            setId(criterion.id);
            setLabel(criterion.label);
            setType(criterion.type);
            setPromptInstruction(criterion.promptInstruction);
            setForcesGuidedFlow(criterion.forcesGuidedFlow);
        } else {
            setEditingCriterion(null);
            setId('');
            setLabel('');
            setType('boolean');
            setPromptInstruction('');
            setForcesGuidedFlow(false);
        }
        setIsModalOpen(true);
    };

    const handleJsonImport = () => {
        if (!jsonImportValue.trim()) return;
        try {
            const parsed = JSON.parse(jsonImportValue);

            // Validate required keys
            if (
                typeof parsed !== 'object' ||
                parsed === null ||
                !('id' in parsed) ||
                !('label' in parsed) ||
                !('type' in parsed) ||
                !('promptInstruction' in parsed) ||
                !('forcesGuidedFlow' in parsed)
            ) {
                throw new Error('JSON is missing required TriageCriterion fields (id, label, type, promptInstruction, forcesGuidedFlow)');
            }

            // Populate form state
            setId(String(parsed.id));
            setLabel(String(parsed.label));

            // Validate type
            if (['boolean', 'string', 'number'].includes(parsed.type)) {
                setType(parsed.type as 'boolean' | 'string' | 'number');
            } else {
                setType('boolean'); // Fallback
            }

            setPromptInstruction(String(parsed.promptInstruction));
            setForcesGuidedFlow(Boolean(parsed.forcesGuidedFlow));

            setIsJsonImportOpen(false);
            setJsonImportValue('');
            showToast('JSON imported successfully', 'success');
        } catch (error) {
            console.error("JSON Import Error:", error);
            const errorMsg = error instanceof Error ? error.message : "Invalid JSON format";
            showToast(errorMsg, 'error');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!id || !label || !promptInstruction) {
            showToast("Please fill in all required fields", 'error');
            return;
        }

        const criterion: TriageCriterion = {
            id,
            label,
            type,
            promptInstruction,
            forcesGuidedFlow
        };

        try {
            await BOMService.saveTriageCriterion(criterion);
            showToast(`Rule "${label}" saved successfully`, 'success');
            setIsModalOpen(false);
            fetchCriteria();
        } catch (error) {
            console.error("Failed to save criterion:", error);
            showToast("Failed to save rule", 'error');
        }
    };

    const handleDelete = async (idToDelete: string, labelToDelete: string) => {
        if (!confirm(`Are you sure you want to delete the rule "${labelToDelete}"?`)) {
            return;
        }

        try {
            await BOMService.deleteTriageCriterion(idToDelete);
            showToast(`Rule deleted successfully`, 'success');
            fetchCriteria();
        } catch (error) {
            console.error("Failed to delete criterion:", error);
            showToast("Failed to delete rule", 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500 font-medium">Loading rules...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
            {toastMessage && (
                <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'} z-50 transition-opacity`}>
                    {toastMessage.msg}
                </div>
            )}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">AI Triage Context Rules</h3>
                    <p className="text-sm text-slate-500">Inject dynamic schema definitions for the Solutions Architect AI to extract.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
                >
                    ➕ Add Extraction Rule
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID / Label</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Prompt Instruction</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Guided Flow Trigger</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {criteria.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                                    No extraction rules defined.
                                </td>
                            </tr>
                        ) : (
                            criteria.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4">
                                        <div className="font-medium text-slate-900">{c.label}</div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{c.id}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                                            {c.type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 max-w-md">
                                        <div className="text-xs text-slate-600 truncate" title={c.promptInstruction}>
                                            {c.promptInstruction}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {c.forcesGuidedFlow ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                                YES
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                                NO
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => handleOpenModal(c)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded bg-slate-50 hover:bg-blue-50 transition-colors"
                                                title="Edit Rule"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id, c.label)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-slate-50 hover:bg-red-50 transition-colors"
                                                title="Delete Rule"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                ⚙️ {editingCriterion ? 'Edit Extraction Rule' : 'New Extraction Rule'}
                            </h3>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => setIsJsonImportOpen(!isJsonImportOpen)}
                                    className="text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded transition-colors shadow-sm"
                                >
                                    {isJsonImportOpen ? 'Close JSON Import' : '📋 Paste JSON'}
                                </button>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                            </div>
                        </div>

                        {isJsonImportOpen && (
                            <div className="p-6 bg-slate-100 border-b border-slate-200">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Paste JSON Data</label>
                                <textarea
                                    value={jsonImportValue}
                                    onChange={(e) => setJsonImportValue(e.target.value)}
                                    rows={6}
                                    placeholder='{&#10;  "id": "requireLTE",&#10;  "label": "Requires Backup LTE",&#10;  "type": "boolean",&#10;  "promptInstruction": "...",&#10;  "forcesGuidedFlow": true&#10;}'
                                    className="w-full text-[13px] font-mono border-slate-300 rounded-lg p-3 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
                                />
                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={handleJsonImport}
                                        className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors"
                                    >
                                        Load JSON
                                    </button>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rule ID (JSON Key)</label>
                                    <input
                                        type="text"
                                        value={id}
                                        onChange={e => setId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                        placeholder="e.g., isOutdoor"
                                        disabled={!!editingCriterion}
                                        className="w-full text-sm border-slate-300 rounded-lg p-2.5 bg-slate-50 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-60"
                                        required
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Used as the JSON key by the AI.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Human Label</label>
                                    <input
                                        type="text"
                                        value={label}
                                        onChange={e => setLabel(e.target.value)}
                                        placeholder="e.g., Outdoor Rated"
                                        className="w-full text-sm border-slate-300 rounded-lg p-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data Type</label>
                                <select
                                    value={type}
                                    onChange={e => setType(e.target.value as 'boolean' | 'string' | 'number')}
                                    className="w-full text-sm border-slate-300 rounded-lg p-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    <option value="boolean">Boolean (True/False)</option>
                                    <option value="string">String (Text)</option>
                                    <option value="number">Number</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prompt Instruction</label>
                                <textarea
                                    value={promptInstruction}
                                    onChange={e => setPromptInstruction(e.target.value)}
                                    rows={3}
                                    placeholder="Explain exactly what the AI should look for in the user notes to determine this value..."
                                    className="w-full text-sm border-slate-300 rounded-lg p-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                                    required
                                />
                                <p className="text-[10px] text-slate-500 mt-1">This instruction is injected directly into the Gemini extraction prompt.</p>
                            </div>

                            <div className="flex items-center pt-2">
                                <input
                                    type="checkbox"
                                    id="forcesGuidedFlow"
                                    checked={forcesGuidedFlow}
                                    onChange={e => setForcesGuidedFlow(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="ml-3">
                                    <label htmlFor="forcesGuidedFlow" className="text-sm font-semibold text-slate-900 cursor-pointer">
                                        Forces Guided Flow (Manual Review)
                                    </label>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        If the AI extracts a positive value for this rule, the site will be routed to the Guided Flow (skipping Fast Track).
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
                                >
                                    Save Rule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
