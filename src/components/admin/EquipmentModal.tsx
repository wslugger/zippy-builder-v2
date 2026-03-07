/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Equipment, MANAGEMENT_SIZES } from "@/src/lib/types";
import { useState } from "react";
import { EquipmentService } from "@/src/lib/firebase";
import { useSystemConfig } from "@/src/hooks/useSystemConfig";
import { useCatalogMetadata } from "@/src/hooks";
import { InlineCopilotTrigger } from "@/src/components/common/InlineCopilotTrigger";
import { CopilotSuggestion } from "@/src/components/common/CopilotSuggestion";

import { useServices } from "@/src/hooks/useServices";

const BLANK_EQUIPMENT: Equipment = {
    id: "",
    model: "",
    make: "",
    vendor_id: "meraki",
    role: "LAN",
    primary_purpose: "LAN" as any,
    additional_purposes: [] as any,
    family: "",
    description: "",
    status: "Supported",
    active: true,
    mapped_services: [],
    specs: {} as any,
    managementSize: "None" as any,
};

interface EquipmentModalProps {
    equipment: Equipment | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function EquipmentModal({ equipment, isOpen, onClose, onSave }: EquipmentModalProps) {
    const isCreating = !equipment;

    const [formData, setFormData] = useState<Equipment>(() => {
        const base = equipment ?? BLANK_EQUIPMENT;
        // Deep copy specs to avoid mutating prop
        const data = { ...base, specs: { ...base.specs } } as any;

        // Migration logic: if rack_units > 0 but no mounting_options, assume Rack
        if (!data.specs.mounting_options && data.specs.rack_units && data.specs.rack_units > 0) {
            data.specs.mounting_options = ["Rack"];
        }
        return data as Equipment;
    });
    const [activeTab, setActiveTab] = useState<"details" | "licenses" | "json">("details");
    const [isSaving, setIsSaving] = useState(false);

    const { config, updateConfigAsync } = useSystemConfig();
    const { metadata, isLoading: isMetadataLoading } = useCatalogMetadata();
    const { services } = useServices();
    const specs = formData.specs as any;
    const taxonomy = (config?.taxonomy as Record<string, string[]>) || {};

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
        if (!formData.model.trim()) {
            alert("Model name is required.");
            return;
        }
        setIsSaving(true);
        try {
            // Auto-generate ID for new equipment
            if (isCreating && !formData.id) {
                const slug = `${formData.vendor_id}_${formData.model.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;
                (formData as any).id = slug;
            }
            const metadataUpdates: { field: string, value: string | string[] }[] = [
                { field: 'mounting_options', value: specs.mounting_options || [] },
                { field: 'recommended_use_cases', value: specs.recommended_use_case || "" },
                { field: 'power_connector_types', value: specs.power_connector_type || "" }
            ];

            let taxonomyUpdated = false;
            const updatedTaxonomy = { ...taxonomy };

            for (const update of metadataUpdates) {
                const values = Array.isArray(update.value) ? update.value : [update.value];
                const existingValues = updatedTaxonomy[update.field] || [];
                let fieldUpdated = false;

                for (const val of values) {
                    if (val && !existingValues.includes(val)) {
                        existingValues.push(val);
                        fieldUpdated = true;
                    }
                }
                if (fieldUpdated) {
                    updatedTaxonomy[update.field] = existingValues;
                    taxonomyUpdated = true;
                }
            }

            if (taxonomyUpdated) {
                await updateConfigAsync({ taxonomy: updatedTaxonomy as any });
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
            'rawFirewallThroughputMbps', 'sdwanCryptoThroughputMbps', 'advancedSecurityThroughputMbps',
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
            "WAN": "WAN",
            "LAN": "LAN",
            "WLAN": "WLAN",
        };
        const newRole = (ROLE_MAP[purpose] || "LAN") as Equipment['role'];
        // Keep existing specs — changing purpose does not wipe spec data.
        // Specs are now purpose-agnostic (unified flat schema).
        setFormData({
            ...formData,
            primary_purpose: purpose as any,
            role: newRole,
        } as any);
    };

    // All active purposes for this equipment (primary + additional)
    const activePurposes = [formData.primary_purpose, ...(formData.additional_purposes || [])];

    const toggleMappedService = (serviceName: string) => {
        const current = formData.mapped_services || [];
        const next = current.includes(serviceName)
            ? current.filter(s => s !== serviceName)
            : [...current, serviceName];

        setFormData({
            ...formData,
            mapped_services: next
        });
    };

    const handleMountingChange = (option: string) => {
        const currentOptions: string[] = (specs.mounting_options as string[]) || [];
        let newOptions: string[];
        let newRackUnits = specs.rack_units;

        if (currentOptions.includes(option)) {
            newOptions = currentOptions.filter((o: string) => o !== option);
            if (option === "Rack") newRackUnits = undefined;
        } else {
            newOptions = [...currentOptions, option];
        }

        // Single state update to avoid stale closure overwrite from two handleSpecChange calls
        setFormData(prev => ({
            ...prev,
            specs: {
                ...(prev.specs as any),
                mounting_options: newOptions,
                rack_units: newRackUnits,
            },
        } as unknown as Equipment));
    };



    const labelClass = "block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-[0.1em] mb-2 ml-0.5";
    const inputBaseClass = "w-full px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-300";
    const inputClass = `${inputBaseClass} h-[48px]`;
    const selectClass = `${inputClass} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat pr-10 cursor-pointer`;
    const textareaClass = `${inputBaseClass} min-h-[120px] py-4`;
    const sectionTitleClass = "text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-6 block border-b border-slate-100 dark:border-zinc-800 pb-2";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{isCreating ? "Add Equipment" : "Equipment Details"}</h3>
                        <p className="text-xs text-zinc-400 mt-1 font-mono">{isCreating ? "New record" : formData.id}</p>
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
                    <button
                        onClick={() => setActiveTab("licenses")}
                        className={`pb-4 border-b-2 transition-all ${activeTab === "licenses" ? "border-blue-500 text-blue-600 font-bold" : "border-transparent text-zinc-400 hover:text-zinc-800"
                            }`}
                    >
                        Licenses
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/80 dark:bg-zinc-950/50 p-8 space-y-8">
                    {activeTab === "details" && (
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
                                            className={selectClass}
                                            disabled={isMetadataLoading}
                                        >
                                            {isMetadataLoading ? (
                                                <option value="">Loading options...</option>
                                            ) : (
                                                <>
                                                    {metadata.vendors.map((v) => (
                                                        <option key={v} value={v}>
                                                            {v}
                                                        </option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Status</label>
                                        <select
                                            value={formData.status || "Supported"}
                                            onChange={(e) => handleChange("status", e.target.value as Equipment['status'])}
                                            className={selectClass}
                                            disabled={isMetadataLoading}
                                        >
                                            {isMetadataLoading ? (
                                                <option value="">Loading options...</option>
                                            ) : (
                                                <>
                                                    {metadata.statuses.map((s) => (
                                                        <option key={s} value={s}>
                                                            {s}
                                                        </option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Primary Purpose</label>
                                        <select
                                            value={formData.primary_purpose || ""}
                                            onChange={(e) => handlePrimaryPurposeChange(e.target.value)}
                                            className={selectClass}
                                            disabled={isMetadataLoading}
                                        >
                                            {isMetadataLoading ? (
                                                <option value="">Loading options...</option>
                                            ) : (
                                                <>
                                                    <option value="">Select Purpose...</option>
                                                    {metadata.purposes.map((p) => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Additional Purposes</label>
                                        <div className="flex flex-wrap gap-2">
                                            {isMetadataLoading ? (
                                                <div className="text-sm text-zinc-500">Loading options...</div>
                                            ) : (
                                                metadata.purposes.map((p) => p !== formData.primary_purpose && (
                                                    <label key={p} className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-all hover:border-blue-500 group">
                                                        <input
                                                            type="checkbox"
                                                            checked={(formData.additional_purposes || []).includes(p as any)}
                                                            onChange={() => {
                                                                const current = formData.additional_purposes || [];
                                                                const next = current.includes(p as any)
                                                                    ? current.filter(px => px !== p)
                                                                    : [...current, p];
                                                                setFormData({ ...formData, additional_purposes: next as any });
                                                            }}
                                                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 group-hover:text-blue-600">{p}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-2 mt-4">
                                        <label className={labelClass}>Mapped Services (Used in Logic)</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                            {services.map((service) => (
                                                <label key={service.id} className="flex items-center gap-2 cursor-pointer transition-all hover:opacity-80 group">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.mapped_services || []).includes(service.name)}
                                                        onChange={() => toggleMappedService(service.name)}
                                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                                    />
                                                    <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-300 group-hover:text-blue-600 truncate" title={service.name}>
                                                        {service.name}
                                                    </span>
                                                </label>
                                            ))}
                                            {services.length === 0 && (
                                                <div className="col-span-full text-center py-2 text-zinc-400 text-xs italic">
                                                    No services found in catalog
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Management Size</label>
                                        <select
                                            value={formData.managementSize || "None"}
                                            onChange={(e) => handleChange("managementSize", e.target.value as Equipment['managementSize'])}
                                            className={selectClass}
                                        >
                                            {MANAGEMENT_SIZES.map((size) => (
                                                <option key={size} value={size}>
                                                    {size}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelClass}>Mounting Options</label>
                                        <div className="flex flex-wrap gap-2.5">
                                            {isMetadataLoading ? (
                                                <div className="text-sm text-zinc-500">Loading options...</div>
                                            ) : (
                                                metadata.mountingOptions.map((option: string) => (
                                                    <label key={option} className="flex items-center gap-2.5 cursor-pointer bg-slate-50 dark:bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all hover:border-blue-500 group">
                                                        <input
                                                            type="checkbox"
                                                            checked={(specs.mounting_options as string[])?.includes(option) || false}
                                                            onChange={() => handleMountingChange(option)}
                                                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                        />
                                                        <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 group-hover:text-blue-600">{option}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        {specs.mounting_options?.includes("Rack") && (
                                            <div>
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
                                                className={textareaClass}
                                            />
                                        </CopilotSuggestion>
                                    </div>
                                </div>
                            </section>

                            {/* Pricing Information Card */}
                            <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                <h4 className={sectionTitleClass}>Pricing Information</h4>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                                    <div className="col-span-1">
                                        <label className={labelClass}>Purchase Price (OTC) ($)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                            <input
                                                type="number"
                                                value={formData.pricing?.purchasePrice ?? formData.listPrice ?? formData.price ?? 0}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    pricing: { ...(formData.pricing || {}), purchasePrice: Number(e.target.value) },
                                                    listPrice: Number(e.target.value) // Keep legacy field in sync just in case
                                                } as any)}
                                                className={`${inputClass} pl-8`}
                                                placeholder="0.00"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Monthly Rental Price (MRC) ($)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                            <input
                                                type="number"
                                                value={formData.pricing?.rentalPrice ?? 0}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    pricing: { ...(formData.pricing || {}), rentalPrice: Number(e.target.value) }
                                                } as any)}
                                                className={`${inputClass} pl-8`}
                                                placeholder="0.00"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Throughput & Performance Card - WAN purpose */}
                            {activePurposes.includes('WAN') && (
                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                    <h4 className={sectionTitleClass}>WAN — Throughput & Performance</h4>
                                    <div className="grid grid-cols-1 gap-y-8">
                                        <div className="grid grid-cols-3 gap-x-8 gap-y-8">
                                            <div className="col-span-1">
                                                <label className={labelClass}>
                                                    Raw Firewall (Mbps)
                                                    <span className="text-slate-400 font-normal mt-1 block normal-case tracking-normal">
                                                        Guidance: Clear-text stateful firewall routing without VPNs or IPS.
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={specs.rawFirewallThroughputMbps ?? 0}
                                                        onChange={(e) => handleSpecChange("rawFirewallThroughputMbps", e.target.value)}
                                                        className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`}
                                                    />
                                                    <span className="absolute right-4 top-[14px] text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-zinc-800 px-1 py-0.5 rounded">Mbps</span>
                                                </div>
                                            </div>
                                            <div className="col-span-1">
                                                <label className={labelClass}>
                                                    SD-WAN Crypto (Mbps)
                                                    <span className="text-slate-400 font-normal mt-1 block normal-case tracking-normal">
                                                        Guidance: Throughput with tunnels built but security handled off-box. Look for &apos;VPN throughput&apos;, &apos;IPsec IMIX&apos;, or &apos;SD-WAN Routing&apos; (e.g. Meraki VPN, Cisco IPsec, HPE Silver Peak).
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={specs.sdwanCryptoThroughputMbps ?? 0}
                                                        onChange={(e) => handleSpecChange("sdwanCryptoThroughputMbps", e.target.value)}
                                                        className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`}
                                                    />
                                                    <span className="absolute right-4 top-[14px] text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-zinc-800 px-1 py-0.5 rounded">Mbps</span>
                                                </div>
                                            </div>
                                            <div className="col-span-1">
                                                <label className={labelClass}>
                                                    Advanced Security (Mbps)
                                                    <span className="text-slate-400 font-normal mt-1 block normal-case tracking-normal">
                                                        Guidance: Throughput with on-box deep packet inspection (IDS/IPS) active. Look for &apos;Threat Defense&apos;, &apos;IDS/IPS&apos;, or &apos;Advanced Security&apos; (e.g. Meraki Adv. Sec, Cisco Threat Defense, HPE Aruba).
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={specs.advancedSecurityThroughputMbps ?? 0}
                                                        onChange={(e) => handleSpecChange("advancedSecurityThroughputMbps", e.target.value)}
                                                        className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`}
                                                    />
                                                    <span className="absolute right-4 top-[14px] text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-zinc-800 px-1 py-0.5 rounded">Mbps</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-x-8 gap-y-8">
                                            <div className="col-span-1">
                                                <label className={labelClass}>VPN Tunnels</label>
                                                <div className="relative">
                                                    <input type="number" value={specs.vpn_tunnels || 0} onChange={(e) => handleSpecChange("vpn_tunnels", e.target.value)} className={`${inputClass} pr-14 font-bold text-slate-900 dark:text-white`} />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-zinc-800 px-1 py-0.5 rounded">Tunnels</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* WAN Interfaces Card */}
                            {activePurposes.includes('WAN') && (
                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                    <h4 className={sectionTitleClass}>WAN — Ports & Interfaces</h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                                        <div className="col-span-1">
                                            <label className={labelClass}>
                                                WAN Port Count
                                                <span className="text-slate-400 font-normal block normal-case tracking-normal">For circuits.</span>
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
                                                WAN Port Type
                                                <span className="invisible block normal-case tracking-normal">Spacer</span>
                                            </label>
                                            <select
                                                value={specs.wanPortType || ""}
                                                onChange={(e) => handleSpecChange('wanPortType', e.target.value)}
                                                className={selectClass}
                                                disabled={isMetadataLoading}
                                            >
                                                {isMetadataLoading ? (
                                                    <option value="">Loading options...</option>
                                                ) : (
                                                    <>
                                                        <option value="">Select Speed...</option>
                                                        {metadata.interfaceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>
                                                LAN Port Count
                                                <span className="text-slate-400 font-normal block normal-case tracking-normal">For switch handoff & HA.</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={specs.lanPortCount ?? 0}
                                                onChange={(e) => handleSpecChange('lanPortCount', parseInt(e.target.value) || 0)}
                                                className={inputClass}
                                                placeholder="Qty (e.g. 4)"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>
                                                LAN Port Type
                                                <span className="invisible block normal-case tracking-normal">Spacer</span>
                                            </label>
                                            <select
                                                value={specs.lanPortType || ""}
                                                onChange={(e) => handleSpecChange('lanPortType', e.target.value)}
                                                className={selectClass}
                                                disabled={isMetadataLoading}
                                            >
                                                {isMetadataLoading ? (
                                                    <option value="">Loading options...</option>
                                                ) : (
                                                    <>
                                                        <option value="">Select Speed...</option>
                                                        {metadata.interfaceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* LAN Interfaces Card */}
                            {activePurposes.includes('LAN') && (
                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                    <h4 className={sectionTitleClass}>LAN — Ports & Switching</h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                                        <div className="col-span-1">
                                            <label className={labelClass}>
                                                Access Port Count
                                                <span className="invisible block normal-case tracking-normal">Spacer</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={specs.accessPortCount ?? 0}
                                                onChange={(e) => handleSpecChange('accessPortCount', parseInt(e.target.value) || 0)}
                                                className={inputClass}
                                                placeholder="Qty (e.g. 24, 48)"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>
                                                Uplink Port Count
                                                <span className="invisible block normal-case tracking-normal">Spacer</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={specs.uplinkPortCount ?? 0}
                                                onChange={(e) => handleSpecChange('uplinkPortCount', parseInt(e.target.value) || 0)}
                                                className={inputClass}
                                                placeholder="Qty (e.g. 4)"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass} title="Copper supports PoE. Fiber is for aggregation/distribution. mGig covers 2.5G/5G.">
                                                Access Port Type <span className="opacity-50 block font-normal normal-case">Hover for details</span>
                                            </label>
                                            <select
                                                value={specs.accessPortType || ""}
                                                onChange={(e) => handleSpecChange('accessPortType', e.target.value)}
                                                className={selectClass}
                                                disabled={isMetadataLoading}
                                            >
                                                {isMetadataLoading ? (
                                                    <option value="">Loading options...</option>
                                                ) : (
                                                    <>
                                                        <option value="">Select Speed...</option>
                                                        {metadata.interfaceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>
                                                Uplink Port Type
                                                <span className="invisible block normal-case tracking-normal">Spacer</span>
                                            </label>
                                            <select
                                                value={specs.uplinkPortType || ""}
                                                onChange={(e) => handleSpecChange('uplinkPortType', e.target.value)}
                                                className={selectClass}
                                                disabled={isMetadataLoading}
                                            >
                                                {isMetadataLoading ? (
                                                    <option value="">Loading options...</option>
                                                ) : (
                                                    <>
                                                        <option value="">Select Speed...</option>
                                                        {metadata.interfaceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass} title="Total switch PoE capacity (e.g., 370W, 740W).">
                                                PoE Budget (Watts) <span className="ml-1 opacity-50 block font-normal normal-case">Hover for details</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={specs.poe_budget ?? specs.poeBudgetWatts ?? 0}
                                                onChange={(e) => handleSpecChange('poe_budget', parseInt(e.target.value) || 0)}
                                                className={inputClass}
                                                placeholder="Watts"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>
                                                PoE Capabilities
                                                <span className="invisible block normal-case tracking-normal">Spacer</span>
                                            </label>
                                            <select
                                                value={specs.poe_capabilities || ""}
                                                onChange={(e) => handleSpecChange("poe_capabilities", e.target.value)}
                                                className={selectClass}
                                                disabled={isMetadataLoading}
                                            >
                                                {isMetadataLoading ? (
                                                    <option value="">Loading options...</option>
                                                ) : (
                                                    <>
                                                        <option value="">Select PoE Capability...</option>
                                                        {metadata.poeCapabilities?.map((p: string) => (
                                                            <option key={p} value={p}>{p}</option>
                                                        ))}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>Stackable</label>
                                            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 dark:bg-zinc-800 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all hover:border-blue-500">
                                                <input
                                                    type="checkbox"
                                                    checked={specs.isStackable || false}
                                                    onChange={(e) => handleSpecChange("isStackable", e.target.checked)}
                                                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                />
                                                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Supports Stacking</span>
                                            </label>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* WLAN Specs Card */}
                            {activePurposes.includes('WLAN') && (
                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                                    <h4 className={sectionTitleClass}>WLAN — Wireless Specifications</h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                                        <div className="col-span-1">
                                            <label className={labelClass}>
                                                Wi-Fi Standard
                                                <span className="invisible block normal-case tracking-normal">Spacer</span>
                                            </label>
                                            <select
                                                value={specs.wifiStandard || ""}
                                                onChange={(e) => handleSpecChange('wifiStandard', e.target.value)}
                                                className={selectClass}
                                                disabled={isMetadataLoading}
                                            >
                                                {isMetadataLoading ? (
                                                    <option value="">Loading options...</option>
                                                ) : (
                                                    <>
                                                        <option value="">Select Standard...</option>
                                                        {metadata.wifiStandards.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>
                                                MIMO Density
                                                <span className="invisible block normal-case tracking-normal">Spacer</span>
                                            </label>
                                            <select
                                                value={specs.mimoBandwidth || ""}
                                                onChange={(e) => handleSpecChange('mimoBandwidth', e.target.value)}
                                                className={selectClass}
                                            >
                                                <option value="">Select Density...</option>
                                                <option value="2x2">2x2</option>
                                                <option value="4x4">4x4</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass} title="The required switchport speed. High-end Wi-Fi 7 often requires 10G-Copper.">
                                                Uplink Type <span className="opacity-50 block font-normal normal-case">Hover for details</span>
                                            </label>
                                            <select
                                                value={specs.uplinkType || ""}
                                                onChange={(e) => handleSpecChange('uplinkType', e.target.value)}
                                                className={selectClass}
                                                disabled={isMetadataLoading}
                                            >
                                                {isMetadataLoading ? (
                                                    <option value="">Loading options...</option>
                                                ) : (
                                                    <>
                                                        <option value="">Select Type...</option>
                                                        {metadata.interfaceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass} title="Crucial for switch PoE sizing. (Usually 15W to 45W).">
                                                Max Power Draw (Watts) <span className="ml-1 opacity-50 block font-normal normal-case">Hover for details</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={specs.powerDrawWatts ?? 0}
                                                onChange={(e) => handleSpecChange('powerDrawWatts', parseInt(e.target.value) || 0)}
                                                className={inputClass}
                                                placeholder="Watts"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>Environment</label>
                                            <select
                                                value={specs.environment || ""}
                                                onChange={(e) => handleSpecChange('environment', e.target.value)}
                                                className={selectClass}
                                            >
                                                <option value="">Select Environment...</option>
                                                <option value="Indoor">Indoor</option>
                                                <option value="Outdoor">Outdoor</option>
                                                <option value="Hazardous">Hazardous</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>
                                                PoE Requirement
                                                <span className="invisible block normal-case tracking-normal">Spacer</span>
                                            </label>
                                            <select
                                                value={specs.poe_capabilities || ""}
                                                onChange={(e) => handleSpecChange("poe_capabilities", e.target.value)}
                                                className={selectClass}
                                                disabled={isMetadataLoading}
                                            >
                                                {isMetadataLoading ? (
                                                    <option value="">Loading options...</option>
                                                ) : (
                                                    <>
                                                        <option value="">Select PoE Required...</option>
                                                        {metadata.poeCapabilities?.map((p: string) => (
                                                            <option key={p} value={p}>{p}</option>
                                                        ))}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            )}




                            {/* Modular Components Sections - LAN and WAN purposes */}
                            {(activePurposes.includes('LAN') || activePurposes.includes('WAN')) && (
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

                        </div>
                    )}

                    {activeTab === "licenses" && (
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-8">
                            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Compatible Licenses</h4>
                                    <p className="text-xs text-zinc-500 mt-1">Add licensing SKUs that this equipment supports.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const newLicenses = [...((formData as any).licenses || []), { id: "", tier: "advanced", termLength: "1YR" }];
                                        handleChange("licenses" as any, newLicenses as any);
                                    }}
                                    className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                >
                                    + Add License
                                </button>
                            </div>
                            <div className="space-y-3">
                                {(!(formData as any).licenses || (formData as any).licenses.length === 0) && (
                                    <div className="text-center py-8 text-zinc-400 text-xs italic bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                        No licenses added yet.
                                    </div>
                                )}
                                {(formData as any).licenses?.map((lic: any, i: number) => (
                                    <div key={i} className="grid grid-cols-12 gap-3 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700">
                                        <div className="col-span-5 relative">
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1 block">License SKU / ID</label>
                                            <input
                                                type="text" placeholder="e.g. LIC-MX68-SEC-3YR"
                                                value={lic.id}
                                                onChange={(e) => {
                                                    const newLic = [...((formData as any).licenses || [])];
                                                    newLic[i].id = e.target.value;
                                                    handleChange("licenses" as any, newLic as any);
                                                }}
                                                className="w-full text-sm p-3 rounded-lg border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1 block">Tier (e.g. advanced)</label>
                                            <input
                                                type="text" placeholder="Tier"
                                                value={lic.tier}
                                                onChange={(e) => {
                                                    const newLic = [...((formData as any).licenses || [])];
                                                    newLic[i].tier = e.target.value;
                                                    handleChange("licenses" as any, newLic as any);
                                                }}
                                                className="w-full text-sm p-3 rounded-lg border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1 block">Term Length</label>
                                            <input
                                                type="text" placeholder="e.g. 1YR, 3YR"
                                                value={lic.termLength}
                                                onChange={(e) => {
                                                    const newLic = [...((formData as any).licenses || [])];
                                                    newLic[i].termLength = e.target.value;
                                                    handleChange("licenses" as any, newLic as any);
                                                }}
                                                className="w-full text-sm p-3 rounded-lg border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="col-span-1 flex items-end justify-center pb-2">
                                            <button
                                                onClick={() => {
                                                    const newLic = [...((formData as any).licenses || [])];
                                                    newLic.splice(i, 1);
                                                    handleChange("licenses" as any, newLic as any);
                                                }}
                                                className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                                title="Remove License"
                                            >✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "json" && (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                            <pre className="text-xs p-8 overflow-x-auto text-zinc-500 dark:text-zinc-400 font-mono leading-loose">
                                {JSON.stringify(formData, null, 2)}
                            </pre>
                        </div>
                    )}
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
                        {isSaving ? "Saving..." : isCreating ? "Add Equipment" : "Save Changes"}
                    </button>
                </div >
            </div >
        </div >
    );
}
