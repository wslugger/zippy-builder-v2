"use client";

import { useState, useCallback } from "react";
import { parsePricingCSV, PricingRow } from "@/src/lib/pricing-csv-parser";

interface IngestResult {
    effectiveDate: string | null;
    total: number;
    updated: number;
    skipped: number;
}

export default function PricingIngestPage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PricingRow[]>([]);
    const [effectiveDate, setEffective] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isIngesting, setIsIngesting] = useState(false);
    const [result, setResult] = useState<IngestResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // ─── File handling ──────────────────────────────────────────────────────
    const handleFile = useCallback(async (f: File) => {
        setFile(f);
        setResult(null);
        setError(null);
        const text = await f.text();
        const parsed = parsePricingCSV(text);
        setEffective(parsed.effectiveDate);
        setPreview(parsed.rows.slice(0, 20)); // show first 20 as preview
    }, []);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f && f.name.endsWith(".csv")) handleFile(f);
    };

    // ─── Ingest ─────────────────────────────────────────────────────────────
    const handleIngest = async () => {
        if (!file) return;
        setIsIngesting(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/admin/pricing/ingest", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Ingest failed.");
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsIngesting(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black py-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Pricing Ingest
                    </h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-sm">
                        Upload a Cisco Global Price List CSV to update equipment list prices and End-of-Sale status in the master catalog.
                    </p>
                </div>

                {/* Dropzone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    className={`rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${isDragging
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-green-400"
                        }`}
                    onClick={() => document.getElementById("pricing-csv-input")?.click()}
                >
                    <input
                        id="pricing-csv-input"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={onFileChange}
                    />
                    <div className="mx-auto w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>
                    {file ? (
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{file.name}</p>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Drop your CSV here, or click to browse</p>
                            <p className="text-xs text-zinc-400 mt-1">Accepts .csv — Cisco Global Price List format</p>
                        </>
                    )}
                </div>

                {/* Effective date badge */}
                {effectiveDate && (
                    <div className="mt-4 inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                        📅 Price List effective: {effectiveDate}
                    </div>
                )}

                {/* Preview table */}
                {preview.length > 0 && (
                    <div className="mt-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Preview <span className="ml-2 text-xs font-normal text-zinc-400">(first 20 rows)</span>
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm divide-y divide-zinc-100 dark:divide-zinc-800">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Product / SKU</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">List Price (USD)</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">End-of-Sale Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                                    {preview.map((row, i) => (
                                        <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                            <td className="px-6 py-3 font-mono text-xs text-zinc-800 dark:text-zinc-200">{row.product}</td>
                                            <td className="px-6 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                                                ${row.listPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-3">
                                                {row.eosDate ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                        EoS: {row.eosDate}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400 text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Error banner */}
                {error && (
                    <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                        ⚠️ {error}
                    </div>
                )}

                {/* Result banner */}
                {result && (
                    <div className="mt-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300">✅ Ingest complete</p>
                        <div className="mt-2 flex gap-6 text-sm text-green-700 dark:text-green-400">
                            <span><strong>{result.updated}</strong> records updated</span>
                            <span><strong>{result.skipped}</strong> records skipped (unchanged / not in catalog)</span>
                            <span><strong>{result.total}</strong> rows processed</span>
                        </div>
                        {result.effectiveDate && (
                            <p className="mt-1 text-xs text-green-600 dark:text-green-500">Price list effective: {result.effectiveDate}</p>
                        )}
                    </div>
                )}

                {/* Ingest button */}
                {file && !result && (
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleIngest}
                            disabled={isIngesting}
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow transition-all disabled:opacity-60"
                        >
                            {isIngesting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-green-300 border-t-white rounded-full animate-spin" />
                                    Ingesting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Ingest Prices → Firestore
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
