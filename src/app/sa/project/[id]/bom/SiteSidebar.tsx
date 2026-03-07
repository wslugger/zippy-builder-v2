"use client";

import { Package, Site, BOM, SiteType } from "@/src/lib/types";
import React, { useMemo, useState } from "react";




interface SiteSidebarProps {
    sites: Site[];
    siteTypes: SiteType[];
    selectedSiteIndex: number | null;
    onSelectSite: (idx: number | null) => void;
    onClearSites: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onLoadSample: () => void;
    bom: BOM | null;
    projectId: string;
    pkg: Package | null;
    allPackages: Package[];
    onPackageChange: (pkgId: string) => Promise<void>;
    siteFilter: "all" | "flagged";
    setSiteFilter: (filter: "all" | "flagged") => void;
    onViewPricing: () => void;
}

export function SiteSidebar({
    sites,
    siteTypes,
    selectedSiteIndex,
    onSelectSite,
    onClearSites,
    onFileUpload,
    onLoadSample,
    bom,
    projectId,
    pkg,
    allPackages,
    onPackageChange,
    siteFilter,
    setSiteFilter,
    onViewPricing
}: SiteSidebarProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const filteredSites = useMemo(() => {
        return sites.map((site, index) => ({ site, index }))
            .filter((item) => {
                if (siteFilter === "flagged") {
                    return item.site.lanRequirements?.needsManualReview === true || !item.site.siteTypeId;
                }
                return true;
            });
    }, [sites, siteFilter]);

    const groupedSites = useMemo(() => {
        const groups: Record<string, { typeName: string, items: typeof filteredSites }> = {};

        filteredSites.forEach(item => {
            const bucketId = item.site.siteTypeId || "unmapped";

            if (!groups[bucketId]) {
                const sType = siteTypes.find(t => t.id === bucketId);
                let typeName = "Generic Branch";

                if (sType) {
                    typeName = sType.name;
                } else if (bucketId === "unmapped") {
                    typeName = "Unmapped Sites";
                }

                groups[bucketId] = {
                    typeName,
                    items: []
                };
            }
            groups[bucketId].items.push(item);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (a === "unmapped") return -1;
            if (b === "unmapped") return 1;
            return groups[a].typeName.localeCompare(groups[b].typeName);
        });

        return sortedKeys.map(key => ({
            id: key,
            ...groups[key]
        }));
    }, [filteredSites, siteTypes]);

    const totalFiltered = filteredSites.length;

    return (
        <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full flex-shrink-0">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100" data-testid="sites-header">Sites ({sites.length})</h2>
                    {selectedSiteIndex !== null && (
                        <button
                            onClick={() => onSelectSite(null)}
                            className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                            Dashboard
                        </button>
                    )}
                </div>

                <div className="flex space-x-1 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
                    <button
                        onClick={() => setSiteFilter("all")}
                        className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${siteFilter === "all" ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setSiteFilter("flagged")}
                        className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${siteFilter === "flagged" ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                    >
                        Flagged
                    </button>
                </div>

                {sites.length === 0 && (
                    <div className="mt-4">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={onFileUpload}
                            className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700"
                        />
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100">
                    {projectId === "demo" && (
                        <div className="mb-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Test Package
                            </label>
                            <select
                                className="block w-full rounded border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs py-1 pl-2 pr-6 focus:ring-blue-500 focus:border-blue-500"
                                value={pkg?.id || ""}
                                onChange={(e) => onPackageChange(e.target.value)}
                            >
                                <option value="" disabled>Select Package...</option>
                                {allPackages.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={onLoadSample}
                        className="w-full text-left px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-blue-600 transition-colors border border-dashed border-slate-200 rounded"
                    >
                        Load Sample Sites (Test)
                    </button>
                </div>

                {sites.length > 0 && (
                    <button
                        onClick={() => {
                            if (confirm("Are you sure you want to clear all sites?")) {
                                onClearSites();
                            }
                        }}
                        className="mt-2 w-full text-left px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-red-300 hover:text-red-600 transition-colors border border-dashed border-red-100 rounded"
                    >
                        Clear Sites
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 relative">
                <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 space-y-1">
                    <button
                        onClick={() => onSelectSite(null)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedSiteIndex === null
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-sm"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-xl">📊</span>
                            <span className={`font-bold text-sm ${selectedSiteIndex === null ? "text-white" : "text-slate-700 dark:text-slate-200"}`}>
                                Project Overview
                            </span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${selectedSiteIndex === null ? "bg-blue-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                            Global
                        </span>
                    </button>
                    <button
                        onClick={onViewPricing}
                        className="w-full flex items-center gap-2 p-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                    >
                        <span className="text-lg grayscale group-hover:grayscale-0 transition-all">💰</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Pricing Analysis</span>
                    </button>
                </div>

                {totalFiltered === 0 && sites.length > 0 && (
                    <div className="p-8 text-center text-sm text-slate-500">
                        No sites match the current filter.
                    </div>
                )}

                {groupedSites.map((group) => {
                    const isCollapsed = collapsedGroups[group.id];
                    return (
                        <div key={group.id} className="mb-1">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(group.id)}
                                className={`w-full sticky top-0 z-10 border-y px-4 py-2 flex items-center justify-between transition-colors focus:outline-none ${group.id === 'unmapped'
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 hover:bg-red-100'
                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span className={`text-xs font-bold uppercase tracking-wider flex items-center ${group.id === 'unmapped' ? 'text-red-600 dark:text-red-400'
                                        : 'text-slate-700 dark:text-slate-300'
                                    }`}>
                                    <svg className={`w-4 h-4 mr-1 text-slate-400 transform transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    {group.typeName}
                                </span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${group.id === 'unmapped'
                                        ? 'bg-white dark:bg-red-900/40 text-red-500 dark:text-red-400 border-red-200 dark:border-red-600'
                                        : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                                    }`}>
                                    {group.items.length}
                                </span>
                            </button>

                            {/* Group Items */}
                            {!isCollapsed && (
                                <div className="bg-white dark:bg-slate-900">
                                    {group.items.map(({ site, index }) => {
                                        const siteBOM = bom?.items.filter((i) => i.siteName === site.name && i.serviceId === "sdwan" && i.itemType === "equipment");
                                        const qty = siteBOM?.[0]?.quantity || 1;

                                        const isSelected = selectedSiteIndex === index;

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => onSelectSite(index)}
                                                className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors focus:outline-none ${isSelected ? "bg-blue-50 dark:bg-blue-900/40 border-l-4 border-l-blue-600" : "border-l-4 border-l-transparent"}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className={`font-medium truncate ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-slate-100"}`}>{site.name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{site.address}</div>
                                                        <div className="mt-2 flex items-center space-x-2 flex-wrap gap-1">
                                                            {qty > 1 && (
                                                                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                    {qty} x CPE
                                                                </span>
                                                            )}
                                                            {site.lanRequirements?.needsManualReview === true && (
                                                                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-200 dark:border-amber-600">
                                                                    🔌 LAN
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-1">
                                                        <div className={`w-2 h-2 rounded-full ${(!site.siteTypeId)
                                                                ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                                                                : site.lanRequirements?.needsManualReview === true
                                                                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                                                    : "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                                                            }`} />
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
