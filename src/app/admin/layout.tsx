import Link from "next/link";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-100">
            <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center font-bold text-xl tracking-tight mr-10">
                                Zippy<span className="text-blue-600">Builder</span>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    href="/admin/catalog"
                                    className="border-transparent hover:border-blue-500 text-zinc-900 dark:text-zinc-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                                >
                                    Equipment
                                </Link>
                                <Link
                                    href="/admin/services"
                                    className="border-transparent hover:border-blue-500 text-zinc-900 dark:text-zinc-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                                >
                                    Services
                                </Link>
                                <Link
                                    href="/admin/packages"
                                    className="border-transparent hover:border-blue-500 text-zinc-900 dark:text-zinc-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                                >
                                    Packages
                                </Link>
                                <Link
                                    href="/admin/ingest"
                                    className="border-transparent hover:border-blue-500 text-zinc-900 dark:text-zinc-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                                >
                                    Ingestion
                                </Link>
                                <Link
                                    href="/admin/metadata"
                                    className="border-transparent hover:border-blue-500 text-zinc-900 dark:text-zinc-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                                >
                                    Metadata
                                </Link>
                                <Link
                                    href="/admin/features"
                                    className="border-transparent hover:border-blue-500 text-zinc-900 dark:text-zinc-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                                >
                                    Features
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
                                Admin
                            </span>
                        </div>
                    </div>
                </div>
            </nav>
            {children}
        </div>
    );
}
