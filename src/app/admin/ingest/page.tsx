import Link from "next/link";

export default function AdminIngestionPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-12">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Ingestion Engine
                    </h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                        Select a catalog to populate using AI-powered PDF extraction.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Link
                        href="/admin/ingest/equipment"
                        className="group relative bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all"
                    >
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Equipment Ingestion</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Extract technical specs for hardware models from vendor datasheets.</p>
                        <div className="mt-6 flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                            Start Extracting
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Link>

                    <Link
                        href="/admin/ingest/services"
                        className="group relative bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-purple-500/50 transition-all"
                    >
                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Service Ingestion</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Parse service descriptions into structured product options and caveats.</p>
                        <div className="mt-6 flex items-center text-sm font-semibold text-purple-600 dark:text-purple-400">
                            Start Extracting
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
