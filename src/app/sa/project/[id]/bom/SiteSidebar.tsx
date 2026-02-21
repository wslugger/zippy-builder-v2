"use client";

import React, { useMemo, useState } from "react";
import { Site, BOM } from "@/src/lib/bom-types";
import { SiteType } from "@/src/lib/site-types";
import { Package } from "@/src/lib/types";

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
    setSiteFilter
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
                    return !item.site.siteTypeId;
                }
                return true;
            });
    }, [sites, siteFilter]);

    const groupedSites = useMemo(() => {
        const groups: Record<string, { typeName: string, items: typeof filteredSites }> = {};

        filteredSites.forEach(item => {
            const tId = item.site.siteTypeId || "unmapped";
            if (!groups[tId]) {
                const sType = siteTypes.find(t => t.id === tId);
                groups[tId] = {
                    typeName: sType ? sType.name : (tId === "unmapped" ? "Unmapped / Flagged" : "Generic Branch"),
                    items: []
                };
            }
            groups[tId].items.push(item);
        });

        // Ensure Unmapped is always at the top if it exists
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
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
            <div className="p-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-slate-800">Sites ({sites.length})</h2>
                    {selectedSiteIndex !== null && (
                        <button
                            onClick={() => onSelectSite(null)}
                            className="text-xs text-blue-600 font-medium hover:underline"
                        >
                            Dashboard
                        </button>
                    )}
                </div>

                <div className="flex space-x-1 mb-4 bg-slate-100 p-1 rounded-md">
                    <button
                        onClick={() => setSiteFilter("all")}
                        className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${siteFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setSiteFilter("flagged")}
                        className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${siteFilter === "flagged" ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
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
                                className="block w-full rounded border-slate-200 text-xs py-1 pl-2 pr-6 focus:ring-blue-500 focus:border-blue-500"
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

            <div className="flex-1 overflow-y-auto bg-slate-50 relative">
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
                                className="w-full sticky top-0 z-10 bg-slate-100 border-y border-slate-200 px-4 py-2 flex items-center justify-between hover:bg-slate-200 transition-colors focus:outline-none"
                            >
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                                    <svg className={`w-4 h-4 mr-1 text-slate-400 transform transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    {group.typeName}
                                </span>
                                <span className="text-[10px] font-medium bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                    {group.items.length}
                                </span>
                            </button>

                            {/* Group Items */}
                            {!isCollapsed && (
                                <div className="bg-white">
                                    {group.items.map(({ site, index }) => {
                                        const siteBOM = bom?.items.filter((i) => i.siteName === site.name && i.serviceId === "managed_sdwan" && i.itemType === "equipment");
                                        const qty = siteBOM?.[0]?.quantity || 1;

                                        const isSelected = selectedSiteIndex === index;

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => onSelectSite(index)}
                                                className={`w-full text-left p-4 border-b border-slate-100 hover:bg-blue-50/50 transition-colors focus:outline-none ${isSelected ? "bg-blue-50 border-l-4 border-l-blue-600" : "border-l-4 border-l-transparent"}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className={`font-medium truncate ${isSelected ? "text-blue-900" : "text-slate-900"}`}>{site.name}</div>
                                                        <div className="text-xs text-slate-500 truncate">{site.address}</div>
                                                        <div className="mt-2 flex items-center space-x-2">
                                                            {qty > 1 && (
                                                                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                    {qty} x CPE
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-1">
                                                        <div className={`w-2 h-2 rounded-full ${!site.siteTypeId ? "bg-amber-400" : "bg-green-400"}`} />
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
