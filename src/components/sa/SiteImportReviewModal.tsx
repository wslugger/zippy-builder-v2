import React from 'react';
import { Site } from '@/src/lib/bom-types';
import { SiteType } from '@/src/lib/site-types';
import { TriagedSite } from '@/src/lib/types';

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
    const fastTrackSites = sites.filter(s => s.uxRoute === 'FAST_TRACK');
    const guidedFlowSites = sites.filter(s => s.uxRoute === 'GUIDED_FLOW');

    const handleConfirm = () => {
        // Map TriagedSite to the standard Site format for the BOM Engine
        const finalSites: Site[] = sites.map(s => ({
            name: s.siteName,
            address: "TBD", // Requires mapping from dynamic or notes if available
            userCount: s.estimatedUsers,
            bandwidthDownMbps: 1000, // Default placeholders
            bandwidthUpMbps: 1000, // Default placeholders
            redundancyModel: "Single CPE",
            wanLinks: 1,
            lanPorts: Math.ceil(s.estimatedUsers * 2), // Rough estimate
            poePorts: 0,
            indoorAPs: Math.ceil(s.estimatedUsers / 20),
            outdoorAPs: 0,
            primaryCircuit: "Broadband",
            notes: s.rawNotes,
            // Include dynamic attributes conceptually or store them in notes/metadata
        }));
        onConfirm(finalSites);
    };

    const renderSiteRow = (site: TriagedSite, idx: number) => (
        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 w-1/3 text-sm text-slate-800">
                <div className="font-bold">{site.siteName}</div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{site.rawNotes || "No notes"}</div>
            </td>
            <td className="py-4 px-4 w-1/4 text-sm text-slate-600">
                <div className="flex space-x-3 items-center">
                    <span>👥 {site.estimatedUsers} Users</span>
                    {site.sqFt && <span>📏 {site.sqFt} SqFt</span>}
                </div>
                {Object.keys(site.dynamicAttributes || {}).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(site.dynamicAttributes).map(([key, val]) => (
                            <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                {key}: {String(val)}
                            </span>
                        ))}
                    </div>
                )}
            </td>
            <td className="py-4 px-4 text-sm font-medium">
                {site.uxRoute === 'FAST_TRACK' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-green-700 bg-green-100">
                        ⚡ Fast Track
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-100">
                        ⚠️ Guided Flow
                    </span>
                )}
            </td>
            <td className="py-4 px-4 w-1/4 text-sm">
                <div className="text-xs text-slate-600 italic">
                    {site.triageReason}
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
                            Analyzed {sites.length} sites. {fastTrackSites.length} fast-tracked, {guidedFlowSites.length} flagged for guided configuration.
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
                                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">UX Route</th>
                                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Reasoning</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {fastTrackSites.length > 0 && (
                                <>
                                    <tr className="bg-slate-50/80">
                                        <td colSpan={4} className="px-6 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Fast Track (Automated Build Check)
                                        </td>
                                    </tr>
                                    {fastTrackSites.map((site, index) => renderSiteRow(site, index))}
                                </>
                            )}

                            {guidedFlowSites.length > 0 && (
                                <>
                                    <tr className="bg-orange-50/50">
                                        <td colSpan={4} className="px-6 py-3 text-xs font-bold text-orange-800 uppercase tracking-wider border-t border-orange-100">
                                            Guided Flow (Requires SA Review)
                                        </td>
                                    </tr>
                                    {guidedFlowSites.map((site, index) => renderSiteRow(site, index))}
                                </>
                            )}
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
