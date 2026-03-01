"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProjectService } from "@/src/lib/firebase";
import { exportBomToCsv } from "@/src/lib/bom-utils";
import { useBOMBuilder } from "./useBOMBuilder";
import { SiteSidebar } from "./SiteSidebar";
import { SpecsModal } from "./SpecsModal";
import { WANTab } from "./WANTab";
import { LANTab } from "./LANTab";
import { WLANTab } from "./WLANTab";
import { PricingTab } from "./PricingTab";
import { ProjectSummaryDashboard } from "./ProjectSummaryDashboard";
import { Tooltip } from "@/src/components/common/Tooltip";
import { GlobalPricingView } from "./GlobalPricingView";
import { TriageDashboard } from "@/src/components/sa/TriageDashboard";

// ─────────────────────────────────────────────
// Main content (needs useSearchParams → Suspense wrapper below)
// ─────────────────────────────────────────────
function BOMBuilderContent({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingWIP, setIsSavingWIP] = useState(false);

    const state = useBOMBuilder(projectId);
    const {
        project, pkg, allPackages, siteTypes, catalog,
        sites, setSites, selectedSiteIndex, setSelectedSiteIndex, selectedSite,
        activeTab, setActiveTab, availableTabs,
        bom,
        manualSelections, setManualSelections,
        selectedSpecsItem, setSelectedSpecsItem,
        utilization, totalLoad,
        currentSDWANEquipment, currentSDWANItem,
        handleFileUpload, loadSampleData, getVendorForService,
        handlePackageChange, handleSiteTypeChange,
        siteFilter, setSiteFilter,
        handleFinalize,
        pendingTriageSites, handleBulkAcknowledge
    } = state;

    const isLoading = !project || siteTypes.length === 0;

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

    const handleSaveWIP = async () => {
        if (!project || isSavingWIP) return;
        setIsSavingWIP(true);
        try {
            await ProjectService.saveSites(projectId, sites);
            await ProjectService.updateProject(projectId, {
                bomState: {
                    manualSelections,
                    globalDiscount: state.globalDiscount,
                    acquisitionModel: state.acquisitionModel,
                    projectManagementLevel: state.projectManagementLevel,
                }
            });
            alert("Work in Progress saved successfully!");
        } catch (error) {
            console.error("Failed to save BOM WIP state:", error);
            alert("Failed to save work in progress. Please try again.");
        } finally {
            setIsSavingWIP(false);
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
                onViewPricing={() => setActiveTab("Pricing")}
            />

            <div className="flex-1 flex flex-col overflow-y-auto">
                {selectedSite ? (
                    <>
                        {/* Header */}
                        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedSite.name}</h1>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center flex-wrap gap-x-4 gap-y-1 mt-1">
                                        <span>{selectedSite.address || "TBD"}</span>
                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                        <span>{selectedSite.userCount} Users</span>
                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                        <span>{selectedSite.bandwidthDownMbps}/{selectedSite.bandwidthUpMbps} Mbps</span>
                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                        <Tooltip content="Primary + Secondary Circuits">
                                            <span>{selectedSite.primaryCircuit}{selectedSite.secondaryCircuit ? ` + ${selectedSite.secondaryCircuit}` : ''}</span>
                                        </Tooltip>
                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                        <Tooltip content="Total LAN Ports / PoE Required">
                                            <span>{selectedSite.lanPorts} LAN / {selectedSite.poePorts} PoE</span>
                                        </Tooltip>
                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                        <Tooltip content="Indoor / Outdoor Access Points">
                                            <span>{selectedSite.indoorAPs} Indoor / {selectedSite.outdoorAPs} Outdoor APs</span>
                                        </Tooltip>
                                    </div>
                                    {selectedSite.notes && (
                                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic flex items-center gap-1">
                                            <span>📝</span>
                                            <span className="truncate max-w-2xl">{selectedSite.notes}</span>
                                        </div>
                                    )}
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
                                    {project.status === "completed" ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm animate-in fade-in zoom-in">
                                            <span className="mr-1.5">🔒</span> Locked Snapshot
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Online
                                        </span>
                                    )}
                                    <div className="flex gap-4 items-center">
                                        <button
                                            onClick={() => exportBomToCsv(bom?.items || [], project.name)}
                                            className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                        >
                                            Download BOM (.csv)
                                        </button>
                                        {project.status !== "completed" && (
                                            <button
                                                onClick={handleSaveWIP}
                                                disabled={isSavingWIP}
                                                className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isSavingWIP ? "Saving..." : "Save WIP"}
                                            </button>
                                        )}
                                        {project.status !== "completed" ? (
                                            <button
                                                onClick={handleNext}
                                                disabled={isSaving}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isSaving ? "Saving..." : "Next: HLD \u2192"}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => router.push(`/sa/project/${projectId}/hld`)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                            >
                                                View HLD \u2192
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
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
                                    handleSiteUpdate={state.handleSiteUpdate}
                                />
                            )}

                            {activeTab === "LAN" && (
                                <LANTab
                                    selectedSite={selectedSite}
                                    lanItems={state.siteBOMItems.filter(i => i.serviceId === "managed_lan" && i.itemType === "equipment")}
                                    manualSelections={manualSelections}
                                    setManualSelections={setManualSelections}
                                    catalog={catalog}
                                    setSelectedSpecsItem={setSelectedSpecsItem}
                                    resolvedVendor={getVendorForService("managed_lan")}
                                    handleSiteUpdate={state.handleSiteUpdate}
                                />
                            )}

                            {activeTab === "WLAN" && (
                                <WLANTab
                                    selectedSite={selectedSite}
                                    wlanItems={state.siteBOMItems.filter(i => i.serviceId === "managed_wifi" && i.itemType === "equipment")}
                                    manualSelections={manualSelections}
                                    setManualSelections={setManualSelections}
                                    catalog={catalog}
                                    setSelectedSpecsItem={setSelectedSpecsItem}
                                    resolvedVendor={getVendorForService("managed_wifi")}
                                    handleSiteUpdate={state.handleSiteUpdate}
                                />
                            )}

                            {activeTab === "Pricing" && (
                                <PricingTab state={state} selectedSite={selectedSite} />
                            )}
                        </div>
                    </>
                ) : activeTab === "Pricing" ? (
                    <>
                        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Project Pricing Analysis</h1>
                                    <p className="text-sm text-slate-500 mt-1">Aggregate discounts, hardware simulators, and integrations for all {sites.length} sites.</p>
                                </div>
                                <div className="flex gap-3">
                                    {project.status !== "completed" && (
                                        <button
                                            onClick={handleSaveWIP}
                                            disabled={isSavingWIP}
                                            className="bg-white text-slate-700 px-6 py-2 rounded-xl font-bold text-sm shadow-md border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            💾 {isSavingWIP ? "Saving..." : "Save WIP"}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setActiveTab("WAN"); setSelectedSiteIndex(0); }}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all"
                                    >
                                        Review Site Configurations
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <GlobalPricingView state={state} />
                        </div>
                    </>
                ) : pendingTriageSites.length > 0 ? (
                    <TriageDashboard
                        pendingTriageSites={pendingTriageSites}
                        handleBulkAcknowledge={handleBulkAcknowledge}
                    />
                ) : (
                    <div className="flex-1 flex flex-col relative">
                        <ProjectSummaryDashboard
                            sites={sites}
                            setSiteFilter={setSiteFilter}
                            onFinalize={handleFinalize}
                            isCompleted={project.status === "completed"}
                        />
                        <div className="absolute top-8 right-8 flex gap-3">
                            <button
                                onClick={() => exportBomToCsv(bom?.items || [], project.name)}
                                className="bg-white text-slate-700 px-6 py-2 rounded-full font-bold shadow-md border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                📥 Download Detailed BOM (.csv)
                            </button>
                            {project.status !== "completed" && (
                                <button
                                    onClick={handleSaveWIP}
                                    disabled={isSavingWIP}
                                    className="bg-white text-slate-700 px-6 py-2 rounded-full font-bold shadow-md border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    💾 {isSavingWIP ? "Saving..." : "Save WIP"}
                                </button>
                            )}
                            {project.status === "completed" ? (
                                <button
                                    onClick={() => router.push(`/sa/project/${projectId}/hld`)}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                                >
                                    🔍 View HLD \u2192
                                </button>
                            ) : (
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
                            )}
                        </div>
                    </div>
                )}

                {/* ── Modals ── */}
                {selectedSpecsItem && (
                    <SpecsModal item={selectedSpecsItem} onClose={() => setSelectedSpecsItem(null)} />
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
