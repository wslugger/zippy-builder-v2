'use client';

import { useParams, useRouter } from 'next/navigation';
import { ProjectService } from '@/src/lib/firebase';
import { useState } from 'react';

export default function ScopeSelectionPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;
    const [loading, setLoading] = useState<string | null>(null);

    const handleSelectScope = async (scope: 'complete_network' | 'standalone_sites' | 'express_connect') => {
        setLoading(scope);
        try {
            await ProjectService.updateProject(projectId, {
                projectScope: scope,
                currentStep: 2,
                status: scope === 'complete_network' ? 'package_selection' : 
                        scope === 'express_connect' ? 'express_connect_selection' : 'scope_selection'
            });

            if (scope === 'complete_network') {
                router.push(`/sa/project/${projectId}/package-selection`);
            } else if (scope === 'express_connect') {
                router.push(`/sa/project/${projectId}/express-connect`);
            } else {
                router.push(`/sa/project/${projectId}/standalone`);
            }
        } catch (error) {
            console.error("Failed to update project scope:", error);
            alert("Error updating project. Please try again.");
            setLoading(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Define Project Scope
                </h1>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                    To direct your design process appropriately, please specify if you are building an enterprise architecture, a simplified express package, or configuring standalone connectivity.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-stretch">
                {/* Complete Network Option */}
                <button
                    onClick={() => handleSelectScope('complete_network')}
                    disabled={!!loading}
                    className="group relative flex flex-col text-left p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 active:scale-[0.98]"
                >
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-3 group-hover:text-blue-600 transition-colors">Complete Network</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                        Design a comprehensive enterprise environment requiring architectural decisions on topology, security, and integrated services.
                    </p>
                    <ul className="space-y-3 mt-auto">
                        <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-300">
                            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mr-3 text-[10px]">✓</span>
                            Core & Edge Topology
                        </li>
                        <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-300">
                            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mr-3 text-[10px]">✓</span>
                            Centralized Security Policy
                        </li>
                    </ul>
                    {loading === 'complete_network' && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 animate-pulse rounded-full" />
                    )}
                </button>

                {/* Express Connect Package Option */}
                <button
                    onClick={() => handleSelectScope('express_connect')}
                    disabled={!!loading}
                    className="group relative flex flex-col text-left p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-amber-500 dark:hover:border-amber-500 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 active:scale-[0.98]"
                >
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="absolute top-4 right-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Recommended</div>
                    <h2 className="text-2xl font-bold mb-3 group-hover:text-amber-600 transition-colors">Express Connect</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                        Rapidly build a standard branch network through guided intent. Perfect for cellular-first or simple SD-WAN designs.
                    </p>
                    <ul className="space-y-3 mt-auto">
                        <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-300">
                            <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mr-3 text-[10px]">✓</span>
                            Cellular & 5G Optimized
                        </li>
                        <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-300">
                            <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mr-3 text-[10px]">✓</span>
                            Intent-Based Discovery
                        </li>
                    </ul>
                    {loading === 'express_connect' && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500 animate-pulse rounded-full" />
                    )}
                </button>

                {/* Standalone Sites Option */}
                <button
                    onClick={() => handleSelectScope('standalone_sites')}
                    disabled={!!loading}
                    className="group relative flex flex-col text-left p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 active:scale-[0.98]"
                >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <circle cx="12" cy="12" r="3" strokeWidth={2} />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-3 group-hover:text-indigo-600 transition-colors">Individual Sites</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                        Add individual sites or specific services to an existing network without a full redesign.
                    </p>
                    <ul className="space-y-3 mt-auto">
                        <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-300">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mr-3 text-[10px]">✓</span>
                            Expansion & Add-ons
                        </li>
                        <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-300">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mr-3 text-[10px]">✓</span>
                            Site-Specific Configs
                        </li>
                    </ul>
                    {loading === 'standalone_sites' && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500 animate-pulse rounded-full" />
                    )}
                </button>
            </div>
        </div>
    );
}
