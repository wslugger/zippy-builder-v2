/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Equipment, VENDOR_IDS, VENDOR_LABELS, EQUIPMENT_PURPOSES as DEFAULT_PURPOSES, CELLULAR_TYPES as DEFAULT_CELLULAR_TYPES, WIFI_STANDARDS as DEFAULT_WIFI_STANDARDS, EQUIPMENT_STATUSES as DEFAULT_STATUSES } from "@/src/lib/types";
import { useState } from "react";
import { EquipmentService, MetadataService } from "@/src/lib/firebase";
import { useCatalogMetadata } from "@/src/hooks/useCatalogMetadata";
import { InlineCopilotTrigger } from "@/src/components/common/InlineCopilotTrigger";
import { CopilotSuggestion } from "@/src/components/common/CopilotSuggestion";

interface EquipmentModalProps {
    equipment: Equipment;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function EquipmentModal({ equipment, isOpen, onClose, onSave }: EquipmentModalProps) {
    const [formData, setFormData] = useState<Equipment>(() => {
        // Deep copy specs to avoid mutating prop
        const data = { ...equipment, specs: { ...equipment.specs } } as any;

        // Migration logic: if rack_units > 0 but no mounting_options, assume Rack
        if (!data.specs.mounting_options && data.specs.rack_units && data.specs.rack_units > 0) {
            data.specs.mounting_options = ["Rack"];
        }
        return data as Equipment;
    });
    const [activeTab, setActiveTab] = useState<"details" | "json">("details");
    const [isSaving, setIsSaving] = useState(false);

    const { metadata } = useCatalogMetadata("equipment_catalog");
    const specs = formData.specs as any;
    const purposes = metadata?.fields?.purposes?.values || DEFAULT_PURPOSES;
    const cellularTypes = metadata?.fields?.cellular_types?.values || DEFAULT_CELLULAR_TYPES;
    const wifiStandards = metadata?.fields?.wifi_standards?.values || DEFAULT_WIFI_STANDARDS;
    const statuses = metadata?.fields?.statuses?.values || DEFAULT_STATUSES;
    const mountingOptions = metadata?.fields?.mounting_options?.values || [];
    const recommendedUseCases = metadata?.fields?.recommended_use_cases?.values || [];
    const powerConnectorTypes = metadata?.fields?.power_connector_types?.values || [];

    const [descriptionSuggestion, setDescriptionSuggestion] = useState<string | null>(null);
    const [isLoadingDescriptionCopilot, setIsLoadingDescriptionCopilot] = useState(false);

    const handleAskDescriptionCopilot = async () => {
        setIsLoadingDescriptionCopilot(true);
        try {
            const res = await fetch("/api/copilot-suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contextType: "admin_service_description",
                    promptData: {
                        name: formData.model || formData.id,
                        shortDescription: `Equipment Model: ${formData.model}, Family: ${formData.family}`
                    }
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.suggestion) {
                    setDescriptionSuggestion(data.suggestion);
                }
            }
        } catch (error) {
            console.error("Failed to suggest description", error);
        } finally {
            setIsLoadingDescriptionCopilot(false);
        }
    };

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const metadataUpdates: { field: string, value: string | string[] }[] = [
                { field: 'mounting_options', value: specs.mounting_options || [] },
                { field: 'recommended_use_cases', value: specs.recommended_use_case || "" },
                { field: 'power_connector_types', value: specs.power_connector_type || "" }
            ];

            for (const update of metadataUpdates) {
                const values = Array.isArray(update.value) ? update.value : [update.value];
                const existingValues = (metadata?.fields?.[update.field]?.values || []) as string[];

                for (const val of values) {
                    if (val && !existingValues.includes(val)) {
                        await MetadataService.updateCatalogField("equipment_catalog", update.field, val);
                    }
                }
            }

            await EquipmentService.saveEquipment(formData);
            onSave(); // Refresh parent
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = <K extends keyof Equipment>(field: K, value: Equipment[K]) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSpecChange = (field: string, value: any) => {
        let finalValue = value;

        // Only convert to number if it's a numeric field and the input is a string that looks like a number
        const numericFields: string[] = [
            'ngfw_throughput_mbps', 'adv_sec_throughput_mbps', 'vpn_throughput_mbps',
            'vpn_tunnels', 'power_supply_watts', 'power_load_idle_watts', 'power_load_max_watts',
            'ports', 'poe_budget', 'power_rating_watts', 'rack_units', 'max_clients',
            'stacking_bandwidth_gbps', 'forwarding_rate_mpps', 'switching_capacity_gbps',
            'wanPortCount', 'lanPortCount', 'sfpPortCount', 'accessPortCount', 'uplinkPortCount'
        ];

        if (numericFields.includes(field) && typeof value === 'string' && value !== '') {
            finalValue = Number(value);
        }

        setFormData({
            ...formData,
            specs: { ...formData.specs, [field]: finalValue },
        } as unknown as Equipment);
    };

    const handlePrimaryPurposeChange = (purpose: string) => {
        const ROLE_MAP: Record<string, string> = {
            "SDWAN": "WAN",
            "LAN": "LAN",
            "WLAN": "WLAN",
            "Security": "SECURITY"
        };
        const newRole = (ROLE_MAP[purpose] || "LAN") as Equipment['role'];
        const roleChanged = newRole !== formData.role;

        setFormData({
            ...formData,
            primary_purpose: purpose as any,
            role: newRole,
            specs: roleChanged ? ({} as any) : formData.specs
        } as any);
    };

    const handleAdditionalPurposeChange = (purpose: string) => {
        const current = formData.additional_purposes || [];
        const next = current.includes(purpose as any)
            ? current.filter(p => p !== purpose)
            : [...current, purpose];

        setFormData({
            ...formData,
            additional_purposes: next as any
        } as any);
    };

    const handleMountingChange = (option: string) => {
        const currentOptions = specs.mounting_options || [];
        let newOptions;
        let newRackUnits = specs.rack_units;

        if (currentOptions.includes(option)) {
            newOptions = currentOptions.filter((o: string) => o !== option);
            if (option === "Rack") {
                newRackUnits = undefined;
            }
        } else {
            newOptions = [...currentOptions, option];
        }
        handleSpecChange("mounting_options", newOptions);
        handleSpecChange("rack_units", newRackUnits);
    };



    const labelClass = "block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-[0.1em] mb-2 ml-0.5";
    const inputClass = "w-full px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-300";
    const sectionTitleClass = "text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-6 block border-b border-slate-100 dark:border-zinc-800 pb-2";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Equipment Details</h3>
                        <p className="text-xs text-zinc-400 mt-1 font-mono">{formData.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-8 pt-2 gap-6 border-b border-zinc-100 dark:border-zinc-800 text-sm">
                    <button
                        onClick={() => setActiveTab("details")}
                        className={`pb-4 border-b-2 transition-all ${activeTab === "details" ? "border-blue-500 text-blue-600 font-bold" : "border-transparent text-zinc-400 hover:text-zinc-800"
                            }`}
                    >
                        Details & Specs
                    </button>
                    <button
                        onClick={() => setActiveTab("json")}
                        className={`pb-4 border-b-2 transition-all ${activeTab === "json" ? "border-blue-500 text-blue-600 font-bold" : "border-transparent text-zinc-400 hover:text-zinc-800"
                            }`}
                    >
                        Raw JSON
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/80 dark:bg-zinc-950/50 p-8 space-y-8">
                    {activeTab === "details" ? (
                        <div className="space-y-8">
                            {/* General Information Card */}
                            <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                <h4 className={sectionTitleClass}>General Information</h4>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                                    <div className="col-span-1">
                                        <label className={labelClass}>Model Name</label>
                                        <input
                                            type="text"
                                            value={formData.model}
                                            onChange={(e) => handleChange("model", e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Family</label>
                                        <input
                                            type="text"
                                            value={formData.family || ""}
                                            onChange={(e) => handleChange("family", e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Vendor</label>
                                        <select
                                            value={formData.vendor_id}
                                            onChange={(e) => handleChange("vendor_id", e.target.value as Equipment['vendor_id'])}
                                            className={inputClass}
                                        >
                                            {VENDOR_IDS.map((v) => (
                                                <option key={v} value={v}>
                                                    {VENDOR_LABELS[v]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Status</label>
                                        <select
                                            value={formData.status || "Supported"}
                                            onChange={(e) => handleChange("status", e.target.value as Equipment['status'])}
                                            className={inputClass}
                                        >
                                            {statuses.map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Primary Purpose</label>
                                        <select
                                            value={formData.primary_purpose || ""}
                                            onChange={(e) => handlePrimaryPurposeChange(e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">Select Purpose...</option>
                                            {purposes.map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Additional Purposes</label>
                                        <div className="flex flex-wrap gap-2">
                                            {purposes.map((p) => p !== formData.primary_purpose && (
                                                <label key={p} className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-all hover:border-blue-500 group">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.additional_purposes || []).includes(p as any)}
                                                        onChange={() => handleAdditionalPurposeChange(p)}
                                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 group-hover:text-blue-600">{p}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={`${labelClass} flex items-center`}>
                                            Description
                                            <InlineCopilotTrigger
                                                onClick={handleAskDescriptionCopilot}
                                                isLoading={isLoadingDescriptionCopilot}
                                                title="Generate description based on model"
                                            />
                                        </label>
                                        <CopilotSuggestion
                                            suggestion={descriptionSuggestion}
                                            onAccept={() => {
                                                handleChange("description", descriptionSuggestion || "");
                                                setDescriptionSuggestion(null);
                                            }}
                                            onReject={() => setDescriptionSuggestion(null)}
                                        >
                                            <textarea
                                                rows={4}
                                                value={formData.description || ""}
                                                onChange={(e) => {
                                                    handleChange("description", e.target.value);
                                                    setDescriptionSuggestion(null);
                                                }}
                                                className={inputClass}
                                            />
                                        </CopilotSuggestion>
                                    </div>
                                </div>
                            </section>

                            {/* Throughput & Performance Card - Primarily for WAN */}
                            {formData.role === 'WAN' && (
                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                    <h4 className={sectionTitleClass}>Throughput & Performance</h4>
                                    <div className="grid grid-cols-3 gap-x-8 gap-y-8">
                                        <div className="col-span-1">
                                            <label className={labelClass}>NGFW (Mbps)</label>
                                            <div className="relative">
                                                <input type="number" value={specs.ngfw_throughput_mbps || 0} onChange={(e) => handleSpecChange("ngfw_throughput_mbps", e.target.value)} className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`} />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Mbps</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>Adv. Sec (Mbps)</label>
                                            <div className="relative">
                                                <input type="number" value={specs.adv_sec_throughput_mbps || 0} onChange={(e) => handleSpecChange("adv_sec_throughput_mbps", e.target.value)} className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`} />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Mbps</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>VPN (Mbps)</label>
                                            <div className="relative">
                                                <input type="number" value={specs.vpn_throughput_mbps || 0} onChange={(e) => handleSpecChange("vpn_throughput_mbps", e.target.value)} className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`} />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Mbps</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>VPN Tunnels</label>
                                            <div className="relative">
                                                <input type="number" value={specs.vpn_tunnels || 0} onChange={(e) => handleSpecChange("vpn_tunnels", e.target.value)} className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`} />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Tunnels</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className={labelClass}>Recommended Use Case</label>
                                            <select
                                                value={specs.recommended_use_case || ""}
                                                onChange={(e) => handleSpecChange("recommended_use_case", e.target.value)}
                                                className={inputClass}
                                            >
                                                <option value="">Select Use Case...</option>
                                                {recommendedUseCases.map((uc: string) => (
                                                    <option key={uc} value={uc}>{uc}</option>
                                                ))}
                                                {specs.recommended_use_case && !recommendedUseCases.includes(specs.recommended_use_case) && (
                                                    <option value={specs.recommended_use_case}>{specs.recommended_use_case} (Custom)</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Interfaces Card */}
                            {(formData.role === 'WAN' || formData.role === 'LAN' || formData.role === 'WLAN') && (
                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                    <h4 className={sectionTitleClass}>Interfaces</h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                                        {formData.role === 'WAN' && (
                                            <>
                                                <div className="col-span-1">
                                                    <label className={labelClass}>
                                                        WAN Port Count
                                                        <span className="text-slate-400 font-normal ml-2 block normal-case tracking-normal">WAN: For circuits.</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={specs.wanPortCount ?? 0}
                                                        onChange={(e) => handleSpecChange('wanPortCount', parseInt(e.target.value) || 0)}
                                                        className={inputClass}
                                                        placeholder="Qty (e.g. 2)"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className={labelClass}>
                                                        LAN Port Count
                                                        <span className="text-slate-400 font-normal ml-2 block normal-case tracking-normal">LAN: For switch handoff & HA.</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={specs.lanPortCount ?? 0}
                                                        onChange={(e) => handleSpecChange('lanPortCount', parseInt(e.target.value) || 0)}
                                                        className={inputClass}
                                                        placeholder="Qty (e.g. 4)"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {formData.role === 'LAN' && (
                                            <>
                                                <div className="col-span-1">
                                                    <label className={labelClass}>Access Port Count</label>
                                                    <input
                                                        type="number"
                                                        value={specs.accessPortCount ?? 0}
                                                        onChange={(e) => handleSpecChange('accessPortCount', parseInt(e.target.value) || 0)}
                                                        className={inputClass}
                                                        placeholder="Qty (e.g. 24, 48)"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className={labelClass}>Uplink Port Count</label>
                                                    <input
                                                        type="number"
                                                        value={specs.uplinkPortCount ?? 0}
                                                        onChange={(e) => handleSpecChange('uplinkPortCount', parseInt(e.target.value) || 0)}
                                                        className={inputClass}
                                                        placeholder="Qty (e.g. 4)"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className={labelClass}>Access Port Speed</label>
                                                    <select
                                                        value={specs.accessPortType || ""}
                                                        onChange={(e) => handleSpecChange('accessPortType', e.target.value)}
                                                        className={inputClass}
                                                    >
                                                        <option value="">Select Speed...</option>
                                                        <option value="1G">1G</option>
                                                        <option value="mGig">mGig</option>
                                                        <option value="10G">10G</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-1">
                                                    <label className={labelClass}>Uplink Port Speed</label>
                                                    <select
                                                        value={specs.uplinkPortType || ""}
                                                        onChange={(e) => handleSpecChange('uplinkPortType', e.target.value)}
                                                        className={inputClass}
                                                    >
                                                        <option value="">Select Speed...</option>
                                                        <option value="1G">1G</option>
                                                        <option value="10G">10G</option>
                                                        <option value="40G">40G</option>
                                                        <option value="100G">100G</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {formData.role === 'WLAN' && (
                                            <div className="col-span-2 grid grid-cols-2 gap-x-8">
                                                <div className="col-span-1">
                                                    <label className={labelClass}>Uplink Port Speed</label>
                                                    <select
                                                        value={specs.uplinkPortType || ""}
                                                        onChange={(e) => handleSpecChange('uplinkPortType', e.target.value)}
                                                        className={inputClass}
                                                    >
                                                        <option value="1G">1G</option>
                                                        <option value="mGig">mGig</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </section>
                            )}




                            {/* Physical & Power Card */}
                            <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                <h4 className={sectionTitleClass}>Physical & Power</h4>
                                <div className="grid grid-cols-3 gap-x-8 gap-y-8">
                                    <div>
                                        <label className={labelClass}>Power Supply (W)</label>
                                        <div className="relative">
                                            <input type="number" value={specs.power_supply_watts || 0} onChange={(e) => handleSpecChange("power_supply_watts", e.target.value)} className={`${inputClass} pr-10`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">W</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Idle Load (W)</label>
                                        <div className="relative">
                                            <input type="number" value={specs.power_load_idle_watts || 0} onChange={(e) => handleSpecChange("power_load_idle_watts", e.target.value)} className={`${inputClass} pr-10`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">W</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Max Load (W)</label>
                                        <div className="relative">
                                            <input type="number" value={specs.power_load_max_watts || 0} onChange={(e) => handleSpecChange("power_load_max_watts", e.target.value)} className={`${inputClass} pr-10`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">W</span>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelClass}>Mounting Options</label>
                                        <div className="flex flex-wrap gap-2.5">
                                            {mountingOptions.map((option: string) => (
                                                <label key={option} className="flex items-center gap-2.5 cursor-pointer bg-slate-50 dark:bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all hover:border-blue-500 group">
                                                    <input
                                                        type="checkbox"
                                                        checked={(specs.mounting_options as string[])?.includes(option) || false}
                                                        onChange={() => handleMountingChange(option)}
                                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    />
                                                    <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 group-hover:text-blue-600">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        {specs.mounting_options?.includes("Rack") && (
                                            <div className="">
                                                <label className={labelClass}>Rack Units</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={specs.rack_units || 0}
                                                        onChange={(e) => handleSpecChange("rack_units", e.target.value)}
                                                        className={`${inputClass} pr-10`}
                                                        placeholder="U Size"
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">U</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>PoE Budget (W)</label>
                                        <div className="relative">
                                            <input type="number" value={specs.poe_budget || 0} onChange={(e) => handleSpecChange("poe_budget", e.target.value)} className={`${inputClass} pr-10`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">W</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Power Connector</label>
                                        <select
                                            value={specs.power_connector_type || ""}
                                            onChange={(e) => handleSpecChange("power_connector_type", e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">Select Connector...</option>
                                            {powerConnectorTypes.map((pc: string) => (
                                                <option key={pc} value={pc}>{pc}</option>
                                            ))}
                                            {specs.power_connector_type && !powerConnectorTypes.includes(specs.power_connector_type) && (
                                                <option value={specs.power_connector_type}>{specs.power_connector_type} (Custom)</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* Switching & Performance Card - Only show for LAN role */}
                            {formData.role === 'LAN' && (
                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                    <h4 className={sectionTitleClass}>Switching & Performance</h4>
                                    <div className="grid grid-cols-3 gap-x-8 gap-y-8">
                                        <div className="col-span-1">
                                            <label className={labelClass}>Forwarding Rate (Mpps)</label>
                                            <div className="relative">
                                                <input type="number" step="0.01" value={specs.forwarding_rate_mpps || 0} onChange={(e) => handleSpecChange("forwarding_rate_mpps", e.target.value)} className={`${inputClass} pr-14`} />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Mpps</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>Switching Capacity (Gbps)</label>
                                            <div className="relative">
                                                <input type="number" value={specs.switching_capacity_gbps || 0} onChange={(e) => handleSpecChange("switching_capacity_gbps", e.target.value)} className={`${inputClass} pr-14`} />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Gbps</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>PoE Capabilities</label>
                                            <input type="text" placeholder="e.g. PoE+, UPOE" value={specs.poe_capabilities || ""} onChange={(e) => handleSpecChange("poe_capabilities", e.target.value)} className={inputClass} />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Stacking & High Availability Card - LAN and WAN */}
                            {(formData.role === 'LAN' || formData.role === 'WAN') && (
                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                    <h4 className={sectionTitleClass}>Stacking & Power Redundancy</h4>
                                    <div className="grid grid-cols-3 gap-x-8 gap-y-8">
                                        <div className="col-span-1">
                                            <label className={labelClass}>Performance Rating</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Wire Rate"
                                                value={specs.performance_rating || ""}
                                                onChange={(e) => handleSpecChange("performance_rating", e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>Stacking Support</label>
                                            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 dark:bg-zinc-800 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all hover:border-blue-500">
                                                <input
                                                    type="checkbox"
                                                    checked={specs.stacking_supported || false}
                                                    onChange={(e) => handleSpecChange("stacking_supported", e.target.checked)}
                                                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                />
                                                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Stackable</span>
                                            </label>
                                        </div>
                                        {specs.stacking_supported && (
                                            <div className="col-span-1">
                                                <label className={labelClass}>Stack Bandwidth (Gbps)</label>
                                                <div className="relative">
                                                    <input type="number" value={specs.stacking_bandwidth_gbps || 0} onChange={(e) => handleSpecChange("stacking_bandwidth_gbps", e.target.value)} className={`${inputClass} pr-14`} />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Gbps</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="col-span-1">
                                            <label className={labelClass}>Primary Power Supply</label>
                                            <input type="text" placeholder="Model #" value={specs.primary_power_supply || ""} onChange={(e) => handleSpecChange("primary_power_supply", e.target.value)} className={inputClass} />
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>Secondary Power Supply</label>
                                            <input type="text" placeholder="Model #" value={specs.secondary_power_supply || ""} onChange={(e) => handleSpecChange("secondary_power_supply", e.target.value)} className={inputClass} />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Modular Components Sections - LAN and WAN */}
                            {(formData.role === 'LAN' || formData.role === 'WAN') && (
                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                    <h4 className={sectionTitleClass}>Modular Components & Accessories</h4>

                                    {/* Uplink Modules */}
                                    <div className="mb-8">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                                            Compatible Uplink Modules
                                            <button
                                                onClick={() => handleSpecChange("compatible_uplink_modules", [...(specs.compatible_uplink_modules || []), { part_number: "", description: "", ports: 0, speed: "" }])}
                                                className="text-blue-500 hover:text-blue-700 normal-case font-bold"
                                            >
                                                + Add Module
                                            </button>
                                        </h5>
                                        <div className="space-y-3">
                                            {specs.compatible_uplink_modules?.map((mod: any, i: number) => (
                                                <div key={i} className="grid grid-cols-12 gap-3 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700">
                                                    <input
                                                        type="text" placeholder="Part #"
                                                        value={mod.part_number}
                                                        onChange={(e) => {
                                                            const newMods = [...(specs.compatible_uplink_modules || [])];
                                                            newMods[i].part_number = e.target.value;
                                                            handleSpecChange("compatible_uplink_modules", newMods);
                                                        }}
                                                        className="col-span-3 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <input
                                                        type="text" placeholder="Description"
                                                        value={mod.description}
                                                        onChange={(e) => {
                                                            const newMods = [...(specs.compatible_uplink_modules || [])];
                                                            newMods[i].description = e.target.value;
                                                            handleSpecChange("compatible_uplink_modules", newMods);
                                                        }}
                                                        className="col-span-4 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <input
                                                        type="number" placeholder="Ports"
                                                        value={mod.ports || 0}
                                                        onChange={(e) => {
                                                            const newMods = [...(specs.compatible_uplink_modules || [])];
                                                            newMods[i].ports = parseInt(e.target.value);
                                                            handleSpecChange("compatible_uplink_modules", newMods);
                                                        }}
                                                        className="col-span-2 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <input
                                                        type="text" placeholder="Speed"
                                                        value={mod.speed}
                                                        onChange={(e) => {
                                                            const newMods = [...(specs.compatible_uplink_modules || [])];
                                                            newMods[i].speed = e.target.value;
                                                            handleSpecChange("compatible_uplink_modules", newMods);
                                                        }}
                                                        className="col-span-2 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newMods = [...(specs.compatible_uplink_modules || [])];
                                                            newMods.splice(i, 1);
                                                            handleSpecChange("compatible_uplink_modules", newMods);
                                                        }}
                                                        className="col-span-1 text-red-500 hover:text-red-700"
                                                    >✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Power Supplies */}
                                    <div className="mb-8">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                                            Compatible Power Supplies Sets
                                            <button
                                                onClick={() => handleSpecChange("compatible_power_supplies", [...(specs.compatible_power_supplies || []), { part_number: "", description: "", wattage: 0, poe_budget: 0 }])}
                                                className="text-blue-500 hover:text-blue-700 normal-case font-bold"
                                            >
                                                + Add PSU
                                            </button>
                                        </h5>
                                        <div className="space-y-3">
                                            {specs.compatible_power_supplies?.map((psu: any, i: number) => (
                                                <div key={i} className="grid grid-cols-12 gap-3 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700">
                                                    <input
                                                        type="text" placeholder="Part #"
                                                        value={psu.part_number}
                                                        onChange={(e) => {
                                                            const newPsus = [...(specs.compatible_power_supplies || [])];
                                                            newPsus[i].part_number = e.target.value;
                                                            handleSpecChange("compatible_power_supplies", newPsus);
                                                        }}
                                                        className="col-span-3 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <input
                                                        type="text" placeholder="Description"
                                                        value={psu.description}
                                                        onChange={(e) => {
                                                            const newPsus = [...(specs.compatible_power_supplies || [])];
                                                            newPsus[i].description = e.target.value;
                                                            handleSpecChange("compatible_power_supplies", newPsus);
                                                        }}
                                                        className="col-span-4 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <input
                                                        type="number" placeholder="Watts"
                                                        value={psu.wattage || 0}
                                                        onChange={(e) => {
                                                            const newPsus = [...(specs.compatible_power_supplies || [])];
                                                            newPsus[i].wattage = parseInt(e.target.value);
                                                            handleSpecChange("compatible_power_supplies", newPsus);
                                                        }}
                                                        className="col-span-2 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <input
                                                        type="number" placeholder="PoE (W)"
                                                        value={psu.poe_budget || 0}
                                                        onChange={(e) => {
                                                            const newPsus = [...(specs.compatible_power_supplies || [])];
                                                            newPsus[i].poe_budget = parseInt(e.target.value);
                                                            handleSpecChange("compatible_power_supplies", newPsus);
                                                        }}
                                                        className="col-span-2 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newPsus = [...(specs.compatible_power_supplies || [])];
                                                            newPsus.splice(i, 1);
                                                            handleSpecChange("compatible_power_supplies", newPsus);
                                                        }}
                                                        className="col-span-1 text-red-500 hover:text-red-700"
                                                    >✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Stacking Options */}
                                    <div>
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                                            Stacking Accessories
                                            <button
                                                onClick={() => handleSpecChange("compatible_stacking_options", [...(specs.compatible_stacking_options || []), { part_number: "", description: "", length_cm: 0 }])}
                                                className="text-blue-500 hover:text-blue-700 normal-case font-bold"
                                            >
                                                + Add Stacking Item
                                            </button>
                                        </h5>
                                        <div className="space-y-3">
                                            {specs.compatible_stacking_options?.map((opt: any, i: number) => (
                                                <div key={i} className="grid grid-cols-12 gap-3 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700">
                                                    <input
                                                        type="text" placeholder="Part #"
                                                        value={opt.part_number}
                                                        onChange={(e) => {
                                                            const newOpts = [...(specs.compatible_stacking_options || [])];
                                                            newOpts[i].part_number = e.target.value;
                                                            handleSpecChange("compatible_stacking_options", newOpts);
                                                        }}
                                                        className="col-span-3 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <input
                                                        type="text" placeholder="Description"
                                                        value={opt.description}
                                                        onChange={(e) => {
                                                            const newOpts = [...(specs.compatible_stacking_options || [])];
                                                            newOpts[i].description = e.target.value;
                                                            handleSpecChange("compatible_stacking_options", newOpts);
                                                        }}
                                                        className="col-span-6 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <input
                                                        type="number" placeholder="Len (cm)"
                                                        value={opt.length_cm || 0}
                                                        onChange={(e) => {
                                                            const newOpts = [...(specs.compatible_stacking_options || [])];
                                                            newOpts[i].length_cm = parseInt(e.target.value);
                                                            handleSpecChange("compatible_stacking_options", newOpts);
                                                        }}
                                                        className="col-span-2 text-xs p-2 rounded border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newOpts = [...(specs.compatible_stacking_options || [])];
                                                            newOpts.splice(i, 1);
                                                            handleSpecChange("compatible_stacking_options", newOpts);
                                                        }}
                                                        className="col-span-1 text-red-500 hover:text-red-700"
                                                    >✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Security / Fallback section */}
                            {formData.role === 'SECURITY' && (
                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                    <h4 className={sectionTitleClass}>Security Specifications</h4>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Security equipment attributes are managed via the raw JSON tab until a dedicated schema is finalized.</p>
                                </section>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                            <pre className="text-xs p-8 overflow-x-auto text-zinc-500 dark:text-zinc-400 font-mono leading-loose">
                                {JSON.stringify(formData, null, 2)}
                            </pre>
                        </div>
                    )
                    }
                </div >

                {/* Footer */}
                < div className="px-8 py-6 bg-white dark:bg-zinc-900 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]" >
                    <button onClick={onClose} className="px-6 py-2.5 text-sm text-slate-500 hover:text-slate-800 font-bold transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div >
            </div >
        </div >
    );
}
