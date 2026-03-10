'use client';

import { ExpressConnectRequirements } from '@/src/lib/types';

interface StepProps {
    requirements: Partial<ExpressConnectRequirements>;
    updateRequirements: (updates: Partial<ExpressConnectRequirements>) => void;
    onNext: () => void; isLast?: boolean;
}

export default function AdditionalServicesStep({ requirements, updateRequirements, onNext, isLast }: StepProps) {
    const services = [
        { id: 'ddos', label: 'DDoS Protection', icon: '🛡️', desc: 'Mitigate large-scale volumetric attacks.' },
        { id: 'aiops', label: 'Meraki Insight (AIOps)', icon: '🧠', desc: 'AI-driven application performance monitoring.' },
        { id: 'umbrella', label: 'Cisco Umbrella', icon: '⛱️', desc: 'DNS-layer security and SIG capabilities.' },
        { id: 'thousandeyes', label: 'ThousandEyes', icon: '👁️', desc: 'End-to-end network path visibility.' }
    ] as const;

    const toggleService = (id: typeof services[number]['id']) => {
        const current = requirements.additionalServices || [];
        if ((current as string[]).includes(id)) {
            updateRequirements({ additionalServices: (current as any).filter((s: any) => s !== id) });
        } else {
            updateRequirements({ additionalServices: [...current, id] as any });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((svc) => (
                    <button
                        key={svc.id}
                        onClick={() => toggleService(svc.id)}
                        className={`
                            p-6 rounded-2xl border-2 flex gap-4 text-left transition-all duration-300 group
                            ${(requirements.additionalServices as string[])?.includes(svc.id) 
                                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10 shadow-lg' 
                                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300'}
                        `}
                    >
                        <div className="text-3xl group-hover:scale-110 transition-transform">{svc.icon}</div>
                        <div>
                            <div className={`font-bold mb-1 ${(requirements.additionalServices as string[])?.includes(svc.id) ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                {svc.label}
                            </div>
                            <p className="text-xs text-neutral-500 leading-relaxed">{svc.desc}</p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="pt-8 flex justify-center">
                <div className="text-center max-w-sm">
                    <p className="text-sm text-neutral-500 mb-6">
                        Once you finalize, our AI will map these intents to the optimal Meraki hardware SKUs and licensing tiers.
                    </p>
                    <button 
                       onClick={onNext}
                       className="w-full py-4 bg-gradient-to-r from-neutral-900 to-neutral-800 dark:from-neutral-100 dark:to-neutral-200 text-white dark:text-neutral-900 rounded-2xl font-bold shadow-xl transition-all hover:-translate-y-1 active:translate-y-0"
                    >
                        Finalize Intent Design
                    </button>
                </div>
            </div>
        </div>
    );
}
