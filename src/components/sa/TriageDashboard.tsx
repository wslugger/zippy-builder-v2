"use client";

import { TriagedSite } from '@/src/lib/types';

interface TriageDashboardProps {
    pendingTriageSites: TriagedSite[];
    handleBulkAcknowledge: (reasonSubstring?: string) => void;
}

export function TriageDashboard({ pendingTriageSites, handleBulkAcknowledge }: TriageDashboardProps) {
    // Group sites by each unique triage flag reason
    const groups = pendingTriageSites.reduce((acc, site) => {
        const flags = site.triageFlags || [];

        if (flags.length === 0) {
            const reason = 'Manual review requested';
            if (!acc[reason]) acc[reason] = [];
            acc[reason].push(site);
        } else {
            flags.forEach(f => {
                const reason = f.reason;
                if (!acc[reason]) acc[reason] = [];
                // Avoid double-counting sites in the same reason group
                if (!acc[reason].some(s => s.name === site.name && s.address === site.address)) {
                    acc[reason].push(site);
                }
            });
        }
        return acc;
    }, {} as Record<string, TriagedSite[]>);

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header section */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            Triage Dashboard
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            The following {pendingTriageSites.length} site(s) require exception acknowledgement before proceeding.
                        </p>
                    </div>
                    <button
                        onClick={() => handleBulkAcknowledge()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-0.5"
                    >
                        Acknowledge All Exceptions
                    </button>
                </div>

                {/* Reason Groups */}
                <div className="grid gap-6">
                    {Object.entries(groups).map(([reason, sites]) => (
                        <div
                            key={reason}
                            className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                        >
                            {/* Visual accent */}
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />

                            <div className="flex justify-between items-start gap-6">
                                <div className="flex gap-4">
                                    <div className="mt-1 p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                            {reason}
                                        </h3>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {sites.map((site, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-xs font-bold"
                                                >
                                                    {site.name}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 font-medium italic">
                                            {sites.length} site(s) flagged for this reason
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleBulkAcknowledge(reason)}
                                    className="shrink-0 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-600/10 transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                >
                                    Acknowledge Group
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
