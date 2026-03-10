'use client';

import { ExpressConnectRequirements } from '@/src/lib/types';

interface StepProps {
    requirements: Partial<ExpressConnectRequirements>;
    updateRequirements: (updates: Partial<ExpressConnectRequirements>) => void;
    onNext: () => void; isLast?: boolean;
}

export default function WLANStep({ requirements, updateRequirements, onNext, isLast }: StepProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Wireless Standard</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { id: 'wifi-6', label: 'Wi-Fi 6', desc: 'Standard business connectivity.' },
                        { id: 'wifi-6e', label: 'Wi-Fi 6E', desc: 'Adds 6GHz band for clean spectrum.' },
                        { id: 'wifi-7', label: 'Wi-Fi 7', desc: 'Next-gen performance and speed.' }
                    ].map((std) => (
                        <button
                            key={std.id}
                            onClick={() => updateRequirements({ wlanStandard: std.id as any })}
                            className={`p-5 rounded-xl border-2 text-left transition-all ${requirements.wlanStandard === std.id ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10 shadow-lg' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900'}`}
                        >
                            <div className={`font-bold mb-1 ${requirements.wlanStandard === std.id ? 'text-amber-600 dark:text-amber-400' : ''}`}>{std.label}</div>
                            <p className="text-xs text-neutral-500 leading-relaxed">{std.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">User Density</label>
                    <div className="flex gap-2">
                        {[
                            { id: 'low', label: 'Low', desc: 'Offices' },
                            { id: 'high', label: 'High', desc: 'Conference' },
                            { id: 'ultra-high', label: 'Ultra', desc: 'Event halls' }
                        ].map(d => (
                            <button
                                key={d.id}
                                onClick={() => updateRequirements({ wlanDensity: d as any  })}
                                className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${requirements.wlanDensity === d.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10 text-amber-600 font-bold' : 'border-neutral-200 dark:border-neutral-800'}`}
                            >
                                <div className="text-sm">{d.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Mounting Environment</label>
                    <select
                        value={requirements.wlanEnvironment}
                        onChange={e => updateRequirements({ wlanEnvironment: e as any  })}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium"
                    >
                        <option value="drop-ceiling">Indoor: Drop Ceiling / T-Bar</option>
                        <option value="open-ceiling">Indoor: Open Ceiling / Industrial</option>
                        <option value="outdoor">Outdoor: IP67 Rated Enclosure</option>
                    </select>
                </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold">IoT & Presence Analytics</h4>
                        <p className="text-xs text-neutral-500">Enable Bluetooth (BLE) for asset tracking and visitor analytics.</p>
                    </div>
                    <button
                        onClick={() => updateRequirements({ wlanIoTAnalyticsRequired: !requirements.wlanIoTAnalyticsRequired })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${requirements.wlanIoTAnalyticsRequired ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requirements.wlanIoTAnalyticsRequired ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 pt-6">
                    <div>
                        <h4 className="font-bold">Site Survey Available?</h4>
                        <p className="text-xs text-neutral-500">Do you have an Ekahau or TamoGraph predictive report?</p>
                    </div>
                    <button
                        onClick={() => updateRequirements({ wlanSiteSurveyAvailable: !requirements.wlanSiteSurveyAvailable })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${requirements.wlanSiteSurveyAvailable ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requirements.wlanSiteSurveyAvailable ? 'left-7' : 'left-1'}`} />
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
