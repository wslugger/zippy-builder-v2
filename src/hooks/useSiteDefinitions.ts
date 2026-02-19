import { useState, useEffect, useCallback } from 'react';
import { SiteDefinitionService } from '@/src/lib/firebase';
import { SiteType } from '@/src/lib/types';

export function useSiteDefinitions() {
    const [siteDefinitions, setSiteDefinitions] = useState<SiteType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await SiteDefinitionService.getAllSiteDefinitions();
            setSiteDefinitions(data);
        } catch (e) {
            setError(e as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { siteDefinitions, loading, error, refreshSiteDefinitions: load };
}
