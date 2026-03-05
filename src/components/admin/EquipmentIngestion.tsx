/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import FirebaseDebug from "./FirebaseDebug";
import { VENDOR_IDS, VENDOR_LABELS, Equipment, EQUIPMENT_PURPOSES } from "@/src/lib/types";
import { getEquipmentRole } from "@/src/lib/bom-utils";

export default function EquipmentIngestion() {
    const [file, setFile] = useState<File | null>(null);
    const [vendorId, setVendorId] = useState<string>(VENDOR_IDS[0]);
    const [selectedPurposes, setSelectedPurposes] = useState<string[]>(["LAN"]);
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<Equipment[] | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>("");

    const handlePurposeChange = (purpose: string) => {
        // Change to single selection for "Primary Purpose" context to keep it simple as requested
        setSelectedPurposes([purpose]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleIngest = async () => {
        if (!file) return;

        setIsLoading(true);
        setStatusMessage("Analyzing Datasheet with Gemini...");
        setPreviewData(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("vendorId", vendorId);
        formData.append("purposes", JSON.stringify(selectedPurposes));

        try {
            const res = await fetch("/api/ingest", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                // Ensure we handle both array and single object returns for backward compatibility
                const items = Array.isArray(data.data) ? data.data : [data.data];
                setPreviewData(items);
                setStatusMessage(`Analysis Complete. Found ${items.length} items.`);
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

    const handleDiscard = () => {
        setPreviewData(null);
        setFile(null);
        setStatusMessage("Extraction discarded.");
    };

    const handleSave = async () => {
        if (!previewData || previewData.length === 0) return;

        setIsLoading(true);
        let savedCount = 0;
        let errorCount = 0;

        try {
            for (let i = 0; i < previewData.length; i++) {
                const item = previewData[i];
                setStatusMessage(`Saving item ${i + 1} of ${previewData.length}: ${item.model}...`);

                try {
                    // Save individually via server-side API to bypass client network restrictions
                    const saveRes = await fetch("/api/admin/catalog/save", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ equipment: item }),
                    });

                    if (!saveRes.ok) {
                        const errorData = await saveRes.json();
                        throw new Error(errorData.error || "Server save failed");
                    }

                    savedCount++;
                } catch (err) {
                    console.error(`Failed to save ${item.model}:`, err);
                    errorCount++;
                }

                // Small delay to allow UI to update and prevent tight loop freezing
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            if (errorCount === 0) {
                setStatusMessage(`🚀 Success! All ${savedCount} items saved to Catalog.`);
                setPreviewData(null);
                setFile(null);
            } else {
                setStatusMessage(`⚠️ Completed with issues. Saved ${savedCount} items, failed ${errorCount}. Check console for details.`);
            }

        } catch (error: unknown) {
            console.error("Critical Save Error:", error);
            setStatusMessage(`Critical failure: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-md max-w-4xl mx-auto mt-10">
            <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">Equipment Ingestion</h2>

            {/* Ingestion Setup */}
            <div className="space-y-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Vendor</label>
                        <select
                            value={vendorId}
                            onChange={(e) => setVendorId(e.target.value)}
                            className="w-full p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                        >
                            {VENDOR_IDS.map((v) => (
                                <option key={v} value={v}>
                                    {VENDOR_LABELS[v]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Datasheet PDF</label>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Primary Category Hint (Optional)</label>
                    <div className="flex flex-wrap gap-4">
                        {EQUIPMENT_PURPOSES.map((p: string) => (
                            <label key={p} className="flex items-center gap-2 cursor-pointer bg-zinc-50 dark:bg-zinc-800 px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 transition-colors">
                                <input
                                    type="radio"
                                    name="primaryPurpose"
                                    checked={selectedPurposes.includes(p)}
                                    onChange={() => handlePurposeChange(p)}
                                    className="rounded-full border-zinc-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{p}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end mb-6">
                <button
                    onClick={handleIngest}
                    disabled={!file || isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? "Processing..." : "Analyze with AI"}
                </button>
            </div>

            {statusMessage && (
                <div className={`p-4 mb-6 rounded-md ${statusMessage.includes("Error") || statusMessage.includes("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {statusMessage}
                </div>
            )}

            {/* Preview Section */}
            {previewData && previewData.length > 0 && (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 bg-zinc-50 dark:bg-zinc-950">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Review Extraction ({previewData.length} Items)</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDiscard}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md disabled:opacity-50"
                            >
                                Discard All
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save All"
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {previewData.map((item, index) => (
                            <div key={index} className="relative group bg-white dark:bg-zinc-900 p-4 rounded-md border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <button
                                    onClick={() => {
                                        const newData = [...previewData];
                                        newData.splice(index, 1);
                                        setPreviewData(newData);
                                        if (newData.length === 0) setStatusMessage("All items removed.");
                                    }}
                                    className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200"
                                    title="Remove from extraction"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-3">
                                    <div>
                                        <span className="block text-xs font-medium text-zinc-500 uppercase">Model</span>
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.model}</span>
                                    </div>
                                    {getEquipmentRole(item) === 'LAN' ? (
                                        <div>
                                            <span className="block text-xs font-medium text-zinc-500 uppercase">Capacity</span>
                                            <span className="text-zinc-700 dark:text-zinc-300 font-medium">{(item.specs as any).accessPortCount || (item.specs as any).ports || 0} Ports</span>
                                            <span className="block text-[10px] text-zinc-400">{(item.specs as any).poeBudgetWatts || (item.specs as any).poe_budget || 0}W PoE Budget</span>
                                        </div>
                                    ) : getEquipmentRole(item) === 'WLAN' ? (
                                        <div>
                                            <span className="block text-xs font-medium text-zinc-500 uppercase">Wi-Fi Specs</span>
                                            <span className="text-zinc-700 dark:text-zinc-300 font-medium">{(item.specs as any).wifi_standard || (item.specs as any).wifiStandard || "Unknown"}</span>
                                            <span className="block text-[10px] text-zinc-400">{(item.specs as any).spatialStreams || (item.specs as any).mimoBandwidth || "Unknown"}</span>
                                        </div>
                                    ) : (
                                        <div>
                                            <span className="block text-xs font-medium text-zinc-500 uppercase">Throughput</span>
                                            <span className="text-zinc-700 dark:text-zinc-300 font-medium">{(item.specs as any).sdwanCryptoThroughputMbps || 0} Mbps</span>
                                            <span className="block text-[10px] text-zinc-400">Crypto</span>
                                        </div>
                                    )}
                                    <div>
                                        <span className="block text-xs font-medium text-zinc-500 uppercase">Interfaces</span>
                                        <div className="text-[10px] leading-tight">
                                            {getEquipmentRole(item) === 'WAN' && (
                                                <>
                                                    <div><span className="text-blue-500">W:</span> {(item.specs as any).wanPortCount || 0}</div>
                                                    <div><span className="text-green-500">L:</span> {(item.specs as any).lanPortCount || 0}</div>
                                                </>
                                            )}
                                            {getEquipmentRole(item) === 'LAN' && (
                                                <>
                                                    <div><span className="text-blue-500">A:</span> {(item.specs as any).accessPortCount || (item.specs as any).ports || 0}</div>
                                                    <div><span className="text-green-500">U:</span> {(item.specs as any).uplinkPortCount || 0}</div>
                                                </>
                                            )}
                                            {getEquipmentRole(item) === 'WLAN' && (
                                                <>
                                                    {(item.specs as any).interfaces && <div><span className="text-blue-500">Intf:</span> {(item.specs as any).interfaces}</div>}
                                                    {(item.specs as any).management && <div><span className="text-purple-500">Mgmt:</span> {(item.specs as any).management}</div>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-medium text-zinc-500 uppercase">{getEquipmentRole(item) === 'WLAN' ? 'Power Draw' : 'PoE Budget'}</span>
                                        <span className="text-zinc-700 dark:text-zinc-300">
                                            {getEquipmentRole(item) === 'WLAN'
                                                ? (item.specs as any).power || (item.specs as any).powerDrawWatts || 'Unknown'
                                                : ((item as any).specs.poeBudgetWatts || (item as any).specs.poe_budget || 0) + 'W'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                        {(item as any).primary_purpose}
                                    </span>
                                    {((item as any).additional_purposes || []).map((p: string) => (
                                        <span key={p} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-50 text-zinc-600 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800">
                                            {p}
                                        </span>
                                    ))}
                                    {((item as any).mapped_services || []).map((s: string) => (
                                        <span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                            {s}
                                        </span>
                                    ))}
                                    {(item as any).specs.vpn_tunnels && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                            {(item as any).specs.vpn_tunnels} VPN Tunnels
                                        </span>
                                    )}
                                    {(item as any).specs.stacking_supported && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                            Stackable
                                        </span>
                                    )}
                                </div>

                                <details className="group">
                                    <summary className="flex items-center text-xs font-medium text-blue-600 cursor-pointer hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                        <span>View All Field extractions</span>
                                        <svg className="ml-1 w-3 h-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </summary>
                                    <pre className="mt-2 bg-zinc-50 dark:bg-black p-2 rounded border border-zinc-100 dark:border-zinc-800 text-[10px] font-mono overflow-x-auto text-zinc-600 dark:text-zinc-400">
                                        {JSON.stringify(item.specs, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <FirebaseDebug />
        </div>
    );
}
