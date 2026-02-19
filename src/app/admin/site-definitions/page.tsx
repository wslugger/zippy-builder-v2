"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SiteDefinitionService } from "@/src/lib/firebase";
import { useSiteDefinitions } from "@/src/hooks/useSiteDefinitions";

export default function SiteDefinitionsListPage() {
    const { siteDefinitions, loading, refreshSiteDefinitions: loadDefinitions } = useSiteDefinitions();
    const [seeding, setSeeding] = useState(false);

    // Sort by category then name
    const siteDefs = useMemo(() =>
        [...siteDefinitions].sort((a, b) => {
            if (a.category !== b.category) return a.category.localeCompare(b.category);
            return a.name.localeCompare(b.name);
        }),
        [siteDefinitions]);

    async function handleSeed() {
        if (!confirm("This will overwrite existing definitions with defaults from code. Are you sure?")) return;
        setSeeding(true);
        try {
            const res = await fetch("/api/admin/seed");
            const json = await res.json();
            if (json.success) {
                alert("Seeding complete!");
                loadDefinitions();
            } else {
                alert("Error seeding: " + json.error);
            }
        } catch {
            alert("Error seeding database.");
        }
        setSeeding(false);
    }

    const deleteSiteDef = async (id: string) => {
        if (!confirm("Are you sure you want to delete this site type? This action cannot be undone.")) return;
        try {
            await SiteDefinitionService.deleteSiteDefinition(id);
            loadDefinitions();
        } catch (e) {
            console.error(e);
            alert("Failed to delete site definition.");
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Site Definitions</h1>
                    <p className="text-slate-500">Manage site types and technical constraints.</p>
                </div>
                <div className="space-x-4">
                    <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
                    >
                        {seeding ? "Seeding..." : "Reset Verified Defaults"}
                    </button>
                    <Link
                        href="/admin/site-definitions/new"
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                        + Create New
                    </Link>
                </div>
            </div>

            <div className="bg-white border rounded shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {siteDefs.map((def) => (
                            <tr key={def.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-slate-900">{def.name}</div>
                                    <div className="text-xs text-slate-500 truncate max-w-xs">{def.description}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${def.category === 'SD-WAN' ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'}`}>
                                        {def.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link href={`/admin/site-definitions/${def.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => deleteSiteDef(def.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
