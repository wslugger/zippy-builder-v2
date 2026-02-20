import { Site, BOMLineItem } from "@/src/lib/bom-types";
import { SiteType } from "@/src/lib/site-types";
import { Equipment } from "@/src/lib/types";

interface LANTabProps {
    selectedSite: Site;
    siteTypes: SiteType[];
    handleSiteUpdate: (updates: Partial<Site>) => void;
    lanItem?: BOMLineItem;
    manualSelections: Record<string, string>;
    setManualSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    catalog: Equipment[];
    setSelectedSpecsItem: (eq: Equipment | null) => void;
}

export function LANTab({
    selectedSite,
    siteTypes,
    handleSiteUpdate,
    lanItem,
    manualSelections,
    setManualSelections,
    catalog,
    setSelectedSpecsItem
}: LANTabProps) {
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

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">LAN Infrastructure Preferences</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-md border border-slate-200 col-span-2">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">LAN Site Profile</label>
                        <select
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={selectedSite.lanSiteTypeId || ""}
                            onChange={(e) => handleSiteUpdate({ lanSiteTypeId: e.target.value })}
                        >
                            <option value="">-- Let System Decide or Default --</option>
                            {siteTypes.filter((t) => t.category === "LAN").map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Total LAN Ports Required</label>
                        <input
                            type="number"
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={selectedSite.lanPorts || ""}
                            onChange={(e) => handleSiteUpdate({ lanPorts: parseInt(e.target.value) || 0 })}
                            placeholder="e.g. 48"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">PoE Ports Required</label>
                        <input
                            type="number"
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={selectedSite.requiredPoePorts ?? selectedSite.poePorts ?? ""}
                            onChange={(e) => handleSiteUpdate({ requiredPoePorts: parseInt(e.target.value) || 0 })}
                            placeholder="e.g. 24"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Access Port Speed</label>
                        <select
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={selectedSite.accessPortSpeed || ""}
                            onChange={(e) => handleSiteUpdate({ accessPortSpeed: e.target.value as Site["accessPortSpeed"] })}
                        >
                            <option value="">Any (1GbE Default)</option>
                            <option value="1GbE">1GbE</option>
                            <option value="2.5GbE">2.5GbE (mGig)</option>
                            <option value="5GbE">5GbE (mGig)</option>
                            <option value="10GbE">10GbE</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">PoE Standard</label>
                        <select
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={selectedSite.poeStandard || ""}
                            onChange={(e) => handleSiteUpdate({ poeStandard: e.target.value as Site["poeStandard"] })}
                        >
                            <option value="">Any (PoE Default)</option>
                            <option value="PoE">PoE (802.3af - 15W)</option>
                            <option value="PoE+">PoE+ (802.3at - 30W)</option>
                            <option value="PoE++">PoE++ (802.3bt - 60W/90W)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Uplink Speed</label>
                        <select
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={selectedSite.uplinkPortSpeed || ""}
                            onChange={(e) => handleSiteUpdate({ uplinkPortSpeed: e.target.value as Site["uplinkPortSpeed"] })}
                        >
                            <option value="">Any</option>
                            <option value="1GbE">1GbE</option>
                            <option value="10GbE">10GbE</option>
                            <option value="25GbE">25GbE</option>
                            <option value="40GbE">40GbE</option>
                            <option value="100GbE">100GbE</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Uplink Type</label>
                        <select
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={selectedSite.uplinkPortType || ""}
                            onChange={(e) => handleSiteUpdate({ uplinkPortType: e.target.value as Site["uplinkPortType"] })}
                        >
                            <option value="">Any</option>
                            <option value="SFP+">SFP / SFP+</option>
                            <option value="Copper">Copper (RJ-45)</option>
                            <option value="Fiber">Fiber</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6 p-4 border border-slate-100 rounded bg-slate-50 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 uppercase">Estimated Quantity for 48-port Switches</div>
                        <div className="text-2xl font-bold text-slate-800">
                            {Math.ceil((selectedSite.lanPorts || 48) / 48)} <span className="text-sm font-normal text-slate-500 text-[10px] ml-1">based on ports</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase">Estimated Capacity Needed</div>
                        <div className="text-lg font-bold text-slate-700">
                            {((selectedSite.lanPorts || 0) * (selectedSite.accessPortSpeed === "10GbE" ? 10 : selectedSite.accessPortSpeed === "5GbE" ? 5 : selectedSite.accessPortSpeed === "2.5GbE" ? 2.5 : 1))} Gbps
                        </div>
                    </div>
                </div>
            </div>

            {/* Generated BOM for LAN */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Recommended Switch Hardware</h3>
                {lanItem ? (
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between p-4 border border-blue-100 bg-blue-50/50 rounded-lg">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">🔌</div>
                                <div>
                                    <div className="font-bold text-slate-900">{lanItem.itemName}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{lanItem.reasoning}</div>
                                    <button
                                        onClick={() => {
                                            const eq = catalog.find(e => e.id === lanItem.itemId);
                                            if (eq) setSelectedSpecsItem(eq);
                                        }}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider mt-2 flex items-center"
                                    >
                                        View Specs
                                        <svg className="w-2.5 h-2.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 uppercase">Quantity</div>
                                <div className="text-2xl font-black text-blue-600">{lanItem.quantity}</div>
                            </div>
                        </div>

                        {/* Alternative Switch Selection */}
                        {lanItem.alternatives && lanItem.alternatives.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Select Alternative Switch</label>
                                <select
                                    className="block w-full max-w-md rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={manualSelections[`${selectedSite.name}:managed_lan`] || ""}
                                    onChange={(e) => handleAlternativeChange(e.target.value)}
                                >
                                    <option value="">{`-- Let engine decide (${lanItem.itemName} suggested) --`}</option>
                                    <optgroup label="Alternatives">
                                        {/* Since manual overrides bypass AI reasoning in engine output, the current lanItem might literally BE the Alternative if it's already manually selected.
                                            But we still show the list from alternatives so they can swap back and forth. */}
                                        {lanItem.alternatives.map((alt) => (
                                            <option key={alt.itemId} value={alt.itemId}>
                                                {alt.itemName} {alt.specSummary ? `(${alt.specSummary})` : ""}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                                <p className="text-xs text-slate-500 mt-2 italic">Selecting an alternative will override the standard deployment profile logic for this site.</p>
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
