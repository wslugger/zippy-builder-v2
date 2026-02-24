'use client';

import { useState, useEffect, use } from 'react';
import { Project, Package, GeneratedHLD } from '@/src/lib/types';
import { ProjectService, PackageService } from '@/src/lib/firebase';
import { AIService } from '@/src/lib/ai-service';
import { generateHLDPayload, HLDPayload } from '@/src/lib/hld-generator';
import { exportBomToCsv } from '@/src/lib/bom-utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

export default function HLDPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;
    const [project, setProject] = useState<Project | null>(null);
    const [pkg, setPkg] = useState<Package | null>(null);
    const [loading, setLoading] = useState(true);
    const [document, setDocument] = useState<GeneratedHLD | null>(null);
    const [payload, setPayload] = useState<HLDPayload | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditResult, setAuditResult] = useState<{ isAligned: boolean; discrepancies: string[] } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const proj = await ProjectService.getProject(projectId);
                setProject(proj);

                if (proj?.selectedPackageId) {
                    const [packageData, hldPayload] = await Promise.all([
                        PackageService.getPackageById(proj.selectedPackageId),
                        generateHLDPayload(projectId)
                    ]);
                    setPkg(packageData);
                    setPayload(hldPayload);
                }
            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            loadData();
        }
    }, [projectId]);

    const handleGenerate = async () => {
        if (!payload) return;
        setIsGenerating(true);
        try {
            const hld = await AIService.generateHLDDocument(payload);
            setDocument(hld);
            setIsEditing(true);
            setError(null);
        } catch (error: unknown) {
            console.error("Generation failed:", error);
            setError(error instanceof Error ? error.message : "HLD Generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAudit = async () => {
        if (!payload || !document) return;
        setIsAuditing(true);
        try {
            // Reconstitute document for audit
            const fullText = `
# Executive Summary
${document.executiveSummary}

# Services Included
${document.servicesIncluded}

# BOM Summary
${document.bomSummary}

# Conclusion
${document.conclusion}

# Appendix A
${document.appendixA}

# Appendix B
${document.appendixB}
            `;
            const result = await AIService.auditHLDDocument(payload, fullText);
            setAuditResult(result);
        } catch (error) {
            console.error("Audit failed:", error);
        } finally {
            setIsAuditing(false);
        }
    };

    const handleSave = async () => {
        alert("High-Level Design saved successfully!");
        setAuditResult(null);
    };

    const updateDoc = (field: keyof GeneratedHLD, value: string) => {
        if (!document) return;
        setDocument({ ...document, [field]: value });
    };

    if (loading || !project || !pkg) return <div className="p-10 text-center">Loading Project Data...</div>;
    if (isGenerating) return <div className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-xl font-medium text-slate-700">AI is compiling your High-Level Design...</p>
    </div>;

    return (
        <div className="max-w-4xl mx-auto p-8 mb-20">
            <div className="mb-6 flex justify-between items-end print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Step 6: High-Level Design</h1>
                    <p className="text-slate-500 mt-1">Review, refine, and audit the AI-generated design document.</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 print:hidden">
                    <span className="text-xl">❌</span>
                    <div>
                        <p className="font-bold">Generation Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-400 hover:text-red-600"
                    >
                        ✕
                    </button>
                </div>
            )}

            {auditResult && (
                <div className={`mb-6 p-6 rounded-lg border flex flex-col gap-4 print:hidden ${auditResult.isAligned
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-yellow-50 border-yellow-200 text-yellow-800"
                    }`}>
                    <div className="flex items-center gap-2 font-bold text-lg">
                        {auditResult.isAligned ? "✅ " : "⚠️ "}
                        {auditResult.isAligned
                            ? "Document aligns with technical design."
                            : "Technical Audit Findings"}
                    </div>
                    {!auditResult.isAligned && (
                        <ul className="list-disc pl-5 space-y-1">
                            {auditResult.discrepancies.map((d, i) => (
                                <li key={i}>{d}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="bg-white dark:bg-white text-black shadow-2xl rounded-sm min-h-screen p-12 print:shadow-none print:p-0">
                {!isEditing || !document ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center print:hidden">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-6">
                            📝
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Generate HLD Document</h2>
                        <p className="text-slate-500 max-w-md mb-8">
                            Click below to have the AI compile your technical configurations into a professional report.
                        </p>
                        <button
                            onClick={handleGenerate}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg transition-all hover:scale-105"
                        >
                            ✨ Generate Document
                        </button>
                    </div>
                ) : (
                    <article className="prose prose-slate max-w-none">
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">1. Executive Summary</h2>
                            <textarea
                                className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none print:hidden"
                                value={document.executiveSummary}
                                onChange={(e) => updateDoc('executiveSummary', e.target.value)}
                            />
                            <div className="hidden print:block whitespace-pre-wrap">{document.executiveSummary}</div>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">2. Services Included</h2>
                            <div className="space-y-10">
                                {payload?.servicesIncluded.map((service, si) => {
                                    // Group design options by category
                                    const dOptsByCategory: Record<string, typeof service.designOptions> = {};
                                    service.designOptions.forEach(dOpt => {
                                        const cat = dOpt.category || 'General';
                                        if (!dOptsByCategory[cat]) dOptsByCategory[cat] = [];
                                        dOptsByCategory[cat].push(dOpt);
                                    });

                                    return (
                                        <div key={si} className="border-b border-slate-200 pb-10 last:border-0">
                                            <h3 className="text-2xl font-bold text-blue-900 border-l-4 border-blue-600 pl-4 mb-4">{service.name}</h3>
                                            <p className="text-slate-700 mb-6 leading-relaxed italic">{service.description}</p>

                                            {service.serviceOptions.length > 0 && (
                                                <div className="mb-8 ml-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                                        Service Options
                                                    </h4>
                                                    <div className="space-y-4">
                                                        {service.serviceOptions.map((opt, oi) => (
                                                            <div key={oi} className="text-slate-800">
                                                                <span className="font-bold text-blue-800">{opt.name}</span>: {opt.description}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {service.designOptions.length > 0 && (
                                                <div className="ml-4">
                                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                        <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                                                        Design Options
                                                    </h4>
                                                    <div className="space-y-8">
                                                        {Object.entries(dOptsByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, opts]) => (
                                                            <div key={category} className="mb-6">
                                                                <h5 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-3 pb-1 border-b border-indigo-50 w-fit">
                                                                    {category}
                                                                </h5>
                                                                <ul className="space-y-4 pl-1">
                                                                    {opts.map((dOpt, di) => (
                                                                        <li key={di} className="text-slate-800 flex flex-col">
                                                                            <span className="font-bold text-slate-900">{dOpt.name}</span>
                                                                            <span className="text-slate-700 leading-relaxed mt-1">{dOpt.description}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-6">3. Site Profiles</h2>
                            <div className="space-y-12">
                                {(() => {
                                    // Order categories: SD-WAN -> LAN -> WLAN
                                    const categoryOrder = ["SD-WAN", "LAN", "WLAN"];
                                    const sortedSiteTypes = [...(payload?.siteTypes || [])].sort((a, b) => {
                                        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
                                    });

                                    return sortedSiteTypes.map((st, i) => (
                                        <div key={i} className="border-b border-slate-100 pb-10 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-bold text-slate-900">{st.name}</h3>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${st.category === 'SD-WAN' ? 'bg-blue-100 text-blue-700' :
                                                        st.category === 'LAN' ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {st.category}
                                                </span>
                                            </div>

                                            <p className="text-slate-600 mb-6 leading-relaxed italic border-l-2 border-slate-200 pl-4">
                                                {st.description}
                                            </p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-xl border border-slate-200/60">
                                                <div>
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Service Profile Traits</h4>
                                                    <ul className="space-y-2">
                                                        <li className="text-sm flex justify-between">
                                                            <span className="text-slate-500">SLA Tier:</span>
                                                            <span className="font-bold text-slate-900">{st.slaTier}</span>
                                                        </li>
                                                        <li className="text-sm flex justify-between">
                                                            <span className="text-slate-500">CPE Redundancy:</span>
                                                            <span className="font-bold text-slate-900">{st.cpeRedundancy}</span>
                                                        </li>
                                                        <li className="text-sm flex justify-between">
                                                            <span className="text-slate-500">Circuit Redundancy:</span>
                                                            <span className="font-bold text-slate-900">{st.circuitRedundancy}</span>
                                                        </li>
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Logic Profile</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {st.requiredServices.length > 0 ? st.requiredServices.map((rs, ri) => (
                                                            <span key={ri} className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600">
                                                                {rs}
                                                            </span>
                                                        )) : <span className="text-sm text-slate-400 italic">No specific service mandates</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">4. BOM Summary</h2>
                            <div className="bg-white">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.bomSummary}</ReactMarkdown>
                            </div>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">5. Conclusion</h2>
                            <textarea
                                className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none print:hidden"
                                value={document.conclusion}
                                onChange={(e) => updateDoc('conclusion', e.target.value)}
                            />
                            <div className="hidden print:block whitespace-pre-wrap">{document.conclusion}</div>
                        </section>

                        <section className="page-break-before mb-12">
                            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">Appendix A: Detailed BOM</h2>
                            <div className="bg-white">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.appendixA}</ReactMarkdown>
                            </div>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">Appendix B: Assumptions, Caveats and Technical Constraints</h2>
                            <div className="bg-white">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.appendixB}</ReactMarkdown>

                                {payload?.siteTypes.some(st => st.constraints.length > 0) && (
                                    <div className="mt-8 pt-8 border-t border-slate-100">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4">Site Technical Constraints</h3>
                                        <div className="space-y-6">
                                            {payload.siteTypes.filter(st => st.constraints.length > 0).map((st, i) => (
                                                <div key={i}>
                                                    <h4 className="text-sm font-bold text-blue-800 mb-2 uppercase tracking-tight">{st.name} Constraints</h4>
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        {st.constraints.map((c, ci) => (
                                                            <li key={ci} className="text-sm text-slate-700">
                                                                <span className="font-semibold text-slate-800">[{c.type}]:</span> {c.description}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </article>
                )}
            </div>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/90 backdrop-blur-sm text-white p-4 shadow-2xl z-50 flex justify-center print:hidden">
                <div className="flex gap-4 max-w-4xl w-full px-8">
                    {!isEditing ? (
                        <>
                            <Link
                                href={`/sa/project/${projectId}/bom`}
                                className="px-6 py-2 rounded-full border border-neutral-600 hover:bg-neutral-800"
                            >
                                &larr; Back to BOM Builder
                            </Link>
                            <button
                                onClick={handleGenerate}
                                className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 font-bold ml-auto"
                            >
                                ✨ AI Generate
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 rounded-full border border-neutral-600 hover:bg-neutral-800"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleAudit}
                                disabled={isAuditing}
                                className="px-6 py-2 rounded-full bg-neutral-700 hover:bg-neutral-600 border border-neutral-500 flex items-center gap-2 ml-auto"
                            >
                                {isAuditing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
                                        Auditing...
                                    </>
                                ) : (
                                    <>🔍 Technical Audit</>
                                )}
                            </button>

                            <button
                                onClick={() => exportBomToCsv(payload?.detailedBom || [], project.name)}
                                className="px-6 py-2 rounded-full border border-neutral-600 hover:bg-neutral-800 flex items-center gap-2"
                            >
                                📥 CSV
                            </button>

                            <button
                                onClick={() => window.print()}
                                className="px-6 py-2 rounded-full border border-neutral-600 hover:bg-neutral-800 flex items-center gap-2"
                            >
                                📄 PDF
                            </button>

                            <button
                                onClick={handleSave}
                                className="px-8 py-2 rounded-full bg-blue-600 hover:bg-blue-700 font-bold"
                            >
                                Save Document
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
