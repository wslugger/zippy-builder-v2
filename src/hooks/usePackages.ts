import { useState, useEffect } from 'react';
import { PackageService } from '@/src/lib/firebase';
import { Package } from '@/src/lib/types';

export function usePackages() {
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    async function load() {
        setLoading(true);
        try {
            const data = await PackageService.getAllPackages();
            setPackages(data);
        } catch (e) {
            setError(e as Error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    return {
        packages,
        loading,
        error,
        refreshPackages: load
    };
}
