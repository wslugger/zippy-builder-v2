export default function SolutionsArchitectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
            <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center px-6">
                <div className="font-semibold text-lg tracking-tight">
                    ZippyBuilder <span className="text-blue-600 dark:text-blue-400 font-light ml-1">Architect</span>
                </div>
            </header>
            <main>
                {children}
            </main>
        </div>
    );
}
