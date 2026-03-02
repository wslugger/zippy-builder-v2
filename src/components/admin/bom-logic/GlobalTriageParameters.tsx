"use client";

import React, { useState, useEffect } from 'react';
import { getGlobalParameters, updateGlobalParameters } from '@/src/lib/firebase/settings';

export const GlobalTriageParameters: React.FC = () => {
    const [maxUsers, setMaxUsers] = useState<number>(15);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    useEffect(() => {
        const fetchParams = async () => {
            try {
                const params = await getGlobalParameters();
                if (params.max_standard_branch_users !== undefined) {
                    setMaxUsers(Number(params.max_standard_branch_users));
                }
            } catch (error) {
                console.error("Failed to fetch global parameters:", error);
                showToast("Failed to load settings", 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchParams();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateGlobalParameters({
                max_standard_branch_users: maxUsers
            });
            showToast("Settings saved successfully", 'success');
        } catch (error) {
            console.error("Failed to save global parameters:", error);
            showToast("Failed to save settings", 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex items-center justify-center">
                <div className="text-slate-500 font-medium">Loading parameters...</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            {toastMessage && (
                <div className={`absolute top-4 right-4 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'} z-50 transition-opacity`}>
                    {toastMessage.msg}
                </div>
            )}

            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Global Engine Parameters</h3>
                <p className="text-sm text-slate-500">Configure global thresholds that affect the automated site triage and BOM generation.</p>
            </div>

            <div className="p-6 space-y-6">
                <div className="max-w-md">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Maximum Users for Standard Branch
                    </label>
                    <div className="flex gap-4">
                        <input
                            type="number"
                            value={maxUsers}
                            onChange={(e) => setMaxUsers(parseInt(e.target.value) || 0)}
                            className="w-32 text-sm border-slate-300 rounded-lg p-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Sites with an estimated user count above this value will be flagged for manual review.
                    </p>
                </div>
            </div>
        </div >
    );
};
