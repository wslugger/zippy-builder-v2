import { useQuery } from '@tanstack/react-query';
import { EquipmentService } from '@/src/lib/firebase';
import { Equipment } from '@/src/lib/types';

export function useEquipment() {
    const {
        data: equipment = [],
        isLoading: loading,
        error,
        refetch: refreshEquipment
    } = useQuery<Equipment[], Error>({
        queryKey: ['equipment'],
        queryFn: EquipmentService.getAllEquipment,
        // Cache data for 5 minutes before considering it stale
        staleTime: 1000 * 60 * 5,
    });

    return { equipment, loading, error, refreshEquipment };
}
