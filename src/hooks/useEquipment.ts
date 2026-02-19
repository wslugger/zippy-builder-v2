import { useState, useEffect, useCallback } from 'react';
import { EquipmentService } from '@/src/lib/firebase';
import { Equipment } from '@/src/lib/types';

export function useEquipment() {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await EquipmentService.getAllEquipment();
            setEquipment(data);
        } catch (e) {
            setError(e as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { equipment, loading, error, refreshEquipment: load };
}
