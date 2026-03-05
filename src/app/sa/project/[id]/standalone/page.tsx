'use client';

import Link from 'next/link';

export default function StandalonePlaceholderPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-8 text-neutral-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">Individual Sites & Additional Services</h1>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-10 leading-relaxed">
                The streamlined flow for adding individual sites, services to existing networks, and standalone connectivity is currently under development.
            </p>
            <Link
                href="/sa/dashboard"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
                Return to Dashboard
            </Link>
        </div>
    );
}
