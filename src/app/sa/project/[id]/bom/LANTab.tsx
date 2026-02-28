import { Site, BOMLineItem } from "@/src/lib/bom-types";
import { SiteType } from "@/src/lib/site-types";
import { Equipment, LANPreferences } from "@/src/lib/types";
import { TraceabilityPopover } from "@/src/components/common/TraceabilityPopover";
import { InlineCopilotTrigger } from "@/src/components/common/InlineCopilotTrigger";
import { CopilotSuggestion } from "@/src/components/common/CopilotSuggestion";
import { useState, useEffect } from "react";
import { useSystemConfig } from "@/src/hooks/useSystemConfig";

interface LANTabProps {
    selectedSite: Site;
    siteTypes: SiteType[];
    handleSiteUpdate: (updates: Partial<Site>) => void;
    lanItem?: BOMLineItem;
    manualSelections: Record<string, string>;
    setManualSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    catalog: Equipment[];
    setSelectedSpecsItem: (eq: Equipment | null) => void;
    updateLANPreference: (siteId: string, key: keyof LANPreferences, value: string | number) => void;
    preferenceMismatchWarning: boolean;
}

export function LANTab({
    selectedSite,
    siteTypes,
    handleSiteUpdate,
    lanItem,
    manualSelections,
    setManualSelections,
    catalog,
    setSelectedSpecsItem,
    updateLANPreference,
    preferenceMismatchWarning
}: LANTabProps) {
    const [lanPortsSuggestion, setLanPortsSuggestion] = useState<number | null>(null);
    const [isLoadingLanPortsCopilot, setIsLoadingLanPortsCopilot] = useState(false);
    const { config } = useSystemConfig();
    const [animatePulse, setAnimatePulse] = useState(false);

    useEffect(() => {
        if (lanItem?.itemId) {
            setAnimatePulse(true);
            const timer = setTimeout(() => setAnimatePulse(false), 700);
            return () => clearTimeout(timer);
        }
    }, [lanItem?.itemId, lanItem?.quantity]);

    const poeRequirements = config?.validPoeTypes
        ? config.validPoeTypes.split(',').map(item => item.trim()).filter(Boolean)
        : ['None', 'PoE+', 'PoE++', 'UPoE'];

    const redundancyModes = config?.validRedundancyModes
        ? config.validRedundancyModes.split(',').map(item => item.trim()).filter(Boolean)
        : ['Standalone', 'Stacking', 'Chassis', 'M-LAG'];

    const interfaceTypes = config?.taxonomy?.interface_types || [
        '1G-Copper', '10G-Copper', 'mGig-Copper', '1G-Fiber', '10G-Fiber', '25G-Fiber', '40G-Fiber', '100G-Fiber'
    ];

    const infraOpts = {
        poeRequirements,
        redundancyModes,
        uplinkSpeeds: interfaceTypes,
        accessPortSpeeds: interfaceTypes,
    };

    const prefs = selectedSite.lanPreferences || {
        poeRequirementId: '',
        uplinkSpeedId: '',
        accessPortSpeedId: '',
        redundancyModeId: '',
        portDensity: 48
    };

    const handleAskLanPortsCopilot = async () => {
        setIsLoadingLanPortsCopilot(true);
        try {
            const res = await fetch("/api/copilot-suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contextType: "sa_lan_ports",
                    promptData: {
                        lanSiteTypeName: siteTypes.find(t => t.id === selectedSite.lanSiteTypeId)?.name || "Unknown"
                    }
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.suggestion) {
                    setLanPortsSuggestion(data.suggestion);
                }
            }
        } catch (error) {
            console.error("Failed to suggest LAN ports", error);
        } finally {
            setIsLoadingLanPortsCopilot(false);
        }
    };

    const handleAlternativeChange = (newEquipmentId: string) => {
        setManualSelections(prev => {
            const next = { ...prev };
            const key = `${selectedSite.name}:managed_lan`;
            if (newEquipmentId) {
                next[key] = newEquipmentId;
            } else {
                delete next[key];
            }
            return next;
        });
    };

    const handleResetOverride = () => {
        setManualSelections(prev => {
            const next = { ...prev };
            delete next[`${selectedSite.name}:managed_lan`];
            return next;
        });
    };

    return (
        <div className="space-y-6">
            {preferenceMismatchWarning && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm flex items-start justify-between">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <span className="text-yellow-400">⚠️</span>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                <strong>Manual Override Detected:</strong> Your LAN preferences have changed, but this site has a manual hardware lock applied. The engine&apos;s calculations are currently paused.
                            </p>
                        </div>
                    </div>
                    <div>
                        <button onClick={handleResetOverride} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-bold py-1 px-3 rounded uppercase transition duration-150 ease-in-out">
                            Reset to Recommended Hardware
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">LAN Infrastructure Preferences</h3>

                {/* Endpoint Delivery Section */}
                <div className="mb-6">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">Endpoint Delivery</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Access Port Speed</label>
                            <select
                                className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:border-blue-500 shadow-sm sm:text-sm transition-colors duration-200 hover:bg-white"
                                value={prefs.accessPortSpeedId}
                                onChange={(e) => updateLANPreference(selectedSite.id || selectedSite.name, 'accessPortSpeedId', e.target.value)}
                            >
                                <option value="">Any (1G Default)</option>
                                {infraOpts.accessPortSpeeds.map(val => <option key={val} value={val}>{val}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">PoE Requirement</label>
                            <select
                                className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:border-blue-500 shadow-sm sm:text-sm transition-colors duration-200 hover:bg-white"
                                value={prefs.poeRequirementId}
                                onChange={(e) => updateLANPreference(selectedSite.id || selectedSite.name, 'poeRequirementId', e.target.value)}
                            >
                                <option value="">Any (Standard Default)</option>
                                {infraOpts.poeRequirements.map(val => <option key={val} value={val}>{val}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Port Density Target</label>
                            <select
                                className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:border-blue-500 shadow-sm sm:text-sm transition-colors duration-200 hover:bg-white"
                                value={prefs.portDensity || 48}
                                onChange={(e) => updateLANPreference(selectedSite.id || selectedSite.name, 'portDensity', parseInt(e.target.value) || 48)}
                            >
                                <option value={24}>24-Port Form Factor</option>
                                <option value={48}>48-Port Form Factor</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Backbone Section */}
                <div className="mb-6">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">Backbone Connectivity</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Uplink Speed</label>
                            <select
                                className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:border-blue-500 shadow-sm sm:text-sm transition-colors duration-200 hover:bg-white"
                                value={prefs.uplinkSpeedId}
                                onChange={(e) => updateLANPreference(selectedSite.id || selectedSite.name, 'uplinkSpeedId', e.target.value)}
                            >
                                <option value="">Any (10G Default)</option>
                                {infraOpts.uplinkSpeeds.map(val => <option key={val} value={val}>{val}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Redundancy Model</label>
                            <select
                                className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:border-blue-500 shadow-sm sm:text-sm transition-colors duration-200 hover:bg-white"
                                value={prefs.redundancyModeId}
                                onChange={(e) => updateLANPreference(selectedSite.id || selectedSite.name, 'redundancyModeId', e.target.value)}
                            >
                                <option value="">Standalone (Default)</option>
                                {infraOpts.redundancyModes.map(val => <option key={val} value={val}>{val}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-8">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center">
                            Estimated Users / Endpoints
                            <InlineCopilotTrigger
                                onClick={handleAskLanPortsCopilot}
                                isLoading={isLoadingLanPortsCopilot}
                                title="Suggest port count based on site type"
                            />
                        </label>
                        <CopilotSuggestion
                            suggestion={lanPortsSuggestion}
                            onAccept={() => {
                                handleSiteUpdate({ userCount: lanPortsSuggestion || 0 });
                                setLanPortsSuggestion(null);
                            }}
                            onReject={() => setLanPortsSuggestion(null)}
                        >
                            <input
                                type="number"
                                className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 sm:text-sm"
                                value={selectedSite.userCount || ""}
                                onChange={(e) => {
                                    handleSiteUpdate({ userCount: parseInt(e.target.value) || 0 });
                                    setLanPortsSuggestion(null);
                                }}
                                placeholder="e.g. 50"
                            />
                        </CopilotSuggestion>
                    </div>
                </div>
            </div>

            {/* Generated BOM for LAN */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Recommended Switch Hardware</h3>
                {lanItem ? (
                    <div className="flex flex-col space-y-4">
                        <div className={`transition-all duration-300 flex items-center justify-between p-4 border rounded-lg ${animatePulse ? 'bg-blue-100/70 border-blue-400' : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40'}`}>
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg">🔌</div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center">
                                        {lanItem.itemName}
                                        <TraceabilityPopover matchedRules={lanItem.matchedRules} reasoning={lanItem.reasoning} />
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-col space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100/50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                💡 System Resolved
                                            </span>
                                            <span>{lanItem.reasoning}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const eq = catalog.find(e => e.id === lanItem.itemId);
                                                if (eq) setSelectedSpecsItem(eq);
                                            }}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider mt-2 flex items-center w-fit"
                                        >
                                            View Specs
                                            <svg className="w-2.5 h-2.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 uppercase">Quantity</div>
                                <div className="text-2xl font-black text-blue-600">{lanItem.quantity}</div>
                                {lanItem.pricing?.netPrice !== undefined && (
                                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                                        ${lanItem.pricing.netPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} /unit
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Alternative Switch Selection */}
                        {lanItem.alternatives && lanItem.alternatives.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">Select Alternative Switch</label>
                                <select
                                    className="block w-full max-w-md rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 sm:text-sm"
                                    value={manualSelections[`${selectedSite.name}:managed_lan`] || ""}
                                    onChange={(e) => handleAlternativeChange(e.target.value)}
                                >
                                    <option value="">{`-- Let engine decide (${lanItem.itemName} suggested) --`}</option>
                                    <optgroup label="Alternatives">
                                        {lanItem.alternatives.map((alt) => (
                                            <option key={alt.itemId} value={alt.itemId}>
                                                {alt.itemName} {alt.specSummary ? `(${alt.specSummary})` : ""}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                                <p className="text-xs text-slate-500 mt-2 italic">Selecting an alternative will bypass the automatic tracking rules for this specific site.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500">No switch recommended based on current configuration.</div>
                )}
            </div>
        </div>
    );
}
