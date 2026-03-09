"use client";

import { useState } from "react";
import { useBOMRules } from "@/src/hooks/useBOMRules";
import RuleList from "@/src/components/admin/bom-logic/RuleList";
import RuleEditorModal from "@/src/components/admin/bom-logic/RuleEditorModal";
import { AITriageRuleEditor } from "@/src/components/admin/bom-logic/AITriageRuleEditor";
import { GlobalTriageParameters } from "@/src/components/admin/bom-logic/GlobalTriageParameters";
import { BOMLogicRule } from "@/src/lib/types";
import { BOMService } from "@/src/lib/firebase/bom-service";

type TabValues = "sdwan" | "lan" | "wlan" | "ai_triage";

export default function BOMRulesListPage() {
    const { rules, loading, refreshRules: loadRules } = useBOMRules();
    const [seeding, setSeeding] = useState(false);

    const [activeTab, setActiveTab] = useState<TabValues>("sdwan");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [ruleToEdit, setRuleToEdit] = useState<BOMLogicRule | null>(null);

    // Filter rules based on active tab. Use normalization mapping to ensure legacy IDs show in the correct tab.
    const filteredRules = rules.filter(r => {
        const conditionStr = JSON.stringify(r.condition || {}).toLowerCase();
        
        // Define which service IDs belong to which tab category
        const CATEGORY_MAP: Record<TabValues, string[]> = {
            sdwan: ["sdwan", "managed_sdwan", "sd_wan_service", "sdwan_service", "managed_circuit", "broadband"],
            lan: ["lan", "managed_lan"],
            wlan: ["wlan", "managed_wifi", "managed_wlan", "wifi"],
            ai_triage: []
        };

        const targetIds = CATEGORY_MAP[activeTab] || [];
        return targetIds.some(id => conditionStr.includes(`"${id}"`));
    });

    async function handleSeed() {
        if (!confirm("This will overwrite existing rules with defaults from code. Are you sure?")) return;
        setSeeding(true);
        try {
            const res = await fetch("/api/admin/seed");
            const json = await res.json();
            if (json.success) {
                alert("Seeding complete!");
                loadRules();
            } else {
                alert("Error seeding: " + json.error);
            }
        } catch {
            alert("Error seeding database.");
        }
        setSeeding(false);
    }

    const openCreateModal = () => {
        setRuleToEdit(null);
        setIsModalOpen(true);
    };

    const openEditModal = (rule: BOMLogicRule) => {
        setRuleToEdit(rule);
        setIsModalOpen(true);
    };

    const closeAndRefresh = () => {
        setIsModalOpen(false);
        setRuleToEdit(null);
        loadRules();
    };

    const handleSaveRule = async (rule: BOMLogicRule) => {
        await BOMService.saveRule(rule);
        loadRules();
    };

    const handleDeleteRule = async (id: string) => {
        await BOMService.deleteRule(id);
        loadRules();
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">BOM Logic Settings</h1>
                    <p className="text-slate-500">Manage logic properties and equipment selections using Rules.</p>
                </div>
                {activeTab !== "ai_triage" && (
                    <div className="space-x-4">
                        <button
                            onClick={handleSeed}
                            disabled={seeding}
                            className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 shadow-sm"
                        >
                            {seeding ? "Seeding..." : "Reset Verified Defaults"}
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 font-medium shadow-sm transition-colors"
                        >
                            + Create New Rule
                        </button>
                    </div>
                )}
            </div>

            {/* Global Engine Parameters section rendered at the top */}
            <GlobalTriageParameters />

            {/* Tabs Section */}
            <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-end">
                    <h2 className="text-xl font-bold text-slate-900">Logic & AI Rules</h2>
                </div>

                <div className="flex space-x-1 border-b">
                    {[
                        { id: "sdwan", label: "SD-WAN Rules" },
                        { id: "lan", label: "LAN Rules" },
                        { id: "wlan", label: "WLAN Rules" },
                        { id: "ai_triage", label: "AI Extraction Rules" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabValues)}
                            className={`px-4 py-2 font-medium text-sm transition-colors rounded-t-lg
                                ${activeTab === tab.id
                                    ? "bg-white border-t border-l border-r text-blue-600 mb-[-1px] shadow-[0_-2px_4px_rgba(0,0,0,0.02)]"
                                    : "text-slate-500 hover:text-slate-700 bg-slate-50 border-t border-l border-r border-transparent hover:border-slate-200 mb-[-1px]"}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                {activeTab === "ai_triage" ? (
                    <AITriageRuleEditor />
                ) : (
                    <>
                        <RuleList rules={filteredRules} onEdit={openEditModal} onDelete={handleDeleteRule} />
                        <RuleEditorModal
                            isOpen={isModalOpen}
                            ruleToEdit={ruleToEdit}
                            serviceCategory={activeTab}
                            onClose={closeAndRefresh}
                            onSave={handleSaveRule}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
