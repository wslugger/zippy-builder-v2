'use client';

import { ExpressConnectRequirements } from '@/src/lib/types';

interface StepProps {
    requirements: Partial<ExpressConnectRequirements>;
    updateRequirements: (updates: Partial<ExpressConnectRequirements>) => void;
    onNext: () => void; isLast?: boolean;
}

export default function TopologyStep({ requirements, updateRequirements, onNext, isLast }: StepProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">VPN Topology</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => updateRequirements({ topology: 'hub-and-spoke' })}
                        className={`group p-6 rounded-2xl border-2 text-left transition-all duration-300 ${requirements.topology === 'hub-and-spoke' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/50'}`}
                    >
                        <div className={`font-bold text-xl mb-2 transition-colors ${requirements.topology === 'hub-and-spoke' ? 'text-amber-600 dark:text-amber-400' : ''}`}>Hub-and-Spoke</div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Centralized traffic flow through a main hub. Ideal for most enterprise applications located in a Data Center.</p>
                        <div className={`mt-4 h-1 w-0 bg-amber-500 transition-all duration-500 ${requirements.topology === 'hub-and-spoke' ? 'w-full' : ''}`} />
                    </button>
                    <button
                        onClick={() => updateRequirements({ topology: 'partial-mesh' })}
                        className={`group p-6 rounded-2xl border-2 text-left transition-all duration-300 ${requirements.topology === 'partial-mesh' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/50'}`}
                    >
                        <div className={`font-bold text-xl mb-2 transition-colors ${requirements.topology === 'partial-mesh' ? 'text-amber-600 dark:text-amber-400' : ''}`}>Partial Mesh</div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Enables direct branch-to-branch communication. Essential for VoIP, P2P, and high-performance collaboration.</p>
                        <div className={`mt-4 h-1 w-0 bg-amber-500 transition-all duration-500 ${requirements.topology === 'partial-mesh' ? 'w-full' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-neutral-800 dark:text-neutral-200">Latency Sensitivity</h4>
                        <p className="text-xs text-neutral-500">Should added latency impact critical applications?</p>
                    </div>
                    <button
                        onClick={() => updateRequirements({ latencySensitive: !requirements.latencySensitive })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${requirements.latencySensitive ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requirements.latencySensitive ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 pt-6">
                    <div>
                        <h4 className="font-bold text-neutral-800 dark:text-neutral-200">Direct Branch Communication</h4>
                        <p className="text-xs text-neutral-500">Require Peer-to-Peer sharing or direct VoIP streams?</p>
                    </div>
                    <button
                        onClick={() => updateRequirements({ spokeToSpokeEnabled: !requirements.spokeToSpokeEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${requirements.spokeToSpokeEnabled ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requirements.spokeToSpokeEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
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
