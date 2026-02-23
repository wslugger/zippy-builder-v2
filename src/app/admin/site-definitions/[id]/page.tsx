"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SiteDefinitionService } from "@/src/lib/firebase";
import { SiteType, SiteConstraint } from "@/src/lib/site-types";
import { useSystemConfig } from "@/src/hooks/useSystemConfig";

export default function EditSiteDefinitionPage() {
    const { id } = useParams();
    const router = useRouter();

    const [def, setDef] = useState<SiteType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { config, isLoading: metadataLoading } = useSystemConfig();

    // Helper to get values from catalog or fallback to empty array
    const getCatalogValues = (fieldKey: string) => {
        return (config?.taxonomy as Record<string, string[]>)?.[fieldKey] || [];
    };

    useEffect(() => {
        const init = async () => {
            if (id === "new") {
                setDef({
                    id: "",
                    name: "New Site Type",
                    category: "SD-WAN",
                    description: "",
                    constraints: [],
                    defaults: {
                        requiredServices: [],
                        redundancy: { cpe: "Single CPE", circuit: "Single Circuit" },
                        slo: 99.9
                    }
                });
                setLoading(false);
            } else {
                setLoading(true);
                const data = await SiteDefinitionService.getSiteDefinitionById(id as string);
                setDef(data as SiteType);
                setLoading(false);
            }
        };
        init();
    }, [id]);

    async function handleSave() {
        if (!def) return;
        setSaving(true);
        try {
            const savePayload = { ...def };
            if (!savePayload.id) {
                // Generate ID from name if new
                savePayload.id = savePayload.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
            }
            await SiteDefinitionService.saveSiteDefinition(savePayload);
            router.push("/admin/site-definitions");
        } catch (e) {
            alert("Error saving definition");
            console.error(e);
        }
        setSaving(false);
    }

    // Helper to update state
    const updateDef = (field: keyof SiteType, value: string | number | boolean | unknown[]) => {
        if (def) setDef({ ...def, [field]: value });
    };

    const updateDefault = (field: string, value: string | number | string[]) => {
        if (def) setDef({ ...def, defaults: { ...def.defaults, [field]: value } });
    }

    const updateRedundancy = (field: 'cpe' | 'circuit', value: string) => {
        if (def) {
            setDef({
                ...def,
                defaults: {
                    ...def.defaults,
                    redundancy: { ...def.defaults.redundancy, [field]: value }
                }
            });
        }
    }

    // Constraint Management
    const addConstraint = () => {
        if (!def) return;
        const types = getCatalogValues('technical_constraint_types');
        const newConstraint: SiteConstraint = {
            id: `c_${Date.now()}`,
            type: types.length > 0 ? types[0] : "hardware",
            description: "New Constraint"
        };
        setDef({ ...def, constraints: [...def.constraints, newConstraint] });
    };

    const removeConstraint = (cId: string) => {
        if (!def) return;
        setDef({ ...def, constraints: def.constraints.filter(c => c.id !== cId) });
    };

    const updateConstraint = (cId: string, field: keyof SiteConstraint, value: string | number | boolean | object) => {
        if (!def) return;
        setDef({
            ...def,
            constraints: def.constraints.map(c => c.id === cId ? { ...c, [field]: value } : c)
        });
    };

    if (loading || metadataLoading) return <div className="p-8">Loading...</div>;
    if (!def) return <div className="p-8">Definition not found.</div>;

    const cpeRedundancyTypes = getCatalogValues('cpe_redundancy_types');
    const circuitRedundancyTypes = getCatalogValues('circuit_redundancy_types');
    const constraintTypes = getCatalogValues('technical_constraint_types');
    const sloTargets = getCatalogValues('slo_targets');

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">{id === 'new' ? 'New Site Type' : `Edit: ${def.name}`}</h1>
                <div className="space-x-4">
                    <Link href="/admin/site-definitions" className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</Link>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {/* General Info */}
                <section className="bg-white p-6 rounded shadow-sm border border-slate-200">
                    <h2 className="text-lg font-medium text-slate-900 mb-4">General Information</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                {def.category === 'SD-WAN' ? 'Classification' : 'Name'}
                            </label>
                            <input
                                type="text"
                                value={def.name}
                                onChange={e => updateDef('name', e.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-700">Category</label>
                            <select
                                id="category"
                                value={def.category}
                                onChange={e => updateDef('category', e.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="SD-WAN">SD-WAN</option>
                                <option value="LAN">LAN</option>
                                <option value="WLAN">WLAN</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Description</label>
                            <textarea
                                value={def.description}
                                onChange={e => updateDef('description', e.target.value)}
                                rows={3}
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>
                </section>

                {/* Service Profile / Defaults & Logic */}
                <section className="bg-white p-6 rounded shadow-sm border border-slate-200">
                    <h2 className="text-lg font-medium text-slate-900 mb-4">Service Profile & Logic</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">SLO Target (%)</label>
                            {sloTargets.length > 0 ? (
                                <select
                                    value={def.defaults.slo.toString()}
                                    onChange={e => updateDefault('slo', parseFloat(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                >
                                    {sloTargets.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            ) : (
                                <input
                                    type="number"
                                    step="0.01"
                                    value={def.defaults.slo}
                                    onChange={e => updateDefault('slo', parseFloat(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                />
                            )}
                        </div>
                        {def.category === 'SD-WAN' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">CPE Redundancy</label>
                                    <select
                                        value={def.defaults.redundancy?.cpe || ""}
                                        onChange={e => updateRedundancy('cpe', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    >
                                        {cpeRedundancyTypes.length > 0 ? (
                                            cpeRedundancyTypes.map(t => <option key={t} value={t}>{t}</option>)
                                        ) : (
                                            <>
                                                <option value="Single">Single CPE</option>
                                                <option value="Dual">Dual CPE (HA)</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Circuit Redundancy</label>
                                    <select
                                        value={def.defaults.redundancy?.circuit || ""}
                                        onChange={e => updateRedundancy('circuit', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    >
                                        {circuitRedundancyTypes.length > 0 ? (
                                            circuitRedundancyTypes.map(t => <option key={t} value={t}>{t}</option>)
                                        ) : (
                                            <>
                                                <option value="Single">Single Circuit</option>
                                                <option value="Dual">Dual Circuit</option>
                                                <option value="Hybrid">Hybrid (DIA + Broadband)</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* Constraints */}
                <section className="bg-white p-6 rounded shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-slate-900">Technical Constraints</h2>
                        <button onClick={addConstraint} className="text-sm text-blue-600 hover:text-blue-800">+ Add Constraint</button>
                    </div>

                    <div className="space-y-4">
                        {def.constraints.map((c, idx) => (
                            <div key={c.id} className="flex items-start space-x-4 p-4 bg-slate-50 rounded border border-slate-200">
                                <div className="flex-1 grid grid-cols-3 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-slate-500 uppercase">Type</label>
                                        <select
                                            value={c.type}
                                            onChange={e => updateConstraint(c.id, 'type', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-slate-300 text-sm"
                                        >
                                            {constraintTypes.length > 0 ? (
                                                constraintTypes.map(t => <option key={t} value={t}>{t}</option>)
                                            ) : (
                                                <>
                                                    <option value="redundancy">Redundancy</option>
                                                    <option value="throughput">Throughput</option>
                                                    <option value="circuit">Circuit</option>
                                                    <option value="security">Security</option>
                                                    <option value="hardware">Hardware</option>
                                                    <option value="poe">PoE</option>
                                                    <option value="vlan">VLAN</option>
                                                    <option value="software">Software</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 uppercase">Description / Rule</label>
                                        <input
                                            type="text"
                                            value={c.description}
                                            onChange={e => updateConstraint(c.id, 'description', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-slate-300 text-sm"
                                        />
                                    </div>
                                </div>
                                <button onClick={() => removeConstraint(c.id)} className="text-red-500 hover:text-red-700 mt-6">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                        {def.constraints.length === 0 && (
                            <p className="text-sm text-slate-500 italic text-center py-4">No constraints defined.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
