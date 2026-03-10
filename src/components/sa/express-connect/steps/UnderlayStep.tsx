'use client';

import { ExpressConnectRequirements } from '@/src/lib/types';

interface StepProps {
    requirements: Partial<ExpressConnectRequirements>;
    updateRequirements: (updates: Partial<ExpressConnectRequirements>) => void;
    onNext: () => void; isLast?: boolean;
}

export default function UnderlayStep({ requirements, updateRequirements, onNext, isLast }: StepProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Availability Model</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => updateRequirements({ haModel: 'active-active' })}
                        className={`group p-6 rounded-2xl border-2 text-left transition-all duration-300 ${requirements.haModel === 'active-active' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900'}`}
                    >
                        <div className={`font-bold text-xl mb-1 ${requirements.haModel === 'active-active' ? 'text-amber-600 dark:text-amber-400' : ''}`}>Active / Active</div>
                        <p className="text-sm text-neutral-500 line-clamp-2">Utilize all available bandwidth simultaneously with load balancing.</p>
                    </button>
                    <button
                        onClick={() => updateRequirements({ haModel: 'active-standby' })}
                        className={`group p-6 rounded-2xl border-2 text-left transition-all duration-300 ${requirements.haModel === 'active-standby' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900'}`}
                    >
                        <div className={`font-bold text-xl mb-1 ${requirements.haModel === 'active-standby' ? 'text-amber-600 dark:text-amber-400' : ''}`}>Active / Standby</div>
                        <p className="text-sm text-neutral-500 line-clamp-2">Keep one link strictly as failover. Lower complexity, predictable failover.</p>
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Hardware Redundancy (Warm Spare)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { id: 'none', label: 'None', desc: 'Single appliance per site. Best for cost-sensitive branches.' },
                        { id: 'hub-only', label: 'Hubs Only', desc: 'Redundant HA appliances at Hub/Data Center locations only.' },
                        { id: 'hub-and-critical-spokes', label: 'Hubs & Critical Branches', desc: 'Redundant hardware at the core and mission-critical sites.' },
                        { id: 'all-sites', label: 'All Sites', desc: 'Maximum uptime. Redundant appliances at every location.' }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => updateRequirements({ hardwareRedundancy: opt.id as any })}
                            className={`p-5 rounded-xl border-2 text-left transition-all ${requirements.hardwareRedundancy === opt.id ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900'}`}
                        >
                            <div className={`font-bold mb-1 ${requirements.hardwareRedundancy === opt.id ? 'text-amber-600 dark:text-amber-400' : ''}`}>{opt.label}</div>
                            <p className="text-xs text-neutral-500 leading-relaxed">{opt.desc}</p>
                        </button>
                    ))}
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
