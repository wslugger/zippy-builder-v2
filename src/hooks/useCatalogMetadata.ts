import { useState, useEffect } from 'react';
import { MetadataService } from '@/src/lib/firebase';
import { CatalogMetadata } from '@/src/lib/types';

export function useCatalogMetadata(catalogId: string) {
    const [metadata, setMetadata] = useState<CatalogMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await MetadataService.getCatalogMetadata(catalogId);
                setMetadata(data);
            } catch (e) {
                setError(e as Error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [catalogId]);

    return { metadata, loading, error };
}
