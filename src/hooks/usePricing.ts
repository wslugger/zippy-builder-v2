import { useQuery } from '@tanstack/react-query';
import { PricingItem } from '../lib/types';

export function usePricing() {
    const { data: pricingItems = [], isLoading: loading, error, refetch } = useQuery<PricingItem[]>({
        queryKey: ['pricing-items'],
        queryFn: async () => {
            const res = await fetch('/api/admin/pricing');
            if (!res.ok) throw new Error('Failed to fetch pricing items');
            return res.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    return {
        pricingItems,
        loading,
        error: error ? (error as Error).message : null,
        refreshPricingItems: refetch
    };
}
