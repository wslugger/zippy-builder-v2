'use client';

import { ExpressConnectRequirements } from '@/src/lib/types';

interface StepProps {
    requirements: Partial<ExpressConnectRequirements>;
    updateRequirements: (updates: Partial<ExpressConnectRequirements>) => void;
    onNext: () => void; isLast?: boolean;
}

export default function LANStep({ requirements, updateRequirements, onNext, isLast }: StepProps) {
    const isAllInOnePossible = requirements.physicalRequirements?.includes('poe') || requirements.maxConcurrentUsers! <= 50;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {isAllInOnePossible && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 rounded-xl flex items-start gap-3">
                    <div className="text-green-600 mt-1">✨</div>
                    <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
                        Based on your site scale and requirements, we may be able to use the **All-in-One** capabilities of the Meraki MX appliance, reducing the need for standalone switches.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Wired Port Density</label>
                    <div className="grid grid-cols-4 gap-2">
                        {[8, 16, 24, 48].map(num => (
                            <button
                                key={num}
                                onClick={() => updateRequirements({ lanPortDensity: num })}
                                className={`py-3 rounded-xl border-2 font-bold transition-all ${requirements.lanPortDensity === num ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10 text-amber-600' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'}`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                    {requirements.lanPortDensity! > 48 && (
                        <p className="mt-2 text-[10px] text-red-500 font-bold uppercase tracking-tight">Large site detected: Consider custom LAN config.</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Uplink Speed</label>
                    <div className="flex gap-2">
                        {['1G', '10G', '40G'].map(speed => (
                            <button
                                key={speed}
                                onClick={() => updateRequirements({ lanUplinkSpeed: speed as any  })}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${requirements.lanUplinkSpeed === speed ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10 text-amber-600' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'}`}
                            >
                                {speed}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${requirements.lanStackingRequired ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 opacity-60'}`}>
                    <h4 className="font-bold text-sm mb-1">Stacking</h4>
                    <button
                        onClick={() => updateRequirements({ lanStackingRequired: !requirements.lanStackingRequired })}
                        className={`w-10 h-5 rounded-full relative transition-colors ${requirements.lanStackingRequired ? 'bg-amber-500' : 'bg-neutral-300'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${requirements.lanStackingRequired ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                </div>

                <div className={`p-5 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${requirements.lanLayer3Required ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 opacity-60'}`}>
                    <h4 className="font-bold text-sm mb-1">Layer 3 Routing</h4>
                    <button
                        onClick={() => updateRequirements({ lanLayer3Required: !requirements.lanLayer3Required })}
                        className={`w-10 h-5 rounded-full relative transition-colors ${requirements.lanLayer3Required ? 'bg-amber-500' : 'bg-neutral-300'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${requirements.lanLayer3Required ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                </div>

                <div className={`p-5 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${requirements.lanEnvironment === 'ruggedized' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 opacity-60'}`}>
                    <h4 className="font-bold text-sm mb-1">Ruggedized</h4>
                    <button
                        onClick={() => updateRequirements({ lanEnvironment: requirements.lanEnvironment === 'ruggedized' ? 'standard' : 'ruggedized' })}
                        className={`w-10 h-5 rounded-full relative transition-colors ${requirements.lanEnvironment === 'ruggedized' ? 'bg-amber-500' : 'bg-neutral-300'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${requirements.lanEnvironment === 'ruggedized' ? 'left-5.5' : 'left-0.5'}`} />
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
