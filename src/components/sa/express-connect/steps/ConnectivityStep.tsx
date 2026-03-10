'use client';

import { ExpressConnectRequirements } from '@/src/lib/types';

interface StepProps {
    requirements: Partial<ExpressConnectRequirements>;
    updateRequirements: (updates: Partial<ExpressConnectRequirements>) => void;
    onNext: () => void; isLast?: boolean;
}

export default function ConnectivityStep({ requirements, updateRequirements, onNext, isLast }: StepProps) {
    const options = [
        { 
            id: '5G-primary', 
            label: '5G Primary', 
            icon: '📶',
            desc: 'Cellular-first design. Ideal for rapid deployment or areas with poor wired infrastructure.',
            color: 'from-amber-500 to-orange-600'
        },
        { 
            id: '5G-backup', 
            label: '5G / 4G Backup', 
            icon: '🛡️',
            desc: 'Wired primary with cellular failover. Ensures branch stays online via MG modems.',
            color: 'from-blue-500 to-indigo-600'
        },
        { 
            id: 'wired-only', 
            label: 'Wired Only', 
            icon: '🔌',
            desc: 'Pure broadband or fiber design. Choose if cellular is not needed or handled externally.',
            color: 'from-neutral-500 to-neutral-700'
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => updateRequirements({ wanPriority: opt.id as any })}
                        className={`
                            relative flex flex-col p-6 rounded-3xl border-2 transition-all duration-300 text-left h-full group
                            ${requirements.wanPriority === opt.id 
                                ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-900/10 shadow-xl' 
                                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300'}
                        `}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 bg-gradient-to-br transition-transform group-hover:scale-110 ${opt.color}`}>
                            {opt.icon}
                        </div>
                        <h3 className={`text-xl font-bold mb-2 ${requirements.wanPriority === opt.id ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                            {opt.label}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                            {opt.desc}
                        </p>
                        
                        {requirements.wanPriority === opt.id && (
                            <div className="mt-auto flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-widest animate-pulse">
                                Selected Option
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {requirements.wanPriority?.includes('5G') && (
                <div className="p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800 animate-in zoom-in-95 duration-300">
                    <label className="block text-sm font-bold text-amber-800 dark:text-amber-200 mb-2 uppercase tracking-wide">Preferred Cellular Provider</label>
                    <input
                        type="text"
                        value={requirements.cellularProviderPreference || ''}
                        onChange={e => updateRequirements({ cellularProviderPreference: e.target.value })}
                        placeholder="e.g. T-Mobile, Verizon, AT&T, Vodafone"
                        className="w-full bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    />
                    <p className="mt-2 text-xs text-amber-600/80 italic">This helps us ensure the correct modem SKU and SIM tray compatibility.</p>
                </div>
            )}

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
