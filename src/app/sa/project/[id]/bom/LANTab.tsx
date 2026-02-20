import { Site } from "@/src/lib/bom-types";
import { SiteType } from "@/src/lib/site-types";

interface LANTabProps {
    selectedSite: Site;
    siteTypes: SiteType[];
}

export function LANTab({ selectedSite, siteTypes }: LANTabProps) {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">LAN Infrastructure</h3>
                <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Switch Profile</label>
                    <select
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        defaultValue={siteTypes.find((t) => t.category === "LAN")?.id}
                    >
                        {siteTypes.filter((t) => t.category === "LAN").map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-100 rounded bg-slate-50">
                        <div className="text-xs text-slate-500 uppercase">Total User Ports</div>
                        <div className="text-2xl font-bold text-slate-800">{selectedSite.lanPorts}</div>
                    </div>
                    <div className="p-4 border border-slate-100 rounded bg-slate-50">
                        <div className="text-xs text-slate-500 uppercase">Est. Switches</div>
                        <div className="text-2xl font-bold text-slate-800">
                            {Math.ceil(selectedSite.lanPorts / 48)} <span className="text-sm font-normal text-slate-500">(48-port)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
