import { useState, useEffect, useCallback } from 'react';
import { ServiceService } from '@/src/lib/firebase';
import { Service } from '@/src/lib/types';

export function useServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await ServiceService.getAllServices();
            setServices(data);
        } catch (e) {
            setError(e as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { services, loading, error, refreshServices: load };
}
