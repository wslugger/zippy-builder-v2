"use client";

import { useState } from "react";
import { Service } from "@/src/lib/types";
import { ServiceService } from "@/src/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ServiceIngestion() {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<Service | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>("");
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleIngest = async () => {
        if (!file) return;

        setIsLoading(true);
        setStatusMessage("Analysing Service Document with Gemini...");
        setPreviewData(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/admin/services/ingest", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setPreviewData(data.data);
                setStatusMessage("Analysis Complete. Review extraction below.");
            } else {
                setStatusMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error(error);
            setStatusMessage("Failed to ingest file.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!previewData) return;

        setIsLoading(true);
        setStatusMessage("Saving Service to Catalog...");

        try {
            await ServiceService.saveService(previewData);
            setStatusMessage("🚀 Success! Service saved to Catalog.");

            // Redirect to editor for final touches
            setTimeout(() => {
                router.push(`/admin/services/${previewData.id}`);
            }, 1500);

        } catch (error: any) {
            console.error("Save Error:", error);
            setStatusMessage(`Failure: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const updateService = (updates: Partial<Service>) => {
        if (!previewData) return;
        setPreviewData({ ...previewData, ...updates });
    };

    const updateOption = (index: number, updates: Partial<any>) => {
        if (!previewData) return;
        const newOptions = [...previewData.service_options];
        newOptions[index] = { ...newOptions[index], ...updates };
        setPreviewData({ ...previewData, service_options: newOptions });
    };

    const deleteOption = (index: number) => {
        if (!previewData) return;
        const newOptions = previewData.service_options.filter((_, i) => i !== index);
        setPreviewData({ ...previewData, service_options: newOptions });
    };

    return (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Service Ingestion</h2>
                <Link href="/admin/services" className="text-sm text-zinc-500 hover:text-blue-600 transition-colors">
                    View Catalog
                </Link>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 p-8 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center mb-8">
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="service-upload"
                />
                <label
                    htmlFor="service-upload"
                    className="cursor-pointer block group"
                >
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>
                    <p className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">
                        {file ? file.name : "Upload Service PDF"}
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Gemini will extract name, descriptions, options, and caveats.
                    </p>
                </label>
            </div>

            <div className="flex justify-center mb-8">
                <button
                    onClick={handleIngest}
                    disabled={!file || isLoading}
                    className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Processing...
                        </>
                    ) : (
                        "Analyze with AI"
                    )}
                </button>
            </div>

            {statusMessage && (
                <div className={`p-4 mb-8 rounded-lg text-sm text-center ${statusMessage.includes("Error") || statusMessage.includes("Failure") ? "bg-red-50 text-red-700 border border-red-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
                    {statusMessage}
                </div>
            )}

            {/* Preview & Edit Card */}
            {previewData && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">AI Extraction Preview</h3>
                            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Review and correct fields before saving</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            Save to Catalog
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Service Name</label>
                                <input
                                    type="text"
                                    value={previewData.name}
                                    onChange={(e) => updateService({ name: e.target.value })}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Short Description</label>
                                <textarea
                                    value={previewData.short_description}
                                    onChange={(e) => updateService({ short_description: e.target.value })}
                                    rows={2}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Service Options ({previewData.service_options.length})</h5>
                            <div className="space-y-4">
                                {previewData.service_options.map((opt, i) => (
                                    <div key={i} className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 relative group">
                                        <button
                                            onClick={() => deleteOption(i)}
                                            className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Option"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>

                                        <div className="grid gap-3">
                                            <div>
                                                <input
                                                    type="text"
                                                    value={opt.name}
                                                    onChange={(e) => updateOption(i, { name: e.target.value })}
                                                    className="w-full bg-transparent border-none p-0 text-zinc-900 dark:text-zinc-100 font-semibold focus:ring-0 placeholder:text-zinc-300"
                                                    placeholder="Option Name"
                                                />
                                            </div>
                                            <div>
                                                <textarea
                                                    value={opt.short_description}
                                                    onChange={(e) => updateOption(i, { short_description: e.target.value })}
                                                    rows={2}
                                                    className="w-full bg-transparent border-none p-0 text-xs text-zinc-500 focus:ring-0 resize-none placeholder:text-zinc-300"
                                                    placeholder="Short Description"
                                                />
                                            </div>
                                        </div>

                                        {/* Nested Design Options - Read only for now unless needed */}
                                        {opt.design_options && opt.design_options.length > 0 && (
                                            <div className="mt-4 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-2">
                                                {opt.design_options.map((design, j) => (
                                                    <div key={j} className="text-xs bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                                        <div className="font-medium text-zinc-800 dark:text-zinc-200">{design.name}</div>
                                                        <div className="text-zinc-500 mb-1">{design.short_description}</div>
                                                        {design.decision_driver && (
                                                            <div className="text-[10px] text-blue-600 dark:text-blue-400">
                                                                <span className="font-bold uppercase">Driver:</span> {design.decision_driver}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {(previewData.caveats.length > 0 || previewData.assumptions.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <div>
                                    <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Caveats</h5>
                                    <ul className="text-xs text-zinc-500 list-disc pl-4 space-y-1">
                                        {previewData.caveats.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Assumptions</h5>
                                    <ul className="text-xs text-zinc-500 list-disc pl-4 space-y-1">
                                        {previewData.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
