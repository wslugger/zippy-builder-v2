'use client';

import { ExpressConnectRequirements } from '@/src/lib/types';

interface StepProps {
    requirements: Partial<ExpressConnectRequirements>;
    updateRequirements: (updates: Partial<ExpressConnectRequirements>) => void;
    onNext: () => void; isLast?: boolean;
}

export default function CloudStep({ requirements, updateRequirements, onNext, isLast }: StepProps) {
    const platforms = [
        { id: 'aws', label: 'AWS', color: 'bg-orange-500' },
        { id: 'azure', label: 'Azure', color: 'bg-blue-500' },
        { id: 'gcp', label: 'GCP', color: 'bg-red-500' }
    ];

    const togglePlatform = (id: string) => {
        const current = requirements.cloudPlatforms || [];
        if (current.includes(id as any)) {
            const next = current.filter(p => p !== id) as any;
            updateRequirements({ cloudPlatforms: next.length ? next : ['none'] });
        } else {
            updateRequirements({ cloudPlatforms: [...current.filter(p => p !== 'none'), id ] as any });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Cloud Footprint (IaaS)</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {platforms.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => togglePlatform(p.id)}
                            className={`p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${requirements.cloudPlatforms?.includes(p.id as any) ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'}`}
                        >
                            <div className={`w-3 h-3 rounded-full ${p.color}`} />
                            <div className="font-bold flex-1 text-left">{p.label}</div>
                            {requirements.cloudPlatforms?.includes(p.id as any) && (
                                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className={`space-y-8 transition-all duration-300 ${requirements.cloudPlatforms?.includes('none') ? 'opacity-30 pointer-events-none' : ''}`}>
                <div>
                    <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Daily Data Throughput (vMX Sizing)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'vMX-S', label: 'Small (vMX-S)', desc: 'Up to 250 Mbps. Best for small branch workloads.' },
                            { id: 'vMX-M', label: 'Medium (vMX-M)', desc: 'Up to 500 Mbps. Standard for mid-size business.' },
                            { id: 'vMX-L', label: 'Large (vMX-L)', desc: 'Up to 1 Gbps+. High-throughput cloud cores.' }
                        ].map((tier) => (
                            <button
                                key={tier.id}
                                onClick={() => updateRequirements({ cloudThroughputTier: tier.id as any })}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${requirements.cloudThroughputTier === tier.id ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'}`}
                            >
                                <div className={`font-bold text-sm mb-1 ${requirements.cloudThroughputTier === tier.id ? 'text-amber-600 dark:text-amber-400' : ''}`}>{tier.label}</div>
                                <p className="text-[10px] text-neutral-500 leading-tight">{tier.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <div>
                        <h4 className="font-bold">Multi-Cloud Communication</h4>
                        <p className="text-xs text-neutral-500">Do internal environments in different clouds need to talk via SD-WAN?</p>
                    </div>
                    <button
                        onClick={() => updateRequirements({ multiCloudCommsRequired: !requirements.multiCloudCommsRequired })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${requirements.multiCloudCommsRequired ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requirements.multiCloudCommsRequired ? 'left-7' : 'left-1'}`} />
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
