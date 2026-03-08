"use client";

import { useState, useCallback } from "react";
import jsonLogic from "json-logic-js";
import { BOMLogicRule, Site, Package } from "@/src/lib/types";
import { ProjectService, PackageService } from "@/src/lib/firebase";
import { normalizeServiceId } from "@/src/lib/bom-utils";

interface RuleCoverageReportProps {
    rules: BOMLogicRule[];
}

interface SiteCoverageResult {
    projectName: string;
    siteName: string;
    serviceId: string;
    matchedRules: BOMLogicRule[];
    isFallback: boolean;
    hasTriage: boolean;
}

const LAN_SERVICE_ID = "managed_lan";
const LAN_ALT_IDS = ["managed_lan", "lan"];

function evalRulesForSite(rules: BOMLogicRule[], site: Site, serviceId: string): BOMLogicRule[] {
    const context = { serviceId, site };
    return rules.filter(rule => {
        try {
            return !!jsonLogic.apply(rule.condition, context);
        } catch {
            return false;
        }
    });
}

export function RuleCoverageReport({ rules }: RuleCoverageReportProps) {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SiteCoverageResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [serviceFilter, setServiceFilter] = useState<string>(LAN_SERVICE_ID);

    const lanRules = rules.filter(r =>
        LAN_ALT_IDS.some(id => JSON.stringify(r.condition || {}).includes(id))
    );

    const runCoverage = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [projects, allPackages] = await Promise.all([
                ProjectService.getAllProjects(),
                PackageService.getAllPackages()
            ]);

            const coverageResults: SiteCoverageResult[] = [];

            for (const project of projects.slice(0, 20)) { // cap at 20 projects for perf
                if (!project.selectedPackageId) continue;

                const pkg = allPackages.find(p => p.id === project.selectedPackageId);
                if (!pkg) continue;

                // Check if the selected service is in the package
                const hasServiceInPkg = pkg.items.some(item =>
                    normalizeServiceId(item.service_id) === normalizeServiceId(serviceFilter)
                );

                if (!hasServiceInPkg) continue;

                const sites = await ProjectService.getSites(project.id);
                for (const site of sites) {
                    const matched = evalRulesForSite(lanRules, site, serviceFilter);
                    const hasEquipmentAction = matched.some(r =>
                        r.actions.some(a => a.type === "select_equipment")
                    );
                    const hasTriage = matched.some(r =>
                        r.actions.some(a => a.type === "require_triage")
                    );

                    coverageResults.push({
                        projectName: project.name || project.id,
                        siteName: site.name,
                        serviceId: serviceFilter,
                        matchedRules: matched,
                        isFallback: matched.length === 0 || (!hasEquipmentAction && !hasTriage),
                        hasTriage,
                    });
                }
            }

            setResults(coverageResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load projects");
        } finally {
            setLoading(false);
        }
    }, [lanRules, serviceFilter]);

    const fallbackCount = results?.filter(r => r.isFallback).length ?? 0;
    const triageCount = results?.filter(r => r.hasTriage).length ?? 0;
    const coveredCount = results?.filter(r => !r.isFallback && !r.hasTriage).length ?? 0;

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h3 className="text-base font-bold text-slate-900">Rule Coverage Report</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Shows which rule fires for each site, and surfaces sites that fall back to best-effort selection.
                        Analyzes up to 20 projects.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <select
                        value={serviceFilter}
                        onChange={e => setServiceFilter(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="managed_lan">Managed LAN</option>
                        <option value="sdwan">SD-WAN</option>
                        <option value="wlan">WLAN</option>
                    </select>
                    <button
                        onClick={runCoverage}
                        disabled={loading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Analyzing...
                            </>
                        ) : (
                            "Run Coverage Analysis"
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    ⚠️ {error}
                </div>
            )}

            {results && (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                            <div className="text-2xl font-black text-emerald-700">{coveredCount}</div>
                            <div className="text-xs text-emerald-600 font-medium mt-0.5">Rule Matched ✓</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                            <div className="text-2xl font-black text-amber-700">{triageCount}</div>
                            <div className="text-xs text-amber-600 font-medium mt-0.5">Triage Flagged ⚠️</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                            <div className="text-2xl font-black text-slate-600">{fallbackCount}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">Dynamic Fallback ↩</div>
                        </div>
                    </div>

                    {results.length === 0 ? (
                        <div className="py-10 text-center text-slate-500 italic text-sm border border-dashed border-slate-200 rounded-xl">
                            No sites found with this service configured.
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Project</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Site</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Matched Rules</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {results.map((r, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-5 py-3 text-xs text-slate-500 font-medium">{r.projectName}</td>
                                            <td className="px-5 py-3 text-sm font-semibold text-slate-800">{r.siteName}</td>
                                            <td className="px-5 py-3">
                                                {r.matchedRules.length === 0 ? (
                                                    <span className="text-xs text-slate-400 italic">No rules matched</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {r.matchedRules.map(rule => (
                                                            <span key={rule.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-medium" title={rule.id}>
                                                                {rule.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {r.hasTriage ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold">
                                                        ⚠️ Triage Required
                                                    </span>
                                                ) : r.isFallback ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-bold">
                                                        ↩ Dynamic Fallback
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                                                        ✓ Rule Match
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
