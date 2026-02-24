import { Site } from "@/src/lib/bom-types";

interface WLANTabProps {
    selectedSite: Site;
}

export function WLANTab({ selectedSite }: WLANTabProps) {
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Wireless Coverage</h3>
                <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                        <span className="text-2xl">📡</span>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">High Density Coverage</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Wi-Fi 6E Enabled</div>
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-100 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800/50">
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Indoor APs</div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedSite.indoorAPs}</div>
                    </div>
                    <div className="p-4 border border-slate-100 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800/50">
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Outdoor APs</div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedSite.outdoorAPs}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
