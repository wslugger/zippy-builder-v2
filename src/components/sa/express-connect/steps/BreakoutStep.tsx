'use client';

import { useState } from 'react';
import { ExpressConnectRequirements } from '@/src/lib/types';

interface StepProps {
    requirements: Partial<ExpressConnectRequirements>;
    updateRequirements: (updates: Partial<ExpressConnectRequirements>) => void;
    onNext: () => void; isLast?: boolean;
}

export default function BreakoutStep({ requirements, updateRequirements, onNext, isLast }: StepProps) {
    const [appInput, setAppInput] = useState('');

    const addApp = () => {
        if (!appInput) return;
        const current = requirements.missionCriticalApps || [];
        if (!current.includes(appInput)) {
            updateRequirements({ missionCriticalApps: [...current, appInput] });
        }
        setAppInput('');
    };

    const removeApp = (app: string) => {
        const current = requirements.missionCriticalApps || [];
        updateRequirements({ missionCriticalApps: current.filter(a => a !== app) });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border-2 border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                    <div className="flex-1 pr-8">
                        <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-1">Heavy SaaS Adoption</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300/80">Are core business apps primarily SaaS-based (Microsoft 365, Salesforce, Google Workspace)?</p>
                    </div>
                    <button
                        onClick={() => updateRequirements({ saasHeavy: !requirements.saasHeavy })}
                        className={`w-14 h-8 rounded-full transition-all relative ${requirements.saasHeavy ? 'bg-amber-500 shadow-inner' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                    >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${requirements.saasHeavy ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Traffic Breakout Strategy</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { id: 'backhaul', label: 'Centralized', desc: 'Secure: all traffic flows through DC firewall.' },
                        { id: 'direct', label: 'Local Breakout', desc: 'Performance: branches go straight to Internet.' },
                        { id: 'hybrid', label: 'Hybrid/Steering', desc: 'Smart: SaaS goes direct, legacy goes to DC.' }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => updateRequirements({ breakoutStrategy: opt.id as any })}
                            className={`p-5 rounded-xl border-2 text-left transition-all ${requirements.breakoutStrategy === opt.id ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10 shadow-lg shadow-amber-500/5' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900'}`}
                        >
                            <div className={`font-bold mb-1 ${requirements.breakoutStrategy === opt.id ? 'text-amber-600 dark:text-amber-400' : ''}`}>{opt.label}</div>
                            <p className="text-xs text-neutral-500 leading-relaxed">{opt.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.042c-1.7 2.471-4.503 4.016-7.618 4.016z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-bold text-neutral-800 dark:text-neutral-200">Local Unified Threat Management (UTM)</h4>
                            <p className="text-xs text-neutral-500">Enable Security (IPS, AMP) at each branch for direct breakout protection.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => updateRequirements({ localUTMEnabled: !requirements.localUTMEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${requirements.localUTMEnabled ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requirements.localUTMEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Mission-Critical Applications</label>
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={appInput}
                        onChange={e => setAppInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addApp()}
                        placeholder="e.g. SAP, VoIP, Salesforce"
                        className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    />
                    <button
                        onClick={addApp}
                        className="px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(requirements.missionCriticalApps || []).map(app => (
                        <div key={app} className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-full text-sm font-medium border border-neutral-200 dark:border-neutral-700">
                            {app}
                            <button onClick={() => removeApp(app)} className="text-neutral-400 hover:text-red-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                    {(requirements.missionCriticalApps || []).length === 0 && (
                        <p className="text-sm text-neutral-400 italic">No specific apps added yet.</p>
                    )}
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button 
                   onClick={onNext}
                   className="group px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                    Continue
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
