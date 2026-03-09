import { TriagedSite, Site } from "@/src/lib/types";
import React from 'react';



interface SiteImportReviewModalProps {
    sites: TriagedSite[];
    onConfirm: (finalSites: Site[]) => void;
    onCancel: () => void;
}

export const SiteImportReviewModal: React.FC<SiteImportReviewModalProps> = ({
    sites,
    onConfirm,
    onCancel
}) => {

    const handleConfirm = () => {
        // Map TriagedSite to the standard Site format for the BOM Engine
        const finalSites: Site[] = sites.map(s => {
            // Map TriagedSite to the standard Site format for the BOM Engine
            const { triageFlags, isReviewed, ...baseSite } = s;
            return baseSite;
        });
        onConfirm(finalSites);
    };

    const renderSiteRow = (site: TriagedSite, idx: number) => (
        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 w-1/3 text-sm text-slate-800">
                <div className="font-bold">{site.name}</div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{site.notes || "No notes"}</div>
            </td>
            <td className="py-4 px-4 w-1/4 text-sm text-slate-600">
                <div className="flex space-x-3 items-center">
                    <span>👥 {site.userCount} Users</span>
                    <span>🌐 {site.bandwidthDownMbps} Mbps</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {site.primaryCircuit} | {site.redundancyModel}
                    </span>
                </div>
            </td>

            <td className="py-4 px-4 w-1/4 text-sm">
                <div className="flex flex-col space-y-1">
                    {site.triageFlags.map((flag, i) => (
                        <div key={i} className="text-[10px] text-slate-600 italic">
                            • {flag.reason}
                        </div>
                    ))}
                </div>
            </td>
        </tr>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center">
                            🌐 AI Triage Complete
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Analyzed {sites.length} sites.
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={onCancel}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            Continue to Builder
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr className="border-b border-slate-200">
                                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Site Detail</th>
                                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Extracted Parameters</th>
                                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Reasoning</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sites.map((site, index) => renderSiteRow(site, index))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center justify-center space-x-2">
                    <span>⚡ Powered by Gemini 2.5 Flash Triage Engine</span>
                </div>
            </div>
        </div>
    );
};
