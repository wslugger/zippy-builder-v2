import EquipmentIngestion from "@/src/components/admin/EquipmentIngestion";

export default function AdminIngestionPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Ingestion Engine
                    </h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                        Upload datasheets to automatically populate the Equipment Catalog using Gemini AI.
                    </p>
                </div>
                <EquipmentIngestion />
            </div>
        </div>
    );
}
