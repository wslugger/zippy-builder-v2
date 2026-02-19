import { useState, useEffect, useCallback } from 'react';
import { BOMService } from '@/src/lib/firebase';
import { BOMLogicRule } from '@/src/lib/types';

export function useBOMRules() {
    const [rules, setRules] = useState<BOMLogicRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await BOMService.getAllRules();
            setRules(data);
        } catch (e) {
            setError(e as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { rules, loading, error, refreshRules: load };
}
