import React from "react";
import { Site } from "@/src/lib/bom-types";

interface ProjectSummaryDashboardProps {
    sites: Site[];
    setSiteFilter: (filter: "all" | "flagged") => void;
    // We can compute roughly what is "flagged" purely by missing siteTypeId for now,
    // or we can just say "Flagged" is any site without a siteTypeId.
}

export function ProjectSummaryDashboard({ sites, setSiteFilter }: ProjectSummaryDashboardProps) {
    const totalSites = sites.length;

    // A simple heuristic for "flagged" until we have more complex rules in state:
    // If a site doesn't have a configured siteTypeId, it's flagged for review.
    const flaggedSites = sites.filter((s) => !s.siteTypeId).length;
    const configuredSites = totalSites - flaggedSites;

    if (totalSites === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full bg-slate-50">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-semibold text-slate-700 mb-2">No Sites Found</h2>
                <p className="max-w-md text-center text-sm">Upload a CSV or load sample data from the sidebar to begin building the BOM architecture.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 bg-slate-50 overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Project Summary</h1>
                <p className="text-slate-500 mt-2">Manage your network deployment by exception. Review flagged sites or drill down into specific configurations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Total Sites Card */}
                <button
                    onClick={() => setSiteFilter("all")}
                    className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Sites</p>
                        <h3 className="text-4xl font-bold text-slate-800">{totalSites}</h3>
                    </div>
                </button>

                {/* Configured Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-green-200 opacity-90">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Auto-Configured</p>
                        <h3 className="text-4xl font-bold text-slate-800">{configuredSites}</h3>
                    </div>
                </div>

                {/* Flagged Card */}
                <button
                    onClick={() => setSiteFilter("flagged")}
                    className="bg-white rounded-xl p-6 shadow-sm border border-amber-200 hover:shadow-md hover:border-amber-400 transition-all text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-amber-600 uppercase tracking-wider mb-1">Flagged For Review</p>
                        <h3 className="text-4xl font-bold text-slate-800">{flaggedSites}</h3>
                        {flaggedSites > 0 && (
                            <p className="text-xs text-amber-600 mt-2 font-medium">Click to filter master list →</p>
                        )}
                    </div>
                </button>
            </div>

            {/* Quick Actions / Getting Started info could go here */}
            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">How to manage your architecture</h3>
                <ul className="space-y-4 text-sm text-slate-600">
                    <li className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold">1</span>
                        <p><strong>Review Groups:</strong> Expand site tiers in the sidebar (e.g. &quot;Small Retail&quot;) to instantly confirm BOM assignments apply to the full class of sites.</p>
                    </li>
                    <li className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold">2</span>
                        <p><strong>Manage by Exception:</strong> Click &quot;Flagged For Review&quot; to filter the sidebar. Look for sites missing profiles or exceeding capacity limits.</p>
                    </li>
                    <li className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold">3</span>
                        <p><strong>Deep Dive:</strong> Select any individual site to reveal the detailed LAN/WAN/WLAN configurations and issue manual overrides if necessary.</p>
                    </li>
                </ul>
            </div>
        </div>
    );
}
