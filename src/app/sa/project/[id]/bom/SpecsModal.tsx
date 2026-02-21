/* eslint-disable @typescript-eslint/no-explicit-any */
import { Equipment, VENDOR_LABELS } from "@/src/lib/types";

interface SpecsModalProps {
    item: Equipment;
    onClose: () => void;
}

export function SpecsModal({ item, onClose }: SpecsModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Equipment Specifications</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex items-start space-x-6 mb-8">
                        <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                            <svg className="w-16 h-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <div className="inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-2">
                                {VENDOR_LABELS[item.vendor_id] || item.vendor_id}
                            </div>
                            <h4 className="text-2xl font-bold text-slate-900">{item.model}</h4>
                            <p className="text-slate-600 mt-2">{item.description}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                        <div>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Performance</h5>
                            <dl className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500">VPN Throughput</dt>
                                    <dd className="font-semibold text-slate-900">{(item as any).specs.vpn_throughput_mbps} Mbps</dd>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500">NGFW Throughput</dt>
                                    <dd className="font-semibold text-slate-900">{(item as any).specs.ngfw_throughput_mbps || 0} Mbps</dd>
                                </div>
                                {(item as any).specs.adv_sec_throughput_mbps && (
                                    <div className="flex justify-between text-sm">
                                        <dt className="text-slate-500">AdvSec Throughput</dt>
                                        <dd className="font-semibold text-slate-900">{(item as any).specs.adv_sec_throughput_mbps} Mbps</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                        <div>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Hardware</h5>
                            <dl className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500">
                                        {item.role === 'WAN' ? 'WAN/LAN Ports' : item.role === 'LAN' ? 'Access Ports' : 'Total Ports'}
                                    </dt>
                                    <dd className="font-semibold text-slate-900">
                                        {item.role === 'WAN'
                                            ? `${(item.specs as any).wanPortCount || 0}W / ${(item.specs as any).lanPortCount || 0}L`
                                            : item.role === 'LAN'
                                                ? (item.specs as any).accessPortCount || 0
                                                : (item.specs as any).ports || "N/A"}
                                    </dd>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500">Uplink / SFP</dt>
                                    <dd className="font-semibold text-slate-900">
                                        {item.role === 'WAN'
                                            ? (item.specs as any).sfpPortCount || 0
                                            : item.role === 'LAN'
                                                ? (item.specs as any).uplinkPortCount || 0
                                                : "N/A"}
                                    </dd>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <dt className="text-slate-500">Form Factor</dt>
                                    <dd className="font-semibold text-slate-900 uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                                        {item.formFactor || "Desktop / Rack"}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
