"use client";

import EquipmentIngestion from "@/src/components/admin/EquipmentIngestion";
import Link from "next/link";

export default function EquipmentIngestPage() {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-2">
                    <Link href="/admin/ingest" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm transition-colors">
                        ← Back to Ingestion Hub
                    </Link>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Equipment Ingestion</h1>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">Convert hardware datasheets into structured catalog equipment.</p>
            </div>

            <EquipmentIngestion />
        </main>
    );
}
