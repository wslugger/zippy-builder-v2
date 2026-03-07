import { useState, useEffect, useCallback } from 'react';
import { PricingItem } from '../lib/types';

export function usePricing() {
    const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPricingItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/pricing');
            if (!res.ok) throw new Error('Failed to fetch pricing items');
            const data = await res.json();
            setPricingItems(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error loading pricing items');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPricingItems();
    }, [fetchPricingItems]);

    return { pricingItems, loading, error, refreshPricingItems: fetchPricingItems };
}
