'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Package, Service } from '@/src/lib/types';
import { ProjectService, PackageService, ServiceService } from '@/src/lib/firebase';

export default function PackageSummaryPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;
    const [project, setProject] = useState<Project | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        try {
            const proj = await ProjectService.getProject(projectId);
            setProject(proj);

            if (proj?.selectedPackageId) {
                const [pkg, servicesData] = await Promise.all([
                    PackageService.getPackageById(proj.selectedPackageId),
                    ServiceService.getAllServices()
                ]);
                setSelectedPackage(pkg);
                setServices(servicesData);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = async () => {
        if (!project) return;
        try {
            // Update step
            await ProjectService.updateProject(projectId, {
                currentStep: 4, // Next: Customize
                status: 'customizing'
            });
            router.push(`/sa/project/${projectId}/customize`);
        } catch (error) {
            console.error("Failed to update project:", error);
        }
    };

    if (loading) return <div className="p-8 text-center text-neutral-500">Loading summary...</div>;
    if (!project || !selectedPackage) return (
        <div className="p-8 text-center">
            <p className="text-red-500 mb-4">Project or Package not found.</p>
            <button
                onClick={() => router.push(`/sa/project/${projectId}/package-selection`)}
                className="text-blue-600 hover:underline"
            >
                &larr; Go back to selection
            </button>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto p-8">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                {/* Header */}
                <div className="bg-neutral-900 text-white p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            <span className="bg-blue-900/50 px-2 py-1 rounded">Selected Package</span>
                            {project.packageConfidenceScore && project.packageConfidenceScore > 0 && (
                                <span className="text-green-400">
                                    {project.packageConfidenceScore}% AI Match
                                </span>
                            )}
                        </div>
                        <h1 className="text-4xl font-bold mb-4">{selectedPackage.name}</h1>
                        <p className="text-neutral-300 text-lg max-w-2xl leading-relaxed">
                            {selectedPackage.detailed_description || selectedPackage.short_description}
                        </p>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">1</span>
                                Included Services
                            </h2>
                            <div className="bg-neutral-50 dark:bg-neutral-950 rounded-xl p-6 border border-neutral-100 dark:border-neutral-800">
                                <ul className="space-y-3">
                                    {/* Group and display services uniquely by ID for higher level summary */}
                                    {Array.from(new Set(selectedPackage.items.map(i => i.service_id))).map((serviceId) => {
                                        const serviceDoc = services.find(s => s.id === serviceId);
                                        const serviceName = serviceDoc?.name || serviceId;
                                        const items = selectedPackage.items.filter(i => i.service_id === serviceId);
                                        const mainInclusion = items.find(i => i.inclusion_type === 'required') ? 'required' : items[0].inclusion_type;

                                        return (
                                            <li key={serviceId} className="flex items-start gap-4 p-3 hover:bg-white dark:hover:bg-neutral-900 rounded-lg transition-colors border border-transparent hover:border-neutral-100">
                                                <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${mainInclusion === 'required' ? 'bg-blue-600' : 'bg-green-500'}`} />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-neutral-900 dark:text-neutral-100">{serviceName}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter ${mainInclusion === 'required' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                            {mainInclusion}
                                                        </span>
                                                    </div>
                                                    {serviceDoc?.short_description && (
                                                        <p className="text-sm text-neutral-500 mt-0.5">{serviceDoc.short_description}</p>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm">2</span>
                                AI Reasoning
                            </h2>
                            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-6 border border-purple-100 dark:border-purple-800/30">
                                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                                    &quot;{project.packageReasoning || "Manual selection based on user preference."}&quot;
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Actions */}
                    <div className="space-y-6">
                        <div className="bg-neutral-50 dark:bg-neutral-950 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800">
                            <h3 className="font-bold mb-4 text-sm uppercase tracking-wide text-neutral-500">
                                Package Collateral
                            </h3>
                            {selectedPackage.collateral && selectedPackage.collateral.length > 0 ? (
                                <ul className="space-y-3">
                                    {selectedPackage.collateral.map(file => (
                                        <li key={file.id}>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-3 group p-2 hover:bg-white dark:hover:bg-neutral-900 rounded-lg transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800"
                                            >
                                                <div className="text-2xl text-red-500 group-hover:scale-110 transition-transform">
                                                    📄
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate group-hover:text-blue-600 transition-colors">
                                                        {file.name}
                                                    </p>
                                                    <div className="text-xs text-neutral-400 uppercase">
                                                        {file.type.replace('_', ' ')}
                                                    </div>
                                                </div>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-neutral-400 italic">No collateral documents available.</p>
                            )}
                        </div>

                        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                            <button
                                onClick={handleContinue}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-1"
                            >
                                Customize Design &rarr;
                            </button>
                            <button
                                onClick={() => router.push(`/sa/project/${projectId}/package-selection`)}
                                className="w-full mt-3 py-3 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium text-sm transition-colors"
                            >
                                Change Package
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
