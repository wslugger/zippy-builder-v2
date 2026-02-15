'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Package, AIAnalysisResult } from '@/src/lib/types';
import { ProjectService, PackageService } from '@/src/lib/firebase';
import { AIService } from '@/src/lib/ai-service';

export default function PackageSelectionPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;
    const [project, setProject] = useState<Project | null>(null);
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
    const [selectedTab, setSelectedTab] = useState<'upload' | 'chat' | 'manual'>('upload');
    const [requirementsText, setRequirementsText] = useState(''); // Simple text input for now, could be file upload + OCR

    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        try {
            const [proj, pkgs] = await Promise.all([
                ProjectService.getProject(projectId),
                PackageService.getAllPackages()
            ]);
            setProject(proj);
            setPackages(pkgs);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        setUploading(true);
        setAnalyzing(true);

        try {
            // 1. Upload file to Firebase Storage
            await ProjectService.uploadRequirements(projectId, file);

            // 2. Convert to base64 for immediate AI analysis
            const base64 = await fileToBase64(file);

            // 3. Analyze with AI
            const result = await AIService.analyzeWithFile(base64, file.type, packages);
            setAiResult(result);

            // Optionally set requirementsText to reasoning or a summary
            setRequirementsText(`Analyzed document: ${file.name}\n\nAI Reasoning: ${result.reasoning}`);

        } catch (error) {
            console.error("Upload/Analysis failed:", error);
            alert("Analysis failed. Try pasting text manually if the file format is unsupported.");
        } finally {
            setUploading(false);
            setAnalyzing(false);
        }
    };

    const handleAnalyze = async () => {
        if (!requirementsText) return;
        setAnalyzing(true);
        try {
            const result = await AIService.analyzeRequirements(requirementsText, packages);
            setAiResult(result);

            // Auto-select tab if high confidence?
            if (result.confidence > 80) {
                // Highlight the recommended package
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            alert("Analysis failed. See console.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSelectPackage = async (packageId: string) => {
        if (!project) return;
        try {
            await ProjectService.updateProject(projectId, {
                selectedPackageId: packageId,
                packageConfidenceScore: aiResult?.packageId === packageId ? aiResult.confidence : 0,
                packageReasoning: aiResult?.packageId === packageId ? aiResult.reasoning : "Manual selection",
                status: 'customizing',
                currentStep: 3
            });
            router.push(`/sa/project/${projectId}/summary`);
        } catch (error) {
            console.error("Failed to select package:", error);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!project) return <div className="p-8 text-center text-red-500">Project not found</div>;

    return (
        <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
            {/* Left Panel: Inputs (Upload / Chat) */}
            <div className="lg:col-span-1 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
                <div className="flex border-b border-neutral-200 dark:border-neutral-800">
                    <button
                        onClick={() => setSelectedTab('upload')}
                        className={`flex-1 py-3 text-sm font-medium ${selectedTab === 'upload' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                    >
                        Upload & Analyze
                    </button>
                    <button
                        onClick={() => setSelectedTab('chat')}
                        className={`flex-1 py-3 text-sm font-medium ${selectedTab === 'chat' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                    >
                        Consultant Chat
                    </button>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                    {selectedTab === 'upload' ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">1. Upload Documents</label>
                                <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-6 text-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                    <div className="text-neutral-500">
                                        {uploading ? "Uploading..." : analyzing ? "Analyzing Document..." : "Drop PDF, DOCX, or Slides here"}
                                    </div>
                                    <div className="text-xs text-neutral-400 mt-1">Max 10MB</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">2. Paste Key Requirements</label>
                                <textarea
                                    className="w-full h-40 p-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                    placeholder="e.g. Need high availability with dual WAN, 500 users, strict firewall rules..."
                                    value={requirementsText}
                                    onChange={e => setRequirementsText(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing || !requirementsText}
                                className={`w-full py-3 rounded-lg font-medium text-white transition-all
                                    ${analyzing || !requirementsText
                                        ? 'bg-neutral-300 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30'}
                                `}
                            >
                                {analyzing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Analyzing...
                                    </span>
                                ) : "Analyze Requirements with AI"}
                            </button>

                            {aiResult && (
                                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg animate-in slide-in-from-bottom-2 fade-in duration-300">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">AI Recommendation</span>
                                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">{aiResult.confidence}% Confidence</span>
                                    </div>
                                    <p className="font-medium text-lg mb-1">{packages.find(p => p.id === aiResult.packageId)?.name || aiResult.packageId}</p>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{aiResult.reasoning}</p>
                                    <button
                                        onClick={() => handleSelectPackage(aiResult.packageId)}
                                        className="mt-3 text-sm text-blue-600 hover:underline font-medium"
                                    >
                                        Select Recommended Package &rarr;
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-neutral-500">
                            <p>Chat interface coming soon...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Package Grid (Manual Selection) */}
            <div className="lg:col-span-2 overflow-y-auto pr-2">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    Available Packages
                    <span className="text-sm font-normal text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                        {packages.length}
                    </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                    {packages.map(pkg => {
                        const isRecommended = aiResult?.packageId === pkg.id;
                        return (
                            <div
                                key={pkg.id}
                                className={`
                                    relative bg-white dark:bg-neutral-900 rounded-xl border-2 transition-all duration-300 cursor-pointer group flex flex-col
                                    ${isRecommended
                                        ? 'border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]'
                                        : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 shadow-sm hover:shadow-md'}
                                `}
                                onClick={() => handleSelectPackage(pkg.id)}
                            >
                                {isRecommended && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm z-10">
                                        Recommended
                                    </div>
                                )}

                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center text-xl">
                                            📦
                                        </div>
                                        {pkg.active && (
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">Active</span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 transition-colors">{pkg.name}</h3>
                                    <p className="text-sm text-neutral-500 line-clamp-3">{pkg.short_description}</p>
                                </div>

                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 rounded-b-xl flex justify-between items-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
                                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                        {pkg.items?.length || 0} Services
                                    </span>
                                    <span className="text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                        Select &rarr;
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
