'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SystemDefaultsService } from '@/src/lib/firebase';
import { WorkflowStep } from '@/src/lib/types';

import { DEFAULT_WORKFLOW_STEPS } from '@/src/lib/workflow-defaults';

const DEFAULT_STEPS = DEFAULT_WORKFLOW_STEPS;



export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [steps, setSteps] = useState<WorkflowStep[]>(DEFAULT_STEPS);

    useEffect(() => {
        const fetchSteps = async () => {
            try {
                const dynamicSteps = await SystemDefaultsService.getWorkflowSteps();
                if (dynamicSteps && dynamicSteps.length > 0) {
                    setSteps(dynamicSteps);
                }
            } catch (error) {
                console.error("Failed to fetch workflow steps:", error);
            }
        };
        fetchSteps();
    }, []);

    // Determine current step index
    const currentStepIndex = steps.findIndex(step => pathname.includes(step.path));

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-64px)]">
            {/* Progress Bar Container */}
            <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                            Project Workflow
                        </h2>
                        <Link
                            href="/sa/dashboard"
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            &larr; Back to Dashboard
                        </Link>
                    </div>

                    {/* Steps */}
                    <div className="flex items-center w-full relative">
                        {/* Connecting Line background */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-neutral-200 dark:bg-neutral-800 -z-10 rounded-full" />

                        {/* Active Line (approximate based on step) */}
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-500 -z-10 rounded-full"
                            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                        />

                        <div className="flex justify-between w-full">
                            {steps.map((step, index) => {
                                const isActive = index === currentStepIndex;
                                const isCompleted = index < currentStepIndex;

                                return (
                                    <div key={step.id} className="flex flex-col items-center group">
                                        <div
                                            className={`
                                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 z-10
                                                ${isActive ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30' :
                                                    isCompleted ? 'bg-blue-600 border-blue-600 text-white' :
                                                        'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-400'}
                                            `}
                                        >
                                            {isCompleted ? '✓' : index + 1}
                                        </div>
                                        <span className={`
                                            absolute mt-10 text-xs font-medium transition-colors duration-300
                                            ${isActive ? 'text-blue-600 dark:text-blue-400' :
                                                isCompleted ? 'text-neutral-900 dark:text-neutral-100' :
                                                    'text-neutral-400'}
                                        `}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 bg-neutral-50 dark:bg-neutral-950">
                {children}
            </div>
        </div>
    );
}
