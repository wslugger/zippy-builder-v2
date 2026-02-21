import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EquipmentService } from '@/src/lib/firebase';
import { Equipment } from '@/src/lib/types';

/**
 * Example mutation hook for creating or updating equipment with optimistic updates.
 */
export function useCreateEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        // The actual function that performs the async request
        mutationFn: (newEquipment: Equipment) => {
            return EquipmentService.saveEquipment(newEquipment);
        },

        // Called immediately before the mutationFn runs
        onMutate: async (newEquipment) => {
            // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: ['equipment'] });

            // 2. Snapshot the previous value in case we need to roll back
            const previousEquipment = queryClient.getQueryData<Equipment[]>(['equipment']);

            // 3. Optimistically update the cache with the new item
            queryClient.setQueryData<Equipment[]>(['equipment'], (old = []) => {
                const optimisticItem: Equipment = {
                    ...newEquipment,
                    // Typically id is provided, if not we could generate a temp one.
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                return [...old.filter((e) => e.id !== newEquipment.id), optimisticItem];
            });

            // 4. Return the snapshotted value to use in onError if the mutation fails
            return { previousEquipment };
        },

        // Called if the mutation fails
        onError: (_err, _newEquipment, context) => {
            // Roll back to the previous snapshot
            if (context?.previousEquipment) {
                queryClient.setQueryData(['equipment'], context.previousEquipment);
            }
            console.error('Failed to save equipment item optimistically', _err);
        },

        // Called after success OR failure
        onSettled: () => {
            // Always invalidate the query to ensure we have the actual server state
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
        },
    });
}

