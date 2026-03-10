'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/src/lib/types';
import { ProjectService } from '@/src/lib/firebase';
import ExpressConnectAccordion from '@/src/components/sa/express-connect/ExpressConnectAccordion';

export default function ExpressConnectPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const proj = await ProjectService.getProject(projectId);
            setProject(proj);
        } catch (error) {
            console.error("Failed to load project:", error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [projectId, loadData]);

    if (loading) return <div className="p-8 text-center animate-pulse py-20 font-medium text-neutral-400">Loading design workspace...</div>;
    if (!project) return <div className="p-8 text-center text-red-500 py-20">Project not found</div>;

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 pb-32">
            <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                <nav className="flex mb-6 text-sm text-neutral-500">
                    <button 
                        onClick={() => router.push(`/sa/project/${projectId}/scope`)} 
                        className="hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors flex items-center group"
                    >
                        <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Project Scope
                    </button>
                    <span className="mx-3 opacity-30">/</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold tracking-wide uppercase text-[11px] self-center">Express Connect</span>
                </nav>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Express Network Builder</h1>
                </div>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
                    Guided intent-based design for rapid branch deployment. Perfect for simplified SD-WAN, 5G connectivity, and standardized security.
                </p>
            </div>

            <ExpressConnectAccordion 
                projectId={projectId} 
                initialRequirements={project.expressConnectRequirements} 
                onComplete={() => router.push(`/sa/project/${projectId}/summary`)}
            />
        </div>
    );
}
