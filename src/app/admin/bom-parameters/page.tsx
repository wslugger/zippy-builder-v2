"use client";

import { useEffect, useState } from "react";
import { SYSTEM_PARAMETERS, SystemParameterDefinition } from "@/src/lib/types";
import { getGlobalParameters, updateGlobalParameters } from "@/src/lib/firebase/settings";

export default function BOMParametersPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [params, setParams] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            const current = await getGlobalParameters();
            setParams(current);
            setLoading(false);
        };
        load();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateGlobalParameters(params);
            alert("Settings saved successfully.");
        } catch (error) {
            console.error(error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const renderInput = (paramDef: SystemParameterDefinition) => {
        const value = params[paramDef.id] !== undefined ? params[paramDef.id] : paramDef.defaultValue;

        if (paramDef.options) {
            return (
                <select
                    value={value}
                    onChange={(e) => setParams({ ...params, [paramDef.id]: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white"
                >
                    {paramDef.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        if (paramDef.type === 'boolean') {
            return (
                <div className="mt-1 flex items-center">
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => setParams({ ...params, [paramDef.id]: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-500">{value ? "Enabled" : "Disabled"}</span>
                </div>
            );
        }

        return (
            <input
                type={paramDef.type === 'number' ? "number" : "text"}
                value={value}
                onChange={(e) => {
                    const val = e.target.value;
                    const parsedVal = paramDef.type === "number" ? (val === '' ? '' : Number(val)) : val;
                    setParams({ ...params, [paramDef.id]: parsedVal });
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white"
            />
        );
    };

    if (loading) {
        return (
            <div className="py-8 px-4 sm:px-6 lg:px-8">
                <main className="max-w-4xl mx-auto flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin text-blue-500">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-500">Loading Configuration...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8">
            <main className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">BOM Engine Global Parameters</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Adjust system-wide logic configurations here. These settings will apply to any location that does not have explicit Rule-based overrides.
                    </p>
                </div>

                <form onSubmit={handleSave} className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6 space-y-6">
                        {SYSTEM_PARAMETERS.map(paramDef => (
                            <div key={paramDef.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                                <div className="md:col-span-1">
                                    <h3 className="text-sm font-semibold text-gray-900">{paramDef.label}</h3>
                                    <p className="mt-1 text-xs text-gray-500">{paramDef.description}</p>
                                    <p className="mt-2 text-[10px] text-gray-400 font-mono">ID: {paramDef.id}</p>
                                </div>
                                <div className="md:col-span-2">
                                    {renderInput(paramDef)}
                                    <p className="mt-2 text-xs text-gray-400">
                                        System Default: <span className="font-mono">{String(paramDef.defaultValue)}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 rounded-b-lg border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
                        >
                            {saving ? "Saving..." : "Save Configuration"}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
