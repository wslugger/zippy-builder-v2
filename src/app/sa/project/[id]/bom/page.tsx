"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProjectService } from "@/src/lib/firebase";
import { SiteImportReviewModal } from "@/src/components/sa/SiteImportReviewModal";
import { exportBomToCsv } from "@/src/lib/bom-utils";
import { useBOMBuilder } from "./useBOMBuilder";
import { SiteSidebar } from "./SiteSidebar";
import { SpecsModal } from "./SpecsModal";
import { WANTab } from "./WANTab";
import { LANTab } from "./LANTab";
import { WLANTab } from "./WLANTab";
import { PricingTab } from "./PricingTab";
import { ProjectSummaryDashboard } from "./ProjectSummaryDashboard";

// ─────────────────────────────────────────────
// Small local icons (trivial, kept in page file)
// ─────────────────────────────────────────────
const AlertIcon = () => (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

// ─────────────────────────────────────────────
// Main content (needs useSearchParams → Suspense wrapper below)
// ─────────────────────────────────────────────
function BOMBuilderContent({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    const state = useBOMBuilder(projectId);
    const {
        project, pkg, allPackages, siteTypes, catalog,
        sites, setSites, selectedSiteIndex, setSelectedSiteIndex, selectedSite,
        activeTab, setActiveTab, availableTabs,
        bom,
        manualSelections, setManualSelections,
        selectedSpecsItem, setSelectedSpecsItem,
        isClassifying, previewSites, setPreviewSites,
        utilization, totalLoad, poeWarnings,
        currentSDWANEquipment, currentSDWANItem,
        handleFileUpload, loadSampleData, getVendorForService,
        handlePackageChange, handleSiteTypeChange,
        siteFilter, setSiteFilter,
    } = state;

    const isLoading = !project || siteTypes.length === 0;

    console.log("BOMBuilderContent Render:", {
        isLoading,
        projectId,
        hasProject: !!project,
        siteTypesCount: siteTypes.length
    });

    if (isLoading) {
        return (
            <div className="p-8" data-testid="loading-project">
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Loading Project...
                </p>
            </div>
        );
    }

    const handleNext = async () => {
        if (!project || isSaving) return;
        setIsSaving(true);
        try {
            await ProjectService.saveSites(projectId, sites);
            router.push(`/sa/project/${projectId}/hld`);
        } catch (error) {
            console.error("Failed to save sites:", error);
            alert("Failed to save sites. Please try again.");
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* ── Sidebar ── */}
            <SiteSidebar
                sites={sites}
                siteTypes={siteTypes}
                selectedSiteIndex={selectedSiteIndex}
                onSelectSite={setSelectedSiteIndex}
                onClearSites={() => { setSites([]); setSelectedSiteIndex(0); }}
                onFileUpload={handleFileUpload}
                onLoadSample={loadSampleData}
                bom={bom}
                projectId={projectId}
                pkg={pkg}
                allPackages={allPackages}
                onPackageChange={handlePackageChange}
                siteFilter={siteFilter}
                setSiteFilter={setSiteFilter}
            />

            {/* ── Main Content ── */}
            <div className="flex-1 flex flex-col overflow-y-auto">
                {selectedSite ? (
                    <>
                        {/* Header */}
                        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedSite.name}</h1>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center space-x-4 mt-1">
                                        <span>{selectedSite.address}</span>
                                        <span>•</span>
                                        <span>{selectedSite.userCount} Users</span>
                                        <span>•</span>
                                        <select
                                            className="text-xs border-none bg-transparent text-blue-600 font-medium cursor-pointer focus:ring-0"
                                            value={selectedSite.siteTypeId || ""}
                                            onChange={(e) => handleSiteTypeChange(e.target.value)}
                                        >
                                            <option value="">Select Profile...</option>
                                            {siteTypes.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    {activeTab === "Pricing" && (
                                        <button
                                            onClick={() => setSelectedSiteIndex(null)}
                                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-1"
                                        >
                                            ← Back to Dashboard
                                        </button>
                                    )}
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Online
                                    </span>
                                    <div className="flex gap-4 items-center">
                                        <button
                                            onClick={() => exportBomToCsv(bom?.items || [], project.name)}
                                            className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                        >
                                            Download BOM (.csv)
                                        </button>
                                        <button
                                            onClick={handleNext}
                                            disabled={isSaving}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {isSaving ? "Saving..." : "Next: HLD \u2192"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {poeWarnings.length > 0 && (
                                <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-start space-x-3">
                                    <AlertIcon />
                                    <div className="text-sm text-red-700">
                                        {poeWarnings.map((w, i) => <div key={i}>{w}</div>)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6">
                            <nav className="-mb-px flex space-x-8">
                                {availableTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                            ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                            : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"}`}
                                    >
                                        <span className="mr-2">{tab.icon}</span>{tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {/* ── WAN Tab ── */}
                            {activeTab === "WAN" && (
                                <WANTab
                                    selectedSite={selectedSite}
                                    siteTypes={siteTypes}
                                    handleSiteTypeChange={handleSiteTypeChange}
                                    manualSelections={manualSelections}
                                    setManualSelections={setManualSelections}
                                    catalog={catalog}
                                    getVendorForService={getVendorForService}
                                    currentSDWANEquipment={currentSDWANEquipment}
                                    currentSDWANItem={currentSDWANItem}
                                    setSelectedSpecsItem={setSelectedSpecsItem}
                                    utilization={utilization}
                                    totalLoad={totalLoad}
                                    pkg={pkg}
                                />
                            )}

                            {/* ── LAN Tab ── */}
                            {activeTab === "LAN" && (
                                <LANTab
                                    selectedSite={selectedSite}
                                    siteTypes={siteTypes}
                                    handleSiteUpdate={state.handleSiteUpdate}
                                    lanItem={state.siteBOMItems.find(i => i.serviceId === "managed_lan" && i.itemType === "equipment")}
                                    manualSelections={manualSelections}
                                    setManualSelections={setManualSelections}
                                    catalog={catalog}
                                    setSelectedSpecsItem={setSelectedSpecsItem}
                                />
                            )}

                            {/* ── WLAN Tab ── */}
                            {activeTab === "WLAN" && (
                                <WLANTab
                                    selectedSite={selectedSite}
                                />
                            )}

                            {/* ── Pricing Tab ── */}
                            {activeTab === "Pricing" && (
                                <PricingTab state={state} />
                            )}
                        </div>
                    </>
                ) : activeTab === "Pricing" ? (
                    <>
                        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Project Pricing Analysis</h1>
                                    <p className="text-sm text-slate-500 mt-1">Simulate discounts and hardware swaps across all {sites.length} sites.</p>
                                </div>
                                <button
                                    onClick={() => { setActiveTab("WAN"); setSelectedSiteIndex(0); }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all"
                                >
                                    Review Site Configurations
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <PricingTab state={state} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col relative">
                        <ProjectSummaryDashboard
                            sites={sites}
                            setSiteFilter={setSiteFilter}
                            onViewPricing={() => setActiveTab("Pricing")}
                        />
                        <div className="absolute top-8 right-8 flex gap-3">
                            <button
                                onClick={() => exportBomToCsv(bom?.items || [], project.name)}
                                className="bg-white text-slate-700 px-6 py-2 rounded-full font-bold shadow-md border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                📥 Download Detailed BOM (.csv)
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={isSaving}
                                className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-blue-400 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Continue to HLD \u2192"
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Modals ── */}
                {selectedSpecsItem && (
                    <SpecsModal item={selectedSpecsItem} onClose={() => setSelectedSpecsItem(null)} />
                )}

                {isClassifying && (
                    <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 max-w-xs text-center border border-slate-100">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl">🤖</span>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-lg">Classifying Sites...</h4>
                                <p className="text-xs text-slate-500 mt-1">Gemini AI is analyzing your data to match the best deployment profiles.</p>
                            </div>
                        </div>
                    </div>
                )}

                {previewSites && (
                    <SiteImportReviewModal
                        sites={previewSites}
                        siteTypes={siteTypes}
                        onCancel={() => setPreviewSites(null)}
                        onConfirm={(finalSites) => { setSites(finalSites); setPreviewSites(null); }}
                    />
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------
// Page export with Suspense boundary
// ---------------------------------------------
export default function BOMBuilderPage() {
    const params = useParams();
    const projectId = params.id as string;

    if (!projectId) {
        return (
            <div className="p-8" data-testid="loading-project-params">
                Loading Project (params)...
            </div>
        );
    }

    return <BOMBuilderContent projectId={projectId} />;
}
