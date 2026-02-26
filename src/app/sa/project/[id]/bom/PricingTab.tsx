"use client";

import React from "react";
import { BOMBuilderState } from "./useBOMBuilder";
import { VENDOR_LABELS } from "@/src/lib/types";

export function PricingTab({ state }: { state: BOMBuilderState }) {
    const {
        bom,
        catalog,
        globalDiscount,
        setGlobalDiscount,
        swapSimulation,
        setSwapSimulation,
        pricingSummary,
        simulatedPricingSummary
    } = state;

    // Only show items from the canonical managed services that the site tabs render.
    // WAN tab renders managed_sdwan, LAN tab renders managed_lan.
    // TODO: Add "managed_wifi" here once WLAN features are built out.
    const SITE_TAB_SERVICE_IDS = new Set(["managed_sdwan", "managed_lan", "managed_circuit"]);

    if (!bom) return <div className="p-8 text-slate-500">No BOM data available to price.</div>;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    // Get unique equipment from the BOM for the "From" dropdown
    const uniqueBOMItems = Array.from(new Set(bom.items.map(item => item.itemId)))
        .map(id => {
            const item = bom.items.find(i => i.itemId === id);
            return { id, name: item?.itemName || id, vendor_id: catalog.find(e => e.id === id)?.vendor_id };
        });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Main Pricing Table ── */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Pricing Breakdown</h3>
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Site / Item</th>
                                    <th className="px-6 py-3 font-semibold text-right">Qty</th>
                                    <th className="px-6 py-3 font-semibold text-right">Unit List</th>
                                    <th className="px-6 py-3 font-semibold text-right">Total Net</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {Object.keys(pricingSummary.siteSummaries)
                                    .filter(siteName => !state.selectedSite || siteName === state.selectedSite.name)
                                    .map(siteName => {
                                        // Only include items from services that have a visible tab.
                                        const rawSiteItems = bom.items.filter(
                                            i => i.siteName === siteName && SITE_TAB_SERVICE_IDS.has(i.serviceId)
                                        );

                                        if (rawSiteItems.length === 0) return null; // Skip sites with no visible items

                                        // Aggregate items by physical device (itemId only).
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
                            <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
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
                                            // Same vendor check per user requirement
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

                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/50 p-6">
                        <h4 className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm mb-2">
                            <span>💡</span> Pro Tip
                        </h4>
                        <p className="text-xs text-amber-700/80 dark:text-amber-500/80 leading-relaxed">
                            Use the simulation to find the &quot;sweet spot&quot; for pricing. Sometimes stepping up a model size reduces the quantity needed for LAN switches due to port density, leading to a lower overall BOM cost.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
