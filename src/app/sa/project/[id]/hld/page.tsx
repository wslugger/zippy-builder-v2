'use client';

import { useState, useEffect, use } from 'react';
import { Project, Package } from '@/src/lib/types';
import { ProjectService, PackageService } from '@/src/lib/firebase';
import { AIService } from '@/src/lib/ai-service';
import { generateHLDPayload, HLDPayload } from '@/src/lib/hld-generator';
import { exportBomToCsv } from '@/src/lib/bom-utils';
import Link from 'next/link';

export default function HLDPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;
    const [project, setProject] = useState<Project | null>(null);
    const [pkg, setPkg] = useState<Package | null>(null);
    const [loading, setLoading] = useState(true);
    const [markdown, setMarkdown] = useState<string>('');
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
            const doc = await AIService.generateHLDDocument(payload);
            setMarkdown(doc);
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
        if (!payload || !markdown) return;
        setIsAuditing(true);
        try {
            const result = await AIService.auditHLDDocument(payload, markdown);
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

    if (loading || !project || !pkg) return <div className="p-10 text-center">Loading Project Data...</div>;
    if (isGenerating) return <div className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-xl font-medium text-slate-700">AI is compiling your High-Level Design...</p>
    </div>;

    // const createdDate = new Date(project.createdAt).toLocaleDateString();

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

            <div className="bg-white dark:bg-white text-black shadow-2xl rounded-sm min-h-screen p-12 print:shadow-none print:m-0">
                {!isEditing ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center print:hidden">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-6">
                            📝
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Generate HLD Markdown</h2>
                        <p className="text-slate-500 max-w-md mb-8">
                            Click below to have the AI compile your technical configurations into a professional Markdown document ready for export.
                        </p>
                        <button
                            onClick={handleGenerate}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg transition-all hover:scale-105"
                        >
                            ✨ Generate Document
                        </button>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-neutral-200 print:hidden">
                            <h2 className="text-2xl font-bold text-blue-900">Edit High-Level Design</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="text-slate-500 hover:text-slate-800 text-sm font-medium"
                                >
                                    🖨️ PDF Preview
                                </button>
                            </div>
                        </div>

                        {/* Print View: Rendered Text */}
                        <div className="hidden print:block whitespace-pre-wrap font-sans text-black bg-white">
                            {markdown}
                        </div>

                        {/* Edit View: Textarea */}
                        <textarea
                            className="flex-1 w-full min-h-[650px] p-6 font-mono text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-neutral-50 shadow-inner print:hidden"
                            value={markdown}
                            onChange={(e) => setMarkdown(e.target.value)}
                            placeholder="Markdown content will appear here..."
                        />
                    </div>
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
                                    <>🔍 Run Technical Audit</>
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
