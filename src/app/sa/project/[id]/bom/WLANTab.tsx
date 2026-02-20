import { Site } from "@/src/lib/bom-types";

interface WLANTabProps {
    selectedSite: Site;
}

export function WLANTab({ selectedSite }: WLANTabProps) {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Wireless Coverage</h3>
                <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 bg-blue-50 rounded-full">
                        <span className="text-2xl">📡</span>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-900">High Density Coverage</div>
                        <div className="text-xs text-slate-500">Wi-Fi 6E Enabled</div>
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-100 rounded bg-slate-50">
                        <div className="text-xs text-slate-500 uppercase">Indoor APs</div>
                        <div className="text-2xl font-bold text-slate-800">{selectedSite.indoorAPs}</div>
                    </div>
                    <div className="p-4 border border-slate-100 rounded bg-slate-50">
                        <div className="text-xs text-slate-500 uppercase">Outdoor APs</div>
                        <div className="text-2xl font-bold text-slate-800">{selectedSite.outdoorAPs}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
