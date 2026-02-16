"use client";

import { useState, useEffect } from "react";
import { parseSiteListCSV } from "@/src/lib/csv-parser";
import { BOMEngine } from "@/src/lib/bom-engine";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { PackageService, ServiceService } from "@/src/lib/firebase";
import { BOM, Site } from "@/src/lib/bom-types";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";
import { Package, Service } from "@/src/lib/types";

export default function BOMBuilderPage() {
    const [parsedSites, setParsedSites] = useState<Site[]>([]);
    const [generatedBOM, setGeneratedBOM] = useState<BOM | null>(null);
    const [selectedPackageId, setSelectedPackageId] = useState<string>("");
    const [activeTab, setActiveTab] = useState<"upload" | "sites" | "bom">("upload");
    const [packages, setPackages] = useState<Package[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pkgs, svcs] = await Promise.all([
                    PackageService.getAllPackages(),
                    ServiceService.getAllServices(),
                ]);
                setPackages(pkgs);
                setServices(svcs);
                if (pkgs.length > 0) {
                    setSelectedPackageId(pkgs[0].id);
                }
            } catch (e) {
                console.error("Failed to load BOM data:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const sites = parseSiteListCSV(text);
            setParsedSites(sites);
            setActiveTab("sites");
        };
        reader.readAsText(file);
    };

    const handleGenerateBOM = () => {
        const pkg = packages.find(p => p.id === selectedPackageId);
        if (!pkg) return;

        const engine = new BOMEngine(SEED_BOM_RULES, SEED_EQUIPMENT);
        const bom = engine.generateBOM("demo-project", parsedSites, pkg, services, ALL_SITE_TYPES);

        setGeneratedBOM(bom);
        setActiveTab("bom");
    };

    const downloadCSV = () => {
        if (!generatedBOM) return;

        const headers = ["Site", "Service", "Item", "Type", "Quantity", "Reasoning"];
        const rows = generatedBOM.items.map(item => [
            item.siteName,
            item.serviceName,
            item.itemName,
            item.itemType,
            item.quantity,
            item.reasoning
        ].map(v => `"${v}"`).join(","));

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bom-${selectedPackageId}-${new Date().toISOString()}.csv`;
        a.click();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-slate-800">BOM Builder Prototype</h1>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("upload")}
                    className={`pb-2 px-4 ${activeTab === "upload" ? "border-b-2 border-blue-600 font-medium text-blue-600" : "text-slate-500"}`}
                >
                    1. Upload & Config
                </button>
                <button
                    onClick={() => setActiveTab("sites")}
                    disabled={parsedSites.length === 0}
                    className={`pb-2 px-4 ${activeTab === "sites" ? "border-b-2 border-blue-600 font-medium text-blue-600" : "text-slate-500 disabled:opacity-50"}`}
                >
                    2. Reviewed Sites ({parsedSites.length})
                </button>
                <button
                    onClick={() => setActiveTab("bom")}
                    disabled={!generatedBOM}
                    className={`pb-2 px-4 ${activeTab === "bom" ? "border-b-2 border-blue-600 font-medium text-blue-600" : "text-slate-500 disabled:opacity-50"}`}
                >
                    3. Generated BOM
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "upload" && (
                <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Package Strategy</label>
                        <select
                            value={selectedPackageId}
                            onChange={(e) => setSelectedPackageId(e.target.value)}
                            className="block w-full max-w-xs rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            {packages.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <p className="text-sm text-slate-500 mt-1">Controls which logic rules are applied (e.g. Cost Centric uses Meraki MX).</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Upload Site List CSV</label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-slate-400 mt-2">Expected format: Site Name, Bandwidth Down (Mbps), etc. (See Sampledocs)</p>
                    </div>
                </div>
            )}

            {activeTab === "sites" && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Parsed Sites</h2>
                        <button
                            onClick={handleGenerateBOM}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Generate BOM &rarr;
                        </button>
                    </div>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200 bg-white">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Site Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bandwidth (D/U)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Users</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">LAN Ports</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Indoor APs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {parsedSites.map((site, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{site.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{site.bandwidthDownMbps} / {site.bandwidthUpMbps} Mbps</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{site.userCount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{site.lanPorts}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{site.indoorAPs}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "bom" && generatedBOM && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Generated Bill of Materials</h2>
                        <div className="flex space-x-2">
                            <button
                                onClick={downloadCSV}
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                            >
                                Export CSV
                            </button>
                            <button
                                onClick={() => setActiveTab("sites")}
                                className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-md"
                            >
                                Back
                            </button>
                        </div>
                    </div>

                    <div className="overflow-hidden border rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Site</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Service</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reasoning</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {generatedBOM.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.siteName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.serviceName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.itemName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 uppercase text-xs">{item.itemType}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.quantity}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate" title={item.reasoning}>{item.reasoning}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
