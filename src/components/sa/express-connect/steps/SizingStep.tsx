'use client';

import { ExpressConnectRequirements } from '@/src/lib/types';

interface StepProps {
    requirements: Partial<ExpressConnectRequirements>;
    updateRequirements: (updates: Partial<ExpressConnectRequirements>) => void;
    onNext: () => void; isLast?: boolean;
}

export default function SizingStep({ requirements, updateRequirements, onNext, isLast }: StepProps) {
    const physReqs = [
        { id: 'wifi', label: 'Integrated Wi-Fi', desc: 'Build the AP directly into the router.' },
        { id: 'poe', label: 'Built-in PoE Port(s)', desc: 'Power downstream devices from the router.' },
        { id: 'rack-mount', label: 'Rack Mounted', desc: 'Design for standard 19" server racks.' },
        { id: 'wall-mount', label: 'Wall / Table Mount', desc: 'Compact design for closets or desks.' }
    ];

    const togglePhys = (id: string) => {
        const current = requirements.physicalRequirements || [];
        if (current.includes(id as any)) {
            updateRequirements({ physicalRequirements: current.filter(p => p !== id) as any });
        } else {
            updateRequirements({ physicalRequirements: [...current, id ] as any });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Max Concurrent Users (Per Site)</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="1"
                            max="250"
                            step="5"
                            value={requirements.maxConcurrentUsers || 10}
                            onChange={e => updateRequirements({ maxConcurrentUsers: parseInt(e.target.value) })}
                            className="flex-1 accent-amber-500"
                        />
                        <div className="w-20 text-center py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg font-bold">
                            {requirements.maxConcurrentUsers}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">ISP Bandwidth (Mbps)</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="50"
                            max="2000"
                            step="50"
                            value={requirements.totalThroughputMbps || 100}
                            onChange={e => updateRequirements({ totalThroughputMbps: parseInt(e.target.value) })}
                            className="flex-1 accent-amber-500"
                        />
                        <div className="w-20 text-center py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg font-bold">
                            {requirements.totalThroughputMbps}
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Security Requirement</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { id: 'enterprise-security', label: 'Enterprise', desc: 'Stateful firewall & VPN.' },
                        { id: 'advanced-security-plus', label: 'Advanced UTM', desc: 'IPS, AMP, Content Filtering.' },
                        { id: 'cloud-security-proxy', label: 'Cloud Edge', desc: 'Security via Cisco Umbrella.' }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => updateRequirements({ securityPosture: opt.id as any })}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${requirements.securityPosture === opt.id ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'}`}
                        >
                            <div className={`font-bold text-sm mb-1 ${requirements.securityPosture === opt.id ? 'text-amber-600 dark:text-amber-400' : ''}`}>{opt.label}</div>
                            <p className="text-[10px] text-neutral-500 leading-tight">{opt.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Hardware Features (All-in-One Check)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {physReqs.map((req: any) => (
                        <button
                            key={req.id}
                            onClick={() => togglePhys(req.id)}
                            className={`p-5 rounded-2xl border-2 flex flex-col text-left transition-all ${requirements.physicalRequirements?.includes(req.id as any) ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'}`}
                        >
                            <div className="flex items-center justify-between w-full mb-1">
                                <div className={`font-bold ${requirements.physicalRequirements?.includes(req.id as any) ? 'text-amber-600 dark:text-amber-400' : ''}`}>{req.label}</div>
                                {requirements.physicalRequirements?.includes(req.id as any) && (
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                )}
                            </div>
                            <p className="text-xs text-neutral-500 leading-relaxed">{req.desc}</p>
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
