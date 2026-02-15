"use client";

import { usePackages } from "@/src/hooks/usePackages";
import { PackageService } from "@/src/lib/firebase";
import Link from "next/link";

export default function PackagesPage() {
    const { packages, loading, refreshPackages } = usePackages();

    const deletePackage = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this package? This action cannot be undone.")) return;
        try {
            await PackageService.deletePackage(id);
            refreshPackages();
        } catch (e) {
            console.error(e);
            alert("Failed to delete package.");
        }
    };

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Package Catalog</h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">Bundle services and options into standardized solution packages.</p>
                </div>
                <Link
                    href="/admin/packages/new"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                    + New Package
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages.length === 0 ? (
                        <div className="md:col-span-3 py-20 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center">
                            <p className="text-zinc-500 mb-4">No packages found in the catalog.</p>
                            <Link
                                href="/admin/packages/new"
                                className="text-blue-600 font-medium hover:underline"
                            >
                                Create your first package
                            </Link>
                        </div>
                    ) : (
                        packages.map((pkg) => (
                            <div key={pkg.id} className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${pkg.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                        {pkg.active ? 'Active' : 'Draft'}
                                    </div>
                                    <button
                                        onClick={(e) => deletePackage(pkg.id, e)}
                                        className="relative z-10 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">{pkg.name}</h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-6 flex-grow">{pkg.short_description}</p>

                                <div className="flex items-center gap-4 text-xs font-medium text-zinc-400 pt-4 border-t border-zinc-50 dark:border-zinc-800">
                                    <div>{pkg.items?.length || 0} Items</div>
                                    <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
                                    <div>{pkg.collateral?.length || 0} Assets</div>
                                </div>

                                <Link
                                    href={`/admin/packages/${pkg.id}`}
                                    className="absolute inset-0 z-0"
                                    aria-label={`Edit ${pkg.name}`}
                                />
                            </div>
                        ))
                    )}
                </div>
            )}
        </main>
    );
}
