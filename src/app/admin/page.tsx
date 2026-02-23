'use client';

import React from 'react';
import Link from 'next/link';

interface HubCardProps {
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
    color: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'indigo';
}

const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50',
    purple: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50',
    green: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50',
    orange: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50',
    pink: 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800/50',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50',
};

const HubCard = ({ title, description, href, icon, color }: HubCardProps) => (
    <Link
        href={href}
        className="group relative bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 transition-transform group-hover:scale-110 ${colorMap[color]}`}>
            {icon}
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
        <div className="absolute top-4 right-4 text-zinc-200 dark:text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
        </div>
    </Link>
);

export default function AdminHub() {
    return (
        <div className="min-h-[calc(100-4rem)] p-8 max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="mb-12">
                <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight mb-4">
                    Admin <span className="text-blue-600">Control Center</span>
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl text-lg">
                    Manage your equipment catalog, configure business logic, and monitor system performance from a single centralized hub.
                </p>
            </div>

            {/* Sections */}
            <div className="space-y-12">
                {/* Catalog & Configuration */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-4">Catalog & Configuration</h2>
                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <HubCard
                            title="Equipment Catalog"
                            description="Browse and manage the master hardware database, including specs, ports, and power requirements."
                            href="/admin/catalog"
                            color="blue"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                        />
                        <HubCard
                            title="Services"
                            description="Define service tiers, licensing models, and connectivity options for different site types."
                            href="/admin/services"
                            color="purple"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2m-7 14v-5l-2 2m2-2l2 2" /></svg>}
                        />
                        <HubCard
                            title="Packages"
                            description="Construct high-level product packages that bundle services and hardware together."
                            href="/admin/packages"
                            color="green"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                        />
                        <HubCard
                            title="Features"
                            description="Enable or disable experimental features and manage product capability flags."
                            href="/admin/features"
                            color="purple"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                        />
                        <HubCard
                            title="Site Types"
                            description="Define standard site classifications like Small, Medium, Large, and Hub."
                            href="/admin/site-definitions"
                            color="green"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                        />
                        <HubCard
                            title="BOM Logic"
                            description="Configure the dynamic rules that drive equipment selection and sizing based on user needs."
                            href="/admin/bom-logic"
                            color="orange"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                        />
                        <HubCard
                            title="Global Params"
                            description="Global system parameters and default values used across the entire BOM engine."
                            href="/admin/bom-parameters"
                            color="pink"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        />
                    </div>
                </section>

                {/* Data & Ingestion */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-4">Data & Ingestion</h2>
                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <HubCard
                            title="Ingestion"
                            description="Import new hardware data from CSV files and let AI classify port and power specs automatically."
                            href="/admin/ingest"
                            color="indigo"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                        />
                        <HubCard
                            title="Metadata"
                            description="Manage dropdown options, purpose classifications, and other system-wide metadata."
                            href="/admin/metadata"
                            color="blue"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10m-10 5h10" /></svg>}
                        />
                    </div>
                </section>

                {/* System & Analytics */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-4">System & Analytics</h2>
                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <HubCard
                            title="Metrics Dashboard"
                            description="Monitor project activity, conversion rates, and vendor preference trends."
                            href="/admin/dashboard"
                            color="blue"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                        />
                    </div>
                </section>
            </div>

            <footer className="mt-20 py-8 border-t border-zinc-200 dark:border-zinc-800 text-center">
                <p className="text-sm text-zinc-400">
                    &copy; {new Date().getFullYear()} ZippyBuilder Admin System. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
