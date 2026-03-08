/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import FirebaseDebug from "./FirebaseDebug";
import { VENDOR_IDS, VENDOR_LABELS, Equipment, EQUIPMENT_PURPOSES } from "@/src/lib/types";
import { getEquipmentRole } from "@/src/lib/bom-utils";
import { EquipmentService } from "@/src/lib/firebase/equipment-service";

interface IngestItem {
    data: Equipment;
    existing?: Equipment;
    status: 'new' | 'unchanged' | 'updated';
    diffFields: string[];
}

export default function EquipmentIngestion() {
    const [file, setFile] = useState<File | null>(null);
    const [vendorId, setVendorId] = useState<string>(VENDOR_IDS[0]);
    const [selectedPurposes, setSelectedPurposes] = useState<string[]>(["LAN"]);
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<IngestItem[] | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>("");

    const handlePurposeChange = (purpose: string) => {
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
                const extractedItems: Equipment[] = Array.isArray(data.data) ? data.data : [data.data];

                // Fetch existing catalog for comparison
                const existingCatalog = await EquipmentService.getAllEquipment();

                const itemsWithStatus: IngestItem[] = extractedItems.map(item => {
                    const existing = existingCatalog.find(e => e.id === item.id);
                    if (!existing) {
                        return { data: item, status: 'new', diffFields: [] };
                    }

                    const diffFields: string[] = [];
                    const checkFields = ['primary_purpose', 'family', 'description'];
                    checkFields.forEach(f => {
                        if ((item as any)[f] !== (existing as any)[f]) diffFields.push(f);
                    });

                    // Compare specs - specifically the new cellular fields
                    const specFields = [
                        'rawFirewallThroughputMbps', 'sdwanCryptoThroughputMbps', 'advancedSecurityThroughputMbps',
                        'wanPortCount', 'lanPortCount', 'integrated_cellular', 'modular_cellular', 'cellular_type'
                    ];
                    specFields.forEach(sf => {
                        if ((item.specs as any)[sf] !== (existing.specs as any)[sf]) {
                            diffFields.push(`specs.${sf}`);
                        }
                    });

                    if (diffFields.length === 0) {
                        return { data: item, existing, status: 'unchanged', diffFields };
                    }

                    return { data: item, existing, status: 'updated', diffFields };
                });

                setPreviewData(itemsWithStatus);
                setStatusMessage(`Analysis Complete. Found ${extractedItems.length} items (${itemsWithStatus.filter(i => i.status === 'new').length} new, ${itemsWithStatus.filter(i => i.status === 'updated').length} updated).`);
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

        const toSave = previewData.filter(i => i.status !== 'unchanged');
        if (toSave.length === 0 && !confirm("No changes detected in checked items. Save anyway?")) return;

        setIsLoading(true);
        let savedCount = 0;
        let errorCount = 0;

        try {
            const dataToProcess = toSave.length > 0 ? toSave : previewData;
            for (let i = 0; i < dataToProcess.length; i++) {
                const item = dataToProcess[i].data;
                setStatusMessage(`Saving item ${i + 1} of ${dataToProcess.length}: ${item.model}...`);

                try {
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
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm border ${item.status === 'new' ? 'bg-green-100 text-green-700 border-green-200' :
                                                item.status === 'updated' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                    'bg-zinc-100 text-zinc-500 border-zinc-200'
                                            }`}>
                                            {item.status}
                                        </div>
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.data.model}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newData = [...previewData];
                                            newData.splice(index, 1);
                                            setPreviewData(newData);
                                            if (newData.length === 0) setStatusMessage("All items removed.");
                                        }}
                                        className="p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200"
                                        title="Remove from extraction"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-3">
                                    <div className={item.diffFields.some(f => f.startsWith('specs.')) ? 'ring-2 ring-amber-500/20 rounded-md p-1 -m-1' : ''}>
                                        {getEquipmentRole(item.data) === 'LAN' ? (
                                            <div>
                                                <span className="block text-xs font-medium text-zinc-500 uppercase">Capacity</span>
                                                <span className="text-zinc-700 dark:text-zinc-300 font-medium">{(item.data.specs as any).accessPortCount || (item.data.specs as any).ports || 0} Ports</span>
                                                <span className="block text-[10px] text-zinc-400">{(item.data.specs as any).poeBudgetWatts || (item.data.specs as any).poe_budget || 0}W PoE Budget</span>
                                            </div>
                                        ) : getEquipmentRole(item.data) === 'WLAN' ? (
                                            <div>
                                                <span className="block text-xs font-medium text-zinc-500 uppercase">Wi-Fi Specs</span>
                                                <span className="text-zinc-700 dark:text-zinc-300 font-medium">{(item.data.specs as any).wifi_standard || (item.data.specs as any).wifiStandard || "Unknown"}</span>
                                                <span className="block text-[10px] text-zinc-400">{(item.data.specs as any).spatialStreams || (item.data.specs as any).mimoBandwidth || "Unknown"}</span>
                                            </div>
                                        ) : (
                                            <div>
                                                <span className="block text-xs font-medium text-zinc-500 uppercase">Performance</span>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className={`flex justify-between items-center ${item.diffFields.includes('specs.sdwanCryptoThroughputMbps') ? 'text-amber-600 font-bold' : ''}`}>
                                                        <span>Crypto:</span>
                                                        <span>{(item.data.specs as any).sdwanCryptoThroughputMbps || 0} Mbps</span>
                                                    </div>
                                                    <div className={`flex justify-between items-center ${item.diffFields.includes('specs.advancedSecurityThroughputMbps') ? 'text-amber-600 font-bold' : ''}`}>
                                                        <span>Adv Sec:</span>
                                                        <span>{(item.data.specs as any).advancedSecurityThroughputMbps || 0} Mbps</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <span className="block text-xs font-medium text-zinc-500 uppercase">Cellular Cap.</span>
                                        <div className="flex flex-col gap-0.5">
                                            <div className={`flex items-center gap-1 ${item.diffFields.includes('specs.integrated_cellular') || item.diffFields.includes('specs.cellular_type') ? 'text-amber-600 font-bold' : ''}`}>
                                                <span className={`w-2 h-2 rounded-full ${item.data.specs.integrated_cellular ? 'bg-blue-500' : 'bg-zinc-200'}`}></span>
                                                <span>Integrated {item.data.specs.integrated_cellular ? `(${item.data.specs.cellular_type || 'LTE'})` : ''}</span>
                                            </div>
                                            <div className={`flex items-center gap-1 ${item.diffFields.includes('specs.modular_cellular') ? 'text-amber-600 font-bold' : ''}`}>
                                                <span className={`w-2 h-2 rounded-full ${item.data.specs.modular_cellular ? 'bg-orange-500' : 'bg-zinc-200'}`}></span>
                                                <span>Modular (PIM)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-medium text-zinc-500 uppercase">Interfaces</span>
                                        <div className="text-[10px] leading-tight">
                                            {getEquipmentRole(item.data) === 'WAN' && (
                                                <>
                                                    <div className={item.diffFields.includes('specs.wanPortCount') ? 'text-amber-600 font-bold' : ''}><span className="text-blue-500">W:</span> {(item.data.specs as any).wanPortCount || 0}</div>
                                                    <div className={item.diffFields.includes('specs.lanPortCount') ? 'text-amber-600 font-bold' : ''}><span className="text-green-500">L:</span> {(item.data.specs as any).lanPortCount || 0}</div>
                                                </>
                                            )}
                                            {getEquipmentRole(item.data) === 'LAN' && (
                                                <>
                                                    <div><span className="text-blue-500">A:</span> {(item.data.specs as any).accessPortCount || (item.data.specs as any).ports || 0}</div>
                                                    <div><span className="text-green-500">U:</span> {(item.data.specs as any).uplinkPortCount || 0}</div>
                                                </>
                                            )}
                                            {getEquipmentRole(item.data) === 'WLAN' && (
                                                <>
                                                    {(item.data.specs as any).interfaces && <div><span className="text-blue-500">Intf:</span> {(item.data.specs as any).interfaces}</div>}
                                                    {(item.data.specs as any).management && <div><span className="text-purple-500">Mgmt:</span> {(item.data.specs as any).management}</div>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-medium text-zinc-500 uppercase">{getEquipmentRole(item.data) === 'WLAN' ? 'Power Draw' : 'PoE Budget'}</span>
                                        <span className="text-zinc-700 dark:text-zinc-300">
                                            {getEquipmentRole(item.data) === 'WLAN'
                                                ? (item.data.specs as any).power || (item.data.specs as any).powerDrawWatts || 'Unknown'
                                                : ((item.data as any).specs.poeBudgetWatts || (item.data as any).specs.poe_budget || 0) + 'W'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${item.diffFields.includes('primary_purpose') ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold' : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-transparent'}`}>
                                        {(item.data as any).primary_purpose}
                                    </span>
                                    {((item.data as any).additional_purposes || []).map((p: string) => (
                                        <span key={p} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-50 text-zinc-600 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800">
                                            {p}
                                        </span>
                                    ))}
                                    {((item.data as any).mapped_services || []).map((s: string) => (
                                        <span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                            {s}
                                        </span>
                                    ))}
                                </div>

                                <details className="group">
                                    <summary className="flex items-center text-xs font-medium text-blue-600 cursor-pointer hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                        <span>View Detail Diff ({item.diffFields.length} fields modified)</span>
                                        <svg className="ml-1 w-3 h-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </summary>
                                    <div className="mt-2 grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1 block">New Extraction</span>
                                            <pre className="bg-zinc-50 dark:bg-black p-2 rounded border border-zinc-100 dark:border-zinc-800 text-[10px] font-mono overflow-x-auto text-zinc-600 dark:text-zinc-400">
                                                {JSON.stringify(item.data.specs, null, 2)}
                                            </pre>
                                        </div>
                                        {item.existing && (
                                            <div>
                                                <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1 block">Current In Catalog</span>
                                                <pre className="bg-zinc-50 dark:bg-black p-2 rounded border border-zinc-100 dark:border-zinc-800 text-[10px] font-mono overflow-x-auto text-zinc-600 dark:text-zinc-400 opacity-60">
                                                    {JSON.stringify(item.existing.specs, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
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
