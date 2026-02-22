"use client";

import { useState } from "react";
import { useBOMRules } from "@/src/hooks/useBOMRules";
import RuleList from "@/src/components/admin/bom-logic/RuleList";
import RuleEditorModal from "@/src/components/admin/bom-logic/RuleEditorModal";
import { BOMLogicRule } from "@/src/lib/types";
import { BOMService } from "@/src/lib/firebase/bom-service";

export default function BOMRulesListPage() {
    const { rules, loading, refreshRules: loadRules } = useBOMRules();
    const [seeding, setSeeding] = useState(false);

    const [activeTab, setActiveTab] = useState<"managed_sdwan" | "managed_lan" | "managed_wifi">("managed_sdwan");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [ruleToEdit, setRuleToEdit] = useState<BOMLogicRule | null>(null);

    // Filter rules based on active tab. Assuming rule condition has serviceId matching the tab.
    const filteredRules = rules.filter(r =>
        JSON.stringify(r.condition || {}).includes(activeTab)
    );

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
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">BOM Logic Settings</h1>
                    <p className="text-slate-500">Manage logic properties and equipment selections using Rules.</p>
                </div>
                <div className="space-x-4">
                    <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
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
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b">
                {[
                    { id: "managed_sdwan", label: "SD-WAN Rules" },
                    { id: "managed_lan", label: "LAN Rules" },
                    { id: "managed_wifi", label: "WLAN Rules" }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as "managed_sdwan" | "managed_lan" | "managed_wifi")}
                        className={`px-4 py-2 font-medium text-sm transition-colors rounded-t-lg
                            ${activeTab === tab.id
                                ? "bg-white border-t border-l border-r text-blue-600 mb-[-1px]"
                                : "text-slate-500 hover:text-slate-700 bg-slate-50 border-t border-l border-r border-transparent hover:border-slate-200 mb-[-1px]"}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Rule List */}
            <RuleList rules={filteredRules} onEdit={openEditModal} onDelete={handleDeleteRule} />

            {/* Modal */}
            <RuleEditorModal
                isOpen={isModalOpen}
                ruleToEdit={ruleToEdit}
                serviceCategory={activeTab}
                onClose={closeAndRefresh}
                onSave={handleSaveRule}
            />
        </div>
    );
}
