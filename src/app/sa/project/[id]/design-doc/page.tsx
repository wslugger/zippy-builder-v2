'use client';

import { useState, useEffect, use } from 'react';
import { Project, Package, Service } from '@/src/lib/types';
import { ProjectService, PackageService, ServiceService } from '@/src/lib/firebase';
import { AIService } from '@/src/lib/ai-service';
import { generateHLDPayload, HLDPayload } from '@/src/lib/hld-generator';
import Link from 'next/link';

export default function DesignDocPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;
    const [project, setProject] = useState<Project | null>(null);
    const [pkg, setPkg] = useState<Package | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [markdown, setMarkdown] = useState<string>('');
    const [payload, setPayload] = useState<HLDPayload | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditResult, setAuditResult] = useState<{ isAligned: boolean; discrepancies: string[] } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const proj = await ProjectService.getProject(projectId);
                setProject(proj);

                if (proj?.selectedPackageId) {
                    const [packageData, servicesData, hldPayload] = await Promise.all([
                        PackageService.getPackageById(proj.selectedPackageId),
                        ServiceService.getAllServices(),
                        generateHLDPayload(projectId)
                    ]);
                    setPkg(packageData);
                    setServices(servicesData);
                    setPayload(hldPayload);

                    // Initial generation if we don't have it (could be stored in firestore but for now generate)
                    // setIsGenerating(true);
                    // const doc = await AIService.generateHLDDocument(hldPayload);
                    // setMarkdown(doc);
                    // setIsGenerating(false);
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
        } catch (error) {
            console.error("Generation failed:", error);
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
        // Placeholder for saving markdown back to Project document
        alert("Document saved successfully!");
        setAuditResult(null); // Clear audit on save?
    };

    if (loading || !project || !pkg) return <div className="p-10 text-center">Loading Project Data...</div>;
    if (isGenerating) return <div className="p-10 text-center">AI is compiling your High-Level Design...</div>;

    const items = project.customizedItems || [];
    const createdDate = new Date(project.createdAt).toLocaleDateString();

    // Group active items by Service

    return (
        <div className="max-w-4xl mx-auto p-8 mb-20">
            {auditResult && (
                <div className={`mb-6 p-6 rounded-lg border flex flex-col gap-4 ${auditResult.isAligned
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
                    <>
                        {/* Header / Cover Page Style */}
                        <div className="border-b-4 border-blue-900 pb-8 mb-12">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-2">Solution Design Document</h1>
                                    <p className="text-xl text-neutral-500">Prepared for {project.customerName}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-blue-900">ZippyBuilder</div>
                                    <div className="text-sm text-neutral-500">Architect Edition</div>
                                </div>
                            </div>
                            <div className="mt-8 flex gap-8 text-sm text-neutral-600">
                                <div>
                                    <span className="block font-bold uppercase tracking-wider text-xs text-neutral-400">Project Reference</span>
                                    {project.name}
                                </div>
                                <div>
                                    <span className="block font-bold uppercase tracking-wider text-xs text-neutral-400">Date Created</span>
                                    {createdDate}
                                </div>
                                <div>
                                    <span className="block font-bold uppercase tracking-wider text-xs text-neutral-400">Solution Package</span>
                                    {pkg.name}
                                </div>
                            </div>
                        </div>

                        {/* Executive Summary */}
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-blue-900 mb-4 border-b border-neutral-200 pb-2">1. Executive Summary</h2>
                            <div className="prose max-w-none text-neutral-800">
                                <p className="mb-4">
                                    This document outlines the proposed network architecture and service design for <strong>{project.customerName}</strong>.
                                    The solution is based on the <strong>{pkg.name}</strong> architecture, tailored to meet your specific requirements for
                                    performance, security, and scalability.
                                </p>
                                <p className="mb-4">
                                    <strong>Key Solution Drivers:</strong>
                                </p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Alignment with {project.packageReasoning ? "identified business requirements" : "standard enterprise patterns"}.</li>
                                    <li>Standardized deployment model using {pkg.name} best practices.</li>
                                    <li>Scalable architecture supporting future growth.</li>
                                </ul>
                            </div>
                        </section>

                        {/* Solution Architecture */}
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-blue-900 mb-6 border-b border-neutral-200 pb-2">2. Solution Architecture</h2>
                            <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200 mb-6">
                                <h3 className="font-bold text-lg mb-2">{pkg.name} Overview</h3>
                                <p className="text-neutral-700 leading-relaxed">{pkg.detailed_description || pkg.short_description}</p>
                            </div>

                            {/* Dynamic List of Selected Services */}
                            <h3 className="font-bold text-lg mb-4 text-neutral-800">2.1 Selected Services & Components</h3>
                            <div className="space-y-6">
                                {services.filter(s => items.some(i => i.service_id === s.id)).map(service => {
                                    const serviceItems = items.filter(i => i.service_id === service.id);
                                    const hasOptions = serviceItems.some(i => i.service_option_id);

                                    return (
                                        <div key={service.id} className="border border-neutral-200 rounded-lg overflow-hidden break-inside-avoid">
                                            <div className="bg-neutral-100 px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
                                                <h4 className="font-bold text-neutral-900">{service.name}</h4>
                                                <span className="text-xs font-mono text-neutral-500 uppercase">{service.metadata?.category}</span>
                                            </div>

                                            {hasOptions ? (
                                                <div className="p-4 bg-white">
                                                    <ul className="space-y-4">
                                                        {service.service_options?.map(option => {
                                                            const optionItem = items.find(i => i.service_id === service.id && i.service_option_id === option.id && !i.design_option_id);
                                                            const designItems = items.filter(i => i.service_id === service.id && i.service_option_id === option.id && i.design_option_id);

                                                            if (!optionItem && designItems.length === 0) return null;

                                                            return (
                                                                <li key={option.id} className="pb-4 last:pb-0 border-b last:border-0 border-neutral-100">
                                                                    <div className="flex items-start gap-2 mb-2">
                                                                        <span className="text-blue-600 font-bold">✓</span>
                                                                        <div>
                                                                            <span className="font-semibold">{option.name}</span>
                                                                            <p className="text-sm text-neutral-600 mt-1">{option.short_description}</p>
                                                                        </div>
                                                                    </div>

                                                                    {designItems.length > 0 && (
                                                                        <div className="ml-6 mt-3 bg-blue-50/50 p-3 rounded border border-blue-100">
                                                                            <h5 className="text-xs font-bold uppercase text-blue-800 mb-2">Design Configurations</h5>
                                                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                                {designItems.map(dItem => {
                                                                                    const design = option.design_options.find(d => d.id === dItem.design_option_id);
                                                                                    return (
                                                                                        <li key={dItem.design_option_id} className="text-sm flex items-center gap-2">
                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                                                                            <span className="font-medium text-neutral-800">{design?.name}</span>
                                                                                            <span className="text-neutral-500 text-xs">({design?.category})</span>
                                                                                        </li>
                                                                                    );
                                                                                })}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-white text-sm text-neutral-600">
                                                    Standard service implementation included.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="h-full flex flex-col">
                        <h2 className="text-2xl font-bold text-blue-900 mb-4 border-b border-neutral-200 pb-2">Edit High-Level Design (Markdown)</h2>
                        <textarea
                            className="flex-1 w-full min-h-[600px] p-4 font-mono text-sm border border-neutral-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
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
                            <button
                                onClick={() => window.print()}
                                className="px-6 py-2 rounded-full border border-neutral-600 hover:bg-neutral-800 transition-colors"
                            >
                                🖨️ PDF Preview
                            </button>
                            <button
                                onClick={handleGenerate}
                                className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 font-bold ml-auto"
                            >
                                ✨ AI Generate Markdown Edit
                            </button>
                            <Link
                                href={`/sa/project/${projectId}/bom`}
                                className="px-6 py-2 rounded-full bg-neutral-700 hover:bg-neutral-600 border border-neutral-500"
                            >
                                Next: BOM Builder &rarr;
                            </Link>
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
