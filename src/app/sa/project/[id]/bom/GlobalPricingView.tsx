"use client";

import React, { useState } from "react";
import { BOMBuilderState } from "./useBOMBuilder";
import { VENDOR_LABELS } from "@/src/lib/types";

export function GlobalPricingView({ state }: { state: BOMBuilderState }) {
    const {
        bom,
        catalog,
        globalDiscount,
        setGlobalDiscount,
        swapSimulation,
        setSwapSimulation,
        pricingSummary,
        simulatedPricingSummary,
        sites
    } = state;

    const [showImportModal, setShowImportModal] = useState(false);
    const [importTab, setImportTab] = useState<"api" | "csv">("api");
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const SITE_TAB_SERVICE_IDS = new Set(["managed_sdwan", "managed_lan"]);

    if (!bom) return <div className="p-8 text-slate-500">No BOM data available to price.</div>;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const uniqueBOMItems = Array.from(new Set(bom.items.map(item => item.itemId)))
        .map(id => {
            const item = bom.items.find(i => i.itemId === id);
            return { id, name: item?.itemName || id, vendor_id: catalog.find(e => e.id === id)?.vendor_id };
        });

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-50 dark:bg-slate-950 min-h-full">

            {/* ── Toast Notification ── */}
            {toastMessage && (
                <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3">
                    <span className="text-green-400">✓</span>
                    <span className="font-medium text-sm">{toastMessage}</span>
                </div>
            )}

            {/* ── Header Stats ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total List Price</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(pricingSummary.totalListPrice)}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Total Net Price</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(pricingSummary.totalNetPrice)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-800/50 shadow-sm">
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Total Savings</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(pricingSummary.totalSavings)}</p>
                    <p className="text-xs text-green-600/80 mt-1">({globalDiscount}% discount applied)</p>
                </div>
                {simulatedPricingSummary && (
                    <div className={`p-6 rounded-2xl border shadow-sm ${simulatedPricingSummary.delta < 0 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50' : 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50'}`}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                            Simulation Impact
                            <span className="text-[10px] bg-white dark:bg-slate-800 px-1 rounded border">LIVE</span>
                        </p>
                        <p className={`text-2xl font-bold ${simulatedPricingSummary.delta < 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                            {simulatedPricingSummary.delta > 0 ? '+' : ''}{formatCurrency(simulatedPricingSummary.delta)}
                        </p>
                        <p className="text-xs opacity-80 mt-1">across all sites</p>
                    </div>
                )}
            </div>

            {/* ── Integrations Action Bar ── */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">External Tools & Integrations</h3>
                    <p className="text-xs text-slate-500 mt-1">Connect BOM pricing to downstream carrier systems and quoting tools.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-700"
                    >
                        <span>📥</span> Import Circuit Pricing
                    </button>
                    <button
                        onClick={() => triggerToast("Pricing payload exported to Zippy Quoting Tool successfully.")}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 border border-blue-200 dark:border-blue-800/50"
                    >
                        <span>🚀</span> Export to Quoting
                    </button>
                    <button
                        onClick={() => triggerToast("Vendor discounting template downloaded.")}
                        className="px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 border border-purple-200 dark:border-purple-800/50"
                    >
                        <span>📊</span> Vendor Discounting
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Main Pricing Table ── */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Project Pricing Breakdown</h3>
                        <div className="flex items-center gap-4">
                            <label className="text-xs font-medium text-slate-500">Global Discount:</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={globalDiscount}
                                    onChange={(e) => setGlobalDiscount(parseInt(e.target.value))}
                                    className="w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        value={globalDiscount}
                                        onChange={(e) => setGlobalDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                        className="w-12 text-center text-xs font-bold bg-slate-50 dark:bg-slate-800 border-none rounded py-1 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-slate-400 ml-1">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left text-sm relative">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Site / Item</th>
                                    <th className="px-6 py-3 font-semibold text-right">Qty</th>
                                    <th className="px-6 py-3 font-semibold text-right">Unit List</th>
                                    <th className="px-6 py-3 font-semibold text-right">Total Net</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {Object.keys(pricingSummary.siteSummaries).map(siteName => {
                                    const rawSiteItems = bom.items.filter(
                                        i => i.siteName === siteName && SITE_TAB_SERVICE_IDS.has(i.serviceId)
                                    );

                                    if (rawSiteItems.length === 0) return null;

                                    const aggregatedItems: Record<string, (typeof rawSiteItems)[0]> = {};
                                    rawSiteItems.forEach(item => {
                                        const key = item.itemId;
                                        if (aggregatedItems[key]) {
                                            aggregatedItems[key] = {
                                                ...aggregatedItems[key],
                                                quantity: aggregatedItems[key].quantity + item.quantity,
                                                serviceId: "mixed",
                                                serviceName: "Multiple Services",
                                            };
                                        } else {
                                            aggregatedItems[key] = { ...item };
                                        }
                                    });
                                    const siteItems = Object.values(aggregatedItems);

                                    return (
                                        <React.Fragment key={siteName}>
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                                                <td colSpan={4} className="px-6 py-2 font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                    {siteName}
                                                </td>
                                            </tr>
                                            {siteItems.map(item => {
                                                const listPrice = item.pricing?.listPrice || 0;
                                                const netPrice = listPrice * (1 - globalDiscount / 100);
                                                const totalNet = netPrice * item.quantity;

                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-slate-900 dark:text-slate-100">{item.itemName}</div>
                                                            <div className="text-[10px] text-slate-400 uppercase">{item.serviceName}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-medium">{item.quantity}</td>
                                                        <td className="px-6 py-4 text-right text-slate-500">
                                                            {listPrice > 0 ? formatCurrency(listPrice) : <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded italic">No Price</span>}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">
                                                            {formatCurrency(totalNet)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 text-right">Project Grand Total (Net)</td>
                                    <td className="px-6 py-4 text-right font-black text-lg text-blue-600 dark:text-blue-400">
                                        {formatCurrency(pricingSummary.totalNetPrice)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* ── Simulation Panel ── */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="text-lg">🧪</span> Hardware Swap Simulator
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Test the impact of switching equipment models across the entire project.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Swap From (Current BOM)</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={swapSimulation?.fromItemId || ""}
                                    onChange={(e) => {
                                        const fromId = e.target.value;
                                        if (!fromId) {
                                            setSwapSimulation(null);
                                        } else {
                                            setSwapSimulation({ fromItemId: fromId, toItemId: swapSimulation?.toItemId || "" });
                                        }
                                    }}
                                >
                                    <option value="">Select equipment to replace...</option>
                                    {uniqueBOMItems.map(item => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-center -my-2 opacity-50">
                                <span className="bg-white dark:bg-slate-900 px-2 text-xl font-bold">↓</span>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Swap To (Catalog Option)</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={swapSimulation?.toItemId || ""}
                                    disabled={!swapSimulation?.fromItemId}
                                    onChange={(e) => {
                                        if (swapSimulation?.fromItemId) {
                                            setSwapSimulation({ fromItemId: swapSimulation.fromItemId, toItemId: e.target.value });
                                        }
                                    }}
                                >
                                    <option value="">Select alternative equipment...</option>
                                    {catalog
                                        .filter(e => {
                                            if (!swapSimulation?.fromItemId) return false;
                                            const fromEquip = catalog.find(f => f.id === swapSimulation.fromItemId);
                                            return fromEquip && e.vendor_id === fromEquip.vendor_id && e.id !== fromEquip.id;
                                        })
                                        .map(item => (
                                            <option key={item.id} value={item.id}>{VENDOR_LABELS[item.vendor_id] || item.vendor_id} {item.model}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            {swapSimulation?.fromItemId && swapSimulation?.toItemId && (
                                <button
                                    onClick={() => setSwapSimulation(null)}
                                    className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 underline"
                                >
                                    Clear Simulation
                                </button>
                            )}
                        </div>

                        {simulatedPricingSummary && (
                            <div className={`p-6 border-t ${simulatedPricingSummary.delta < 0 ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-rose-50 dark:bg-rose-900/10'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Simulation Impact:</span>
                                    <span className={`font-bold ${simulatedPricingSummary.delta < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {simulatedPricingSummary.delta > 0 ? '+' : ''}{formatCurrency(simulatedPricingSummary.delta)}
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-500 leading-relaxed italic">
                                    This simulation replaces all instances of {catalog.find(f => f.id === swapSimulation?.fromItemId)?.model} with {catalog.find(f => f.id === swapSimulation?.toItemId)?.model} across all sites, applying the current {globalDiscount}% global discount.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Import Circuit Pricing Modal ── */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Import Circuit Pricing</h3>
                                <p className="text-xs text-slate-500 mt-1">Add carrier cost data to your deployment model.</p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="border-b border-slate-200 dark:border-slate-800">
                            <div className="flex">
                                <button
                                    onClick={() => setImportTab("api")}
                                    className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${importTab === "api" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                                >
                                    Import via API
                                </button>
                                <button
                                    onClick={() => setImportTab("csv")}
                                    className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${importTab === "csv" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                                >
                                    CSV Upload
                                </button>
                            </div>
                        </div>

                        <div className="p-6 min-h-[200px]">
                            {importTab === "api" && (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Connect to your carrier pricing API to automatically fetch quotes for the {sites?.length || 0} sites in this project.</p>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Select Provider Profile</label>
                                        <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                                            <option>Global Aggregator API (Primary)</option>
                                            <option>Direct Carrier Feed</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowImportModal(false);
                                            triggerToast("API query initiated. Prices will update shortly.");
                                        }}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors mt-4"
                                    >
                                        Run API Query
                                    </button>
                                </div>
                            )}

                            {importTab === "csv" && (
                                <div className="space-y-4 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <div className="text-3xl">📄</div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Drag &amp; Drop CSV File</p>
                                        <p className="text-xs text-slate-500 mt-1">Must contain Site Name/ID and Monthly Cost columns</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowImportModal(false);
                                            triggerToast("CSV pricing data imported successfully.");
                                        }}
                                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-sm rounded-lg transition-colors mt-2"
                                    >
                                        Browse Files
                                    </button>
                                </div>
                            )}

                            {/* Manual Entry hint — directs user to WAN tab */}
                            <div className="mt-4 flex items-start gap-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                <span className="text-slate-400 text-sm mt-0.5">💡</span>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    <strong className="text-slate-700 dark:text-slate-300">Entering costs per circuit?</strong> Navigate to a site in the sidebar and open the <em>WAN</em> tab — each circuit has an inline $/mo field in the Circuit Configuration section.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
