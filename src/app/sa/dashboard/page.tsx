'use client';

import { Project } from '@/src/lib/types';
import { ProjectService } from '@/src/lib/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { DEFAULT_WORKFLOW_STEPS } from '@/src/lib/workflow-defaults';

// Using a placeholder User ID for now since we don't have Auth context yet
const MOCK_USER_ID = "user_123";

/** Map a project's currentStep (1-based) to the correct workflow path. */
function getResumePathForStep(currentStep: number): string {
    const index = currentStep - 1; // currentStep 1 = index 0 (scope)
    const step = DEFAULT_WORKFLOW_STEPS[index];
    return step?.path ?? 'scope';
}

export default function SADashboard() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // New project form state
    const [newProjectName, setNewProjectName] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await ProjectService.getUserProjects(MOCK_USER_ID);
            setProjects(data);
        } catch (error) {
            console.error("Failed to load projects:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newProject: Project = {
                id: crypto.randomUUID(),
                userId: MOCK_USER_ID,
                name: newProjectName,
                customerName: customerName,
                description: description,
                status: 'scope_selection', // Initial status
                currentStep: 1, // Start at Project Scope
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await ProjectService.createProject(newProject);
            router.push(`/sa/project/${newProject.id}/scope`);
        } catch (error) {
            console.error("Failed to create project:", error);
            alert("Error creating project. Check console.");
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Projects</h1>
                    <p className="text-neutral-500">Manage your solution designs and customer proposals.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    + New Project
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
                    ))}
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-20 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
                    <p className="text-neutral-500 mb-4">No projects found.</p>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="text-blue-600 hover:underline"
                    >
                        Create your first project
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => router.push(`/sa/project/${project.id}/${getResumePathForStep(project.currentStep)}`)}
                            className="group relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer hover:border-blue-500/50"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                    {project.customerName.charAt(0).toUpperCase()}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${project.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    project.status === 'customizing' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                    {project.status.replace('_', ' ')}
                                </span>
                            </div>
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                            <p className="text-sm text-neutral-500 mb-4 truncate">{project.customerName}</p>
                            <div className="text-xs text-neutral-400 flex justify-between items-center mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                                <span className="font-mono">Step {project.currentStep}/{DEFAULT_WORKFLOW_STEPS.length}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Start New Project</h2>
                            <form onSubmit={handleCreateProject} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Project Name</label>
                                    <input
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="e.g. NextGen Network Upgrade"
                                        value={newProjectName}
                                        onChange={e => setNewProjectName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Customer Name</label>
                                    <input
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="e.g. Acme Corp"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                    <textarea
                                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
                                        placeholder="Briefly describe the goals..."
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                                    >
                                        Create Project
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
