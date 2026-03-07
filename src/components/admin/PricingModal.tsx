import { useState, useEffect } from 'react';
import { PricingItem } from '@/src/lib/types';

interface PricingModalProps {
    isOpen: boolean;
    item: PricingItem | null;
    onClose: () => void;
    onSave: () => void;
}

export default function PricingModal({ isOpen, item, onClose, onSave }: PricingModalProps) {
    const [formData, setFormData] = useState<Partial<PricingItem>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (item) {
            setFormData(item);
        } else {
            setFormData({ listPrice: 0 }); // Default state
        }
    }, [item, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let parsedValue: string | number | undefined = value;

        if (type === 'number') {
            parsedValue = value === '' ? undefined : Number(value);
        }

        setFormData((prev) => ({ ...prev, [name]: parsedValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/pricing/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item: formData })
            });

            if (res.ok) {
                onSave();
                onClose();
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Failed to save pricing item:', error);
            alert('Failed to save pricing item. See console for details.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
                <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                        {item ? 'Edit Pricing Item' : 'Add Pricing Item'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <form id="pricing-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                                    SKU (ID) *
                                </label>
                                <input
                                    type="text"
                                    name="id"
                                    value={formData.id || ''}
                                    onChange={handleChange}
                                    required
                                    disabled={!!item}
                                    className="w-full rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                                    placeholder="e.g. C9200-DNA-A-24-5Y"
                                />
                                {!item && <p className="text-xs text-zinc-500 mt-1">This ID must match exactly with the vendor pricing list.</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description || ''}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                                        List Price (USD) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="listPrice"
                                        value={formData.listPrice ?? ''}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                                        End-of-Sale Date (ISO)
                                    </label>
                                    <input
                                        type="text"
                                        name="eosDate"
                                        value={formData.eosDate || ''}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="YYYY-MM-DD"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                                        Purchase Price Override
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="purchasePrice"
                                        value={formData.purchasePrice ?? ''}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="Leave empty for calc"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                                        Rental Price Override
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="rentalPrice"
                                        value={formData.rentalPrice ?? ''}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="Leave empty for calc"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="pricing-form"
                        disabled={isSaving}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                        {isSaving ? "Saving..." : (item ? "Save Changes" : "Add Item")}
                    </button>
                </div>
            </div>
        </div>
    );
}
