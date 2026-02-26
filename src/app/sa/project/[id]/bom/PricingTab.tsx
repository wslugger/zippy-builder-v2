"use client";

import React from "react";
import { BOMBuilderState } from "./useBOMBuilder";
import { Site } from "@/src/lib/bom-types";

export function PricingTab({ state, selectedSite }: { state: BOMBuilderState, selectedSite: Site }) {
    const {
        bom,
        globalDiscount,
        pricingSummary
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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Site Pricing Breakdown</h3>
                        <p className="text-xs text-slate-500 mt-1">Pricing specific to <strong>{selectedSite.name}</strong> (Includes {globalDiscount}% global discount)</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Item</th>
                                <th className="px-6 py-3 font-semibold text-right">Qty</th>
                                <th className="px-6 py-3 font-semibold text-right">Unit List</th>
                                <th className="px-6 py-3 font-semibold text-right">Total Net</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {Object.keys(pricingSummary.siteSummaries)
                                .filter(siteName => siteName === selectedSite.name)
                                .map(siteName => {
                                    // Only include items from services that have a visible tab.
                                    const rawSiteItems = bom.items.filter(
                                        i => i.siteName === siteName && SITE_TAB_SERVICE_IDS.has(i.serviceId)
                                    );

                                    if (rawSiteItems.length === 0) return null;

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
                                            {siteItems.map(item => {
                                                const unitList = (item.unitOTC || 0) + (item.unitMRC || 0);
                                                const totalNet = (item.totalOTC || 0) + (item.totalMRC || 0);

                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-slate-900 dark:text-slate-100">{item.itemName}</div>
                                                            <div className="text-[10px] text-slate-400 uppercase">{item.serviceName}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-medium">{item.quantity}</td>
                                                        <td className="px-6 py-4 text-right text-slate-500">
                                                            {unitList > 0 ? formatCurrency(unitList) : <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded italic">No Price</span>}
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
                                <td colSpan={3} className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 text-right">Site Total (Net)</td>
                                <td className="px-6 py-4 text-right font-black text-lg text-blue-600 dark:text-blue-400">
                                    {formatCurrency(pricingSummary.siteSummaries[selectedSite.name]?.net || 0)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
