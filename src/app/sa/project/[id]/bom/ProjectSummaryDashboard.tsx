import React from "react";
import { Site } from "@/src/lib/bom-types";

interface ProjectSummaryDashboardProps {
    sites: Site[];
    setSiteFilter: (filter: "all" | "flagged") => void;
    onViewPricing?: () => void;
}

export function ProjectSummaryDashboard({ sites, setSiteFilter, onViewPricing }: ProjectSummaryDashboardProps) {
    const totalSites = sites.length;

    // A simple heuristic for "flagged" until we have more complex rules in state:
    // If a site doesn't have a configured siteTypeId, it's flagged for review.
    const flaggedSites = sites.filter((s) => !s.siteTypeId).length;
    const configuredSites = totalSites - flaggedSites;

    if (totalSites === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full bg-slate-50 dark:bg-slate-950">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-2">No Sites Found</h2>
                <p className="max-w-md text-center text-sm">Upload a CSV or load sample data from the sidebar to begin building the BOM architecture.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Project Summary</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your network deployment by exception. Review flagged sites or drill down into specific configurations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Total Sites Card */}
                <button
                    onClick={() => setSiteFilter("all")}
                    className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Sites</p>
                        <h3 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{totalSites}</h3>
                    </div>
                </button>

                {/* Configured Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-green-200 dark:border-green-800/50 opacity-90">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Auto-Configured</p>
                        <h3 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{configuredSites}</h3>
                    </div>
                </div>

                {/* Flagged Card */}
                <button
                    onClick={() => setSiteFilter("flagged")}
                    className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-amber-200 dark:border-amber-800/50 hover:shadow-md hover:border-amber-400 transition-all text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Flagged For Review</p>
                        <h3 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{flaggedSites}</h3>
                        {flaggedSites > 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">Click to filter master list →</p>
                        )}
                    </div>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                <button
                    onClick={onViewPricing}
                    className="bg-blue-600 dark:bg-blue-700 rounded-xl p-8 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all text-left text-white group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white">
                            <span className="text-2xl">💰</span>
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded tracking-widest uppercase">New Feature</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Simulate Pricing & Swaps</h3>
                        <p className="text-blue-50/80 text-sm max-w-sm">Adjust project-wide discounts and see the impact of hardware changes across all locations instantly.</p>
                        <div className="mt-6 flex items-center gap-2 font-bold text-sm">
                            Open Pricing Analysis <span>→</span>
                        </div>
                    </div>
                </button>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Detailed BOM Export</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Need the full line-item breakdown for procurement? Export the current configuration to CSV.</p>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">bom_export_{new Date().toISOString().split('T')[0]}.csv</span>
                        <div className="text-xs font-bold text-blue-600">Ready</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions / Getting Started info could go here */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">How to manage your architecture</h3>
                <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 font-bold">1</span>
                        <p><strong className="text-slate-800 dark:text-slate-200">Review Groups:</strong> Expand site tiers in the sidebar (e.g. &quot;Small Retail&quot;) to instantly confirm BOM assignments apply to the full class of sites.</p>
                    </li>
                    <li className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 font-bold">2</span>
                        <p><strong className="text-slate-800 dark:text-slate-200">Manage by Exception:</strong> Click &quot;Flagged For Review&quot; to filter the sidebar. Look for sites missing profiles or exceeding capacity limits.</p>
                    </li>
                    <li className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 font-bold">3</span>
                        <p><strong className="text-slate-800 dark:text-slate-200">Deep Dive:</strong> Select any individual site to reveal the detailed LAN/WAN/WLAN configurations and issue manual overrides if necessary.</p>
                    </li>
                </ul>
            </div>
        </div>
    );
}
