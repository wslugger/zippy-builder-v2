"use client";

import { Equipment, VENDOR_IDS, VENDOR_LABELS, EQUIPMENT_PURPOSES as DEFAULT_PURPOSES, CELLULAR_TYPES as DEFAULT_CELLULAR_TYPES, WIFI_STANDARDS as DEFAULT_WIFI_STANDARDS, EQUIPMENT_STATUSES as DEFAULT_STATUSES } from "@/src/lib/types";
import { useState } from "react";
import { EquipmentService, MetadataService } from "@/src/lib/firebase";
import { useCatalogMetadata } from "@/src/hooks/useCatalogMetadata";

interface EquipmentModalProps {
    equipment: Equipment;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function EquipmentModal({ equipment, isOpen, onClose, onSave }: EquipmentModalProps) {
    const [formData, setFormData] = useState<Equipment>(() => {
        // Deep copy specs to avoid mutating prop
        const data = { ...equipment, specs: { ...equipment.specs } };

        // Migration logic: if rack_units > 0 but no mounting_options, assume Rack
        if (!data.specs.mounting_options && data.specs.rack_units && data.specs.rack_units > 0) {
            data.specs.mounting_options = ["Rack"];
        }
        return data;
    });
    const [activeTab, setActiveTab] = useState<"details" | "json">("details");
    const [isSaving, setIsSaving] = useState(false);

    const { metadata } = useCatalogMetadata("equipment_catalog");
    const purposes = metadata?.fields?.purposes?.values || DEFAULT_PURPOSES;
    const cellularTypes = metadata?.fields?.cellular_types?.values || DEFAULT_CELLULAR_TYPES;
    const wifiStandards = metadata?.fields?.wifi_standards?.values || DEFAULT_WIFI_STANDARDS;
    const statuses = metadata?.fields?.statuses?.values || DEFAULT_STATUSES;
    const interfaceTypes = metadata?.fields?.interface_types?.values || [];
    const mountingOptions = metadata?.fields?.mounting_options?.values || [];
    const recommendedUseCases = metadata?.fields?.recommended_use_cases?.values || [];
    const powerConnectorTypes = metadata?.fields?.power_connector_types?.values || [];

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update metadata for dynamic fields if new values are found
            const metadataUpdates: { field: string, value: string | string[] }[] = [
                { field: 'mounting_options', value: formData.specs.mounting_options || [] },
                { field: 'recommended_use_cases', value: formData.specs.recommended_use_case || "" },
                { field: 'power_connector_types', value: formData.specs.power_connector_type || "" }
            ];

            // Add interface types
            const { type: wanType } = parseInterface(formData.specs.wan_interfaces_desc);
            const { type: lanType } = parseInterface(formData.specs.lan_interfaces_desc);
            if (wanType) metadataUpdates.push({ field: 'interface_types', value: wanType });
            if (lanType) metadataUpdates.push({ field: 'interface_types', value: lanType });

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

    const handleChange = (field: keyof Equipment, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSpecChange = (field: string, value: any) => {
        setFormData({
            ...formData,
            specs: { ...formData.specs, [field]: Number(value) },
        });
    };

    const handlePurposeChange = (purpose: string) => {
        const currentPurposes = Array.isArray(formData.purpose)
            ? formData.purpose
            : [formData.purpose]; // Handle legacy string data

        let newPurposes;
        if (currentPurposes.includes(purpose as any)) {
            newPurposes = currentPurposes.filter((p) => p !== purpose && (purposes as any).includes(p));
        } else {
            newPurposes = [...currentPurposes.filter(p => (purposes as any).includes(p)), purpose];
        }

        // Ensure at least one purpose is selected if possible, or allow empty?
        // Let's allow empty for now, or default to first one if empty is bad.
        // Actually, Zod schema might require min(1). Let's just set the state.

        setFormData({ ...formData, purpose: newPurposes as any });
    };

    const handleMountingChange = (option: string) => {
        const currentOptions = formData.specs.mounting_options || [];
        let newOptions;
        let newRackUnits = formData.specs.rack_units;

        if (currentOptions.includes(option)) {
            newOptions = currentOptions.filter((o) => o !== option);
            if (option === "Rack") {
                newRackUnits = undefined;
            }
        } else {
            newOptions = [...currentOptions, option];
        }
        setFormData({
            ...formData,
            specs: {
                ...formData.specs,
                mounting_options: newOptions,
                rack_units: newRackUnits
            },
        });
    };

    const parseInterface = (desc: string | null | undefined = "") => {
        const safeDesc = desc || "";
        const match = safeDesc.match(/^(\d+)x\s*(.*)$/);
        if (match) {
            return { qty: match[1], type: match[2] };
        }
        return { qty: "", type: safeDesc };
    };

    const joinInterface = (qty: string, type: string) => {
        if (!qty) return type;
        return `${qty}x ${type}`;
    };

    const handleInterfaceChange = (field: 'wan' | 'lan' | 'convertible', part: 'qty' | 'type', value: string) => {
        const descField = `${field}_interfaces_desc` as keyof Equipment['specs'];
        const countField = `${field}_interfaces_count` as keyof Equipment['specs'];

        const currentDesc = formData.specs[descField] as string || "";
        const { qty, type } = parseInterface(currentDesc);

        const newQty = part === 'qty' ? value : qty;
        const newType = part === 'type' ? value : type;

        const newDesc = joinInterface(newQty, newType);

        setFormData({
            ...formData,
            specs: {
                ...formData.specs,
                [descField]: newDesc,
                ...(field !== 'convertible' ? { [countField]: parseInt(newQty) || 0 } : {})
            }
        });
    };

    const wanParts = parseInterface(formData.specs.wan_interfaces_desc);
    const lanParts = parseInterface(formData.specs.lan_interfaces_desc);
    const convertibleParts = parseInterface(formData.specs.convertible_interfaces_desc);

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
                                            onChange={(e) => handleChange("vendor_id", e.target.value)}
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
                                            onChange={(e) => handleChange("status", e.target.value)}
                                            className={inputClass}
                                        >
                                            {statuses.map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelClass}>Purpose</label>
                                        <div className="flex flex-wrap gap-3">
                                            {purposes.map((p) => (
                                                <label key={p} className="flex items-center gap-2.5 cursor-pointer bg-slate-50 dark:bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all hover:border-blue-500 group">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.purpose.includes(p as any)}
                                                        onChange={() => handlePurposeChange(p)}
                                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    />
                                                    <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 group-hover:text-blue-600">{p}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelClass}>Description</label>
                                        <textarea
                                            rows={4}
                                            value={formData.description || ""}
                                            onChange={(e) => handleChange("description", e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Throughput & Performance Card */}
                            <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                <h4 className={sectionTitleClass}>Throughput & Performance</h4>
                                <div className="grid grid-cols-3 gap-x-8 gap-y-8">
                                    <div className="col-span-1">
                                        <label className={labelClass}>NGFW (Mbps)</label>
                                        <div className="relative">
                                            <input type="number" value={formData.specs.ngfw_throughput_mbps || 0} onChange={(e) => handleSpecChange("ngfw_throughput_mbps", e.target.value)} className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Mbps</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Adv. Sec (Mbps)</label>
                                        <div className="relative">
                                            <input type="number" value={formData.specs.adv_sec_throughput_mbps || 0} onChange={(e) => handleSpecChange("adv_sec_throughput_mbps", e.target.value)} className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Mbps</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>VPN (Mbps)</label>
                                        <div className="relative">
                                            <input type="number" value={formData.specs.vpn_throughput_mbps || 0} onChange={(e) => handleSpecChange("vpn_throughput_mbps", e.target.value)} className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Mbps</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>VPN Tunnels</label>
                                        <div className="relative">
                                            <input type="number" value={formData.specs.vpn_tunnels || 0} onChange={(e) => handleSpecChange("vpn_tunnels", e.target.value)} className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">Tunnels</span>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelClass}>Recommended Use Case</label>
                                        <select
                                            value={formData.specs.recommended_use_case || ""}
                                            onChange={(e) => handleSpecChange("recommended_use_case", e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">Select Use Case...</option>
                                            {recommendedUseCases.map((uc: string) => (
                                                <option key={uc} value={uc}>{uc}</option>
                                            ))}
                                            {formData.specs.recommended_use_case && !recommendedUseCases.includes(formData.specs.recommended_use_case) && (
                                                <option value={formData.specs.recommended_use_case}>{formData.specs.recommended_use_case} (Custom)</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* Interfaces Card */}
                            <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                <h4 className={sectionTitleClass}>Interfaces</h4>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                                    <div className="col-span-1">
                                        <label className={labelClass}>WAN Interfaces</label>
                                        <div className="flex gap-3">
                                            <div className="w-24 flex-shrink-0">
                                                <input
                                                    type="text"
                                                    value={wanParts.qty}
                                                    onChange={(e) => handleInterfaceChange('wan', 'qty', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Qty (e.g. 1)"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <select
                                                    value={wanParts.type}
                                                    onChange={(e) => handleInterfaceChange('wan', 'type', e.target.value)}
                                                    className={inputClass}
                                                >
                                                    <option value="">Select Type...</option>
                                                    {interfaceTypes.map((type: string) => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                    {wanParts.type && !interfaceTypes.includes(wanParts.type) && (
                                                        <option value={wanParts.type}>{wanParts.type} (Custom)</option>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>LAN Interfaces</label>
                                        <div className="flex gap-3">
                                            <div className="w-24 flex-shrink-0">
                                                <input
                                                    type="text"
                                                    value={lanParts.qty}
                                                    onChange={(e) => handleInterfaceChange('lan', 'qty', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Qty"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <select
                                                    value={lanParts.type}
                                                    onChange={(e) => handleInterfaceChange('lan', 'type', e.target.value)}
                                                    className={inputClass}
                                                >
                                                    <option value="">Select Type...</option>
                                                    {interfaceTypes.map((type: string) => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                    {lanParts.type && !interfaceTypes.includes(lanParts.type) && (
                                                        <option value={lanParts.type}>{lanParts.type} (Custom)</option>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelClass}>Convertible Interfaces</label>
                                        <div className="flex gap-3">
                                            <div className="w-24 flex-shrink-0">
                                                <input
                                                    type="text"
                                                    value={convertibleParts.qty}
                                                    onChange={(e) => handleInterfaceChange('convertible', 'qty', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Qty"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <select
                                                    value={convertibleParts.type}
                                                    onChange={(e) => handleInterfaceChange('convertible', 'type', e.target.value)}
                                                    className={inputClass}
                                                >
                                                    <option value="">Select Type...</option>
                                                    {interfaceTypes.map((type: string) => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                    {convertibleParts.type && !interfaceTypes.includes(convertibleParts.type) && (
                                                        <option value={convertibleParts.type}>{convertibleParts.type} (Custom)</option>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 pt-4 border-t border-slate-50 dark:border-zinc-800 mt-2">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Integrated Features</h5>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                                <div className="flex gap-6">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.specs.integrated_cellular || false}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                specs: {
                                                                    ...formData.specs,
                                                                    integrated_cellular: e.target.checked,
                                                                    cellular_type: e.target.checked ? formData.specs.cellular_type || "LTE" : undefined
                                                                }
                                                            })}
                                                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                        />
                                                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Integrated Cellular</span>
                                                    </label>

                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.specs.modular_cellular || false}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                specs: {
                                                                    ...formData.specs,
                                                                    modular_cellular: e.target.checked
                                                                }
                                                            })}
                                                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                        />
                                                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Modular Cellular (PIM)</span>
                                                    </label>
                                                </div>
                                                {(formData.specs.integrated_cellular || formData.specs.modular_cellular) && (
                                                    <select
                                                        value={formData.specs.cellular_type || cellularTypes[0]}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            specs: { ...formData.specs, cellular_type: e.target.value as any }
                                                        })}
                                                        className={`${inputClass} py-1.5 h-10 text-xs w-32`}
                                                    >
                                                        {cellularTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.specs.integrated_wifi || false}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            specs: {
                                                                ...formData.specs,
                                                                integrated_wifi: e.target.checked,
                                                                wifi_standard: e.target.checked ? formData.specs.wifi_standard || "Wi-Fi 6" : undefined
                                                            }
                                                        })}
                                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    />
                                                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Integrated Wi-Fi</span>
                                                </label>
                                                {formData.specs.integrated_wifi && (
                                                    <select
                                                        value={formData.specs.wifi_standard || wifiStandards[0]}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            specs: { ...formData.specs, wifi_standard: e.target.value as any }
                                                        })}
                                                        className={`${inputClass} py-1.5 h-10 text-xs w-36`}
                                                    >
                                                        {wifiStandards.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Physical & Power Card */}
                            <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                <h4 className={sectionTitleClass}>Physical & Power</h4>
                                <div className="grid grid-cols-3 gap-x-8 gap-y-8">
                                    <div>
                                        <label className={labelClass}>Power Supply (W)</label>
                                        <div className="relative">
                                            <input type="number" value={formData.specs.power_supply_watts || 0} onChange={(e) => handleSpecChange("power_supply_watts", e.target.value)} className={`${inputClass} pr-10`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">W</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Idle Load (W)</label>
                                        <div className="relative">
                                            <input type="number" value={formData.specs.power_load_idle_watts || 0} onChange={(e) => handleSpecChange("power_load_idle_watts", e.target.value)} className={`${inputClass} pr-10`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">W</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Max Load (W)</label>
                                        <div className="relative">
                                            <input type="number" value={formData.specs.power_load_max_watts || 0} onChange={(e) => handleSpecChange("power_load_max_watts", e.target.value)} className={`${inputClass} pr-10`} />
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
                                                        checked={formData.specs.mounting_options?.includes(option as any) || false}
                                                        onChange={() => handleMountingChange(option)}
                                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    />
                                                    <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 group-hover:text-blue-600">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        {formData.specs.mounting_options?.includes("Rack") && (
                                            <div className="">
                                                <label className={labelClass}>Rack Units</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={formData.specs.rack_units || 0}
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
                                            <input type="number" value={formData.specs.poe_budget || 0} onChange={(e) => handleSpecChange("poe_budget", e.target.value)} className={`${inputClass} pr-10`} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">W</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Power Connector</label>
                                        <select
                                            value={formData.specs.power_connector_type || ""}
                                            onChange={(e) => handleSpecChange("power_connector_type", e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">Select Connector...</option>
                                            {powerConnectorTypes.map((pc: string) => (
                                                <option key={pc} value={pc}>{pc}</option>
                                            ))}
                                            {formData.specs.power_connector_type && !powerConnectorTypes.includes(formData.specs.power_connector_type) && (
                                                <option value={formData.specs.power_connector_type}>{formData.specs.power_connector_type} (Custom)</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                            <pre className="text-xs p-8 overflow-x-auto text-zinc-500 dark:text-zinc-400 font-mono leading-loose">
                                {JSON.stringify(formData, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-white dark:bg-zinc-900 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
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
                </div>
            </div>
        </div>
    );
}
