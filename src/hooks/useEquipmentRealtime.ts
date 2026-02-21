import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Equipment } from '@/src/lib/types';

/**
 * Example hook demonstrating how to synchronize a Firestore real-time listener 
 * with React Query's cache.
 */
export function useEquipmentRealtime() {
    const queryClient = useQueryClient();
    const queryKey = useMemo(() => ['equipment', 'realtime'], []);

    // 1. Initialize the query with initial data or loading state if preferred.
    // We use useQuery to read the state from cache and trigger Suspense/ErrorBoundary if needed.
    const { data: equipment = [], isLoading, error } = useQuery<Equipment[], Error>({
        queryKey,
        // The queryFn doesn't fetch, it just resolves when data is populated by onSnapshot
        queryFn: () => {
            return new Promise<Equipment[]>((resolve) => {
                // If we already have data in cache, resolve immediately
                const existingData = queryClient.getQueryData<Equipment[]>(queryKey);
                if (existingData) {
                    resolve(existingData);
                }
                // Otherwise, the onSnapshot listener below will eventually set the data
            });
        },
        // We set staleTime to Infinity because the real-time listener will 
        // keep the cache perfectly synchronized.
        staleTime: Infinity,
    });

    useEffect(() => {
        // 2. Set up the Firestore listener
        const equipmentRef = collection(db, 'equipment');
        const q = query(equipmentRef);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const equipmentData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Equipment[];

                // 3. Update the React Query cache immediately when Firestore data changes
                queryClient.setQueryData(queryKey, equipmentData);
            },
            (err) => {
                // Handle any listener errors
                queryClient.setQueryData(queryKey, []);
                // By throwing/setting error, we can hook into RQ error boundaries
                console.error('Real-time listener error:', err);
            }
        );

        // 4. Cleanup the listener when the component unmounts
        return () => {
            unsubscribe();
        };
    }, [queryClient, queryKey]);

    return { equipment, isLoading, error };
}
