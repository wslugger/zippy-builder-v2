"use client";

import React, { useState, useEffect } from "react";
import { ManagementPricingMatrix } from "@/src/lib/types";
import { ManagementPricingService } from "@/src/lib/firebase/management-pricing-service";

const PURPOSES = ["WAN", "LAN", "WLAN", "SECURITY"];
const SIZES = ["X-Small", "Small", "Medium", "Large", "X-Large", "None"];
const LEVELS = ["Watch & Alert", "Hardware Plus", "Total Care"];

export default function ManagementPricingEditor() {
    const [matrix, setMatrix] = useState<ManagementPricingMatrix>({});
    const [activeTab, setActiveTab] = useState<string>("WAN");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await ManagementPricingService.getManagementPricing();
                setMatrix(data || {});
            } catch (error) {
                console.error("Failed to load matrix:", error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const handleChange = (purpose: string, size: string, level: string, value: string) => {
        const numValue = parseFloat(value);
        setMatrix((prev) => {
            const newMatrix = { ...prev };
            if (!newMatrix[purpose]) newMatrix[purpose] = {};
            if (!newMatrix[purpose][size]) newMatrix[purpose][size] = {};
            newMatrix[purpose][size][level] = isNaN(numValue) ? 0 : numValue;
            return newMatrix;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            await ManagementPricingService.saveManagementPricing(matrix);
            setMessage({ text: "Matrix saved successfully!", type: "success" });
        } catch (error) {
            console.error("Failed to save matrix:", error);
            setMessage({ text: "Failed to save matrix.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                {PURPOSES.map((purpose) => (
                    <button
                        key={purpose}
                        onClick={() => setActiveTab(purpose)}
                        className={`px-6 py-3 font-semibold text-sm transition-all focus:outline-none ${activeTab === purpose
                            ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                            }`}
                    >
                        {purpose}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-950 font-bold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-6 py-4">Equipment Size</th>
                            {LEVELS.map((level) => (
                                <th key={level} className="px-6 py-4">{level} ($/mo)</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {SIZES.map((size) => (
                            <tr key={size} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-zinc-800 dark:text-zinc-200">{size}</td>
                                {LEVELS.map((level) => {
                                    const val = matrix[activeTab]?.[size]?.[level] ?? "";
                                    return (
                                        <td key={level} className="px-6 py-4">
                                            <div className="relative max-w-[120px]">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                                                <input
                                                    type="number"
                                                    value={val}
                                                    onChange={(e) => handleChange(activeTab, size, level, e.target.value)}
                                                    placeholder="0"
                                                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between pt-4">
                <div>
                    {message && (
                        <span className={`text-sm font-bold ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                            {message.text}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        "Save Matrix"
                    )}
                </button>
            </div>
        </div>
    );
}
