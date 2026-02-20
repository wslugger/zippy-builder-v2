import React, { useState } from 'react';
import { Site } from '@/src/lib/bom-types';
import { SiteType } from '@/src/lib/site-types';

interface SiteImportReviewModalProps {
    sites: (Site & {
        recommendedType?: string;
        recommendedLanType?: string;
        confidence?: number;
        reasoning?: string;
    })[];
    siteTypes: SiteType[];
    onConfirm: (finalSites: Site[]) => void;
    onCancel: () => void;
}

export const SiteImportReviewModal: React.FC<SiteImportReviewModalProps> = ({
    sites,
    siteTypes,
    onConfirm,
    onCancel
}) => {
    const [reviewedSites, setReviewedSites] = useState([...sites]);

    const handleTypeChange = (index: number, typeId: string) => {
        const next = [...reviewedSites];
        next[index] = { ...next[index], recommendedType: typeId, siteTypeId: typeId };
        setReviewedSites(next);
    };

    const handleLanTypeChange = (index: number, typeId: string) => {
        const next = [...reviewedSites];
        next[index] = { ...next[index], recommendedLanType: typeId, lanSiteTypeId: typeId };
        setReviewedSites(next);
    };

    const handleConfirm = () => {
        const finalSites = reviewedSites.map(s => ({
            ...s,
            siteTypeId: s.recommendedType || s.siteTypeId,
            lanSiteTypeId: s.recommendedLanType || s.lanSiteTypeId
        }));
        onConfirm(finalSites);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Review AI Site Analysis</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Gemini has analyzed your CSV and recommended deployment profiles for {sites.length} sites.
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
                            Confirm & Generate BOM
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Site Name</th>
                                <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Raw Data (Users/BW)</th>
                                <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">AI Recommendation</th>
                                <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-1/4">Reasoning</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reviewedSites.map((site, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-5 px-4">
                                        <div className="font-bold text-slate-900">{site.name}</div>
                                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{site.address}</div>
                                    </td>
                                    <td className="py-5 px-4 text-sm text-slate-600">
                                        <div className="flex space-x-3">
                                            <span>👥 {site.userCount}</span>
                                            <span>🚀 {site.bandwidthDownMbps}M</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-1 mt-1 truncate max-w-[150px]">{site.notes || "No notes"}</div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex flex-col space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <div className="relative flex-1 min-w-[180px]">
                                                    <select
                                                        value={site.recommendedType || ""}
                                                        onChange={(e) => handleTypeChange(idx, e.target.value)}
                                                        className={`w-full text-sm font-medium border rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none bg-white ${(site.confidence || 0) > 80 ? 'border-green-200' : 'border-slate-200'
                                                            }`}
                                                    >
                                                        <option value="">Select Edge Profile...</option>
                                                        {siteTypes.filter(t => t.category !== "LAN").map(t => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                                {(site.confidence || 0) > 0 && (
                                                    <div
                                                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${site.confidence! > 80
                                                            ? 'bg-green-50 text-green-700 border-green-100'
                                                            : site.confidence! > 50
                                                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                                : 'bg-slate-50 text-slate-500 border-slate-100'
                                                            }`}
                                                        title={`Confidence: ${site.confidence}%`}
                                                    >
                                                        {site.confidence}%
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative min-w-[180px]">
                                                <select
                                                    value={site.recommendedLanType || ""}
                                                    onChange={(e) => handleLanTypeChange(idx, e.target.value)}
                                                    className={`w-full text-sm font-medium border rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none bg-white border-slate-200`}
                                                >
                                                    <option value="">Select LAN Profile...</option>
                                                    {siteTypes.filter(t => t.category === "LAN").map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="text-xs text-slate-500 italic leading-relaxed">
                                            {site.reasoning || "No explanation provided."}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Powered by Google Gemini 1.5 Flash
                </div>
            </div>
        </div>
    );
};
