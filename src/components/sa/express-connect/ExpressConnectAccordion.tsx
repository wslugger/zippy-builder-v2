'use client';

import { useState } from 'react';
import { ExpressConnectRequirements } from '@/src/lib/types';
import { ProjectService } from '@/src/lib/firebase';
import TopologyStep from './steps/TopologyStep';
import UnderlayStep from './steps/UnderlayStep';
import BreakoutStep from './steps/BreakoutStep';
import CloudStep from './steps/CloudStep';
import ConnectivityStep from './steps/ConnectivityStep';
import SizingStep from './steps/SizingStep';
import LANStep from './steps/LANStep';
import WLANStep from './steps/WLANStep';
import AdditionalServicesStep from './steps/AdditionalServicesStep';

interface Props {
    projectId: string;
    initialRequirements?: ExpressConnectRequirements;
    onComplete: () => void;
}

const DEFAULT_REQUIREMENTS: Partial<ExpressConnectRequirements> = {
    topology: 'hub-and-spoke',
    trafficFlow: 'centralized',
    spokeToSpokeEnabled: false,
    latencySensitive: false,
    haModel: 'active-standby',
    hardwareRedundancy: 'none',
    saasHeavy: true,
    breakoutStrategy: 'direct',
    localUTMEnabled: true,
    missionCriticalApps: [],
    cloudPlatforms: ['none'],
    cloudAccessMethod: 'public-internet',
    multiCloudCommsRequired: false,
    cloudThroughputTier: 'none',
    wanPriority: 'wired-only',
    maxConcurrentUsers: 10,
    totalThroughputMbps: 100,
    securityPosture: 'enterprise-security',
    physicalRequirements: ['rack-mount'],
    lanPortDensity: 8,
    lanPoEBudget: 'low',
    lanUplinkSpeed: '1G',
    lanStackingRequired: false,
    lanLayer3Required: false,
    lanEnvironment: 'standard',
    wlanDensity: 'low',
    wlanEnvironment: 'drop-ceiling',
    wlanSiteSurveyAvailable: false,
    wlanStandard: 'wifi-6',
    wlanAuthMethod: 'psk',
    wlanIoTAnalyticsRequired: false,
    additionalServices: []
};

export default function ExpressConnectAccordion({ projectId, initialRequirements, onComplete }: Props) {
    const [requirements, setRequirements] = useState<Partial<ExpressConnectRequirements>>(initialRequirements || DEFAULT_REQUIREMENTS);
    const [activeStep, setActiveStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    const steps = [
        { id: 'topology', label: 'Network Topology', component: TopologyStep, description: 'Define how sites communicate.' },
        { id: 'underlay', label: 'Underlay & HA', component: UnderlayStep, description: 'Resilience and bandwidth strategy.' },
        { id: 'breakout', label: 'Internet Breakout', component: BreakoutStep, description: 'Routing for SaaS and web traffic.' },
        { id: 'cloud', label: 'Cloud Services', component: CloudStep, description: 'IaaS connectivity (vMX).' },
        { id: 'connectivity', label: 'WAN Connectivity', component: ConnectivityStep, description: '5G and wired internet priorities.' },
        { id: 'sizing', label: 'Site Sizing', component: SizingStep, description: 'User scale and hardware features.' },
        { id: 'lan', label: 'LAN / Switching', component: LANStep, description: 'Wired port and stacking needs.' },
        { id: 'wlan', label: 'WLAN / Wireless', component: WLANStep, description: 'RF planning and density.' },
        { id: 'additional', label: 'Additional Services', component: AdditionalServicesStep, description: 'DDoS, AIOps, and more.' }
    ];

    const updateRequirements = (updates: Partial<ExpressConnectRequirements>) => {
        setRequirements((prev: Partial<ExpressConnectRequirements>) => ({ ...prev, ...updates }));
    };

    const handleNext = async (stepIndex: number) => {
        if (!completedSteps.includes(stepIndex)) {
            setCompletedSteps(prev => [...prev, stepIndex]);
        }
        
        if (stepIndex < steps.length - 1) {
            setActiveStep(stepIndex + 1);
        } else {
            await handleFinish();
        }
    };

    const handleFinish = async () => {
        setSaving(true);
        try {
            await ProjectService.updateProject(projectId, {
                expressConnectRequirements: requirements as ExpressConnectRequirements,
                status: 'customizing', // Moving to customizing since we've gathered intent
                currentStep: 3
            });
            onComplete();
        } catch (error) {
            console.error("Failed to save requirements:", error);
            alert("Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {steps.map((step, index) => {
                const isActive = activeStep === index;
                const isCompleted = completedSteps.includes(index);
                const StepComponent = step.component;

                return (
                    <div 
                        key={step.id}
                        className={`
                            border rounded-2xl overflow-hidden transition-all duration-300
                            ${isActive 
                                ? 'bg-white dark:bg-neutral-900 border-amber-500 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/20' 
                                : 'bg-neutral-50 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800'}
                        `}
                    >
                        <button
                            onClick={() => setActiveStep(index)}
                            className="w-full px-6 py-5 flex items-center justify-between text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                                    ${isCompleted 
                                        ? 'bg-green-500 text-white' 
                                        : isActive 
                                            ? 'bg-amber-500 text-white' 
                                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 group-hover:bg-neutral-300 dark:group-hover:bg-neutral-700'}
                                `}>
                                    {isCompleted ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : index + 1}
                                </div>
                                <div>
                                    <h3 className={`font-bold transition-colors ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                        {step.label}
                                    </h3>
                                    {!isActive && isCompleted && (
                                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Step Complete</p>
                                    )}
                                </div>
                            </div>
                            {!isActive && (
                                <svg 
                                    className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`} 
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            )}
                        </button>

                        <div className={`
                            transition-all duration-500 ease-in-out
                            ${isActive ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}
                        `}>
                            <div className="px-6 pb-8 pt-2">
                                <div className="p-1 px-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg inline-block text-[11px] font-medium text-neutral-500 mb-6">
                                    {step.description}
                                </div>
                                <StepComponent 
                                    requirements={requirements} 
                                    updateRequirements={updateRequirements} 
                                    onNext={() => handleNext(index)}
                                    isLast={index === steps.length - 1}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}

            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleFinish}
                    disabled={saving || !completedSteps.includes(steps.length - 1)}
                    className="px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                >
                    {saving ? 'Saving Design...' : 'Generate Design Logic'}
                </button>
            </div>
        </div>
    );
}
