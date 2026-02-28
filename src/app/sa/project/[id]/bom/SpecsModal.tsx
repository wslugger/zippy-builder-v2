/* eslint-disable @typescript-eslint/no-explicit-any */
import { Equipment, VENDOR_LABELS } from "@/src/lib/types";

interface SpecsModalProps {
    item: Equipment;
    onClose: () => void;
}

export function SpecsModal({ item, onClose }: SpecsModalProps) {
    const poeBudget = (item as any).specs?.poeBudgetWatts || (item as any).specs?.poe_budget || (item as any).specs?.poeBudget || 0;
    const poeCapabilities = (item as any).specs?.poe_capabilities;
    const hasPoe = poeBudget > 0 || (poeCapabilities && poeCapabilities !== 'None');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Equipment Specifications</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex items-start space-x-6 mb-8">
                        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <svg className="w-16 h-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <div className="inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 mb-2">
                                {(VENDOR_LABELS as Record<string, string>)[item.vendor_id] || item.vendor_id}
                            </div>
                            <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{item.model}</h4>
                            <p className="text-slate-600 dark:text-slate-400 mt-2">{item.description}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                        {/* Column 1: Core Performance/Capabilities */}
                        <div>
                            {item.role === 'LAN' && (
                                <>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Switching Capabilities</h5>
                                    <dl className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">Stackable</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">{(item.specs as any).isStackable ? 'Yes' : 'No'}</dd>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">PoE Budget</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">
                                                {hasPoe ? `${poeBudget} W` : 'None'}
                                            </dd>
                                        </div>
                                        {hasPoe && poeCapabilities && poeCapabilities !== 'None' && (
                                            <div className="flex justify-between text-sm">
                                                <dt className="text-slate-500 dark:text-slate-400">PoE Standard</dt>
                                                <dd className="font-semibold text-slate-900 dark:text-slate-100">{poeCapabilities}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </>
                            )}
                            {item.role === 'WLAN' && (
                                <>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Wireless Specs</h5>
                                    <dl className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">Standard</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">{(item.specs as any).wifiStandard || "Wi-Fi 6"}</dd>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">MIMO</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">{(item.specs as any).mimoBandwidth || "2x2"}</dd>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">Environment</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">{(item.specs as any).environment || "Indoor"}</dd>
                                        </div>
                                    </dl>
                                </>
                            )}

                            {item.role === 'WAN' && (
                                <>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Performance</h5>
                                    <dl className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">VPN Throughput</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">{(item.specs as any).sdwanCryptoThroughputMbps || 0} Mbps</dd>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">Firewall Throughput</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">{(item.specs as any).rawFirewallThroughputMbps || 0} Mbps</dd>
                                        </div>
                                    </dl>
                                </>
                            )}
                        </div>

                        {/* Column 2: Hardware Details */}
                        <div>
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Hardware Details</h5>
                            <dl className="space-y-2">
                                {item.role === 'LAN' && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">Access Ports</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">
                                                {(item.specs as any).accessPortCount || 0}x {(item.specs as any).accessPortType || "1G-Copper"}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">Uplink Ports</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">
                                                {(item.specs as any).uplinkPortCount || 0}x {(item.specs as any).uplinkPortType || "10G-Fiber"}
                                            </dd>
                                        </div>
                                    </>
                                )}

                                {item.role === 'WLAN' && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">Uplink Interface</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">{(item.specs as any).uplinkType || "1G-Copper"}</dd>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">Max Power Draw</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">{(item.specs as any).powerDrawWatts || 15} W</dd>
                                        </div>
                                    </>
                                )}

                                {item.role === 'WAN' && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">WAN/LAN Ports</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">
                                                {(item.specs as any).wanPortCount || 0}W / {(item.specs as any).lanPortCount || 0}L
                                            </dd>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <dt className="text-slate-500 dark:text-slate-400">Uplink / SFP</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-slate-100">{(item.specs as any).sfpPortCount || 0}</dd>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500 dark:text-slate-400">Form Factor</dt>
                                    <dd className="font-semibold text-slate-900 dark:text-slate-100 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] uppercase">
                                        {item.formFactor || "Standard"}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-white transition-colors"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
