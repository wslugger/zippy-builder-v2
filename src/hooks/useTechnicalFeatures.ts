import { useState, useEffect } from 'react';
import { FeatureService } from '@/src/lib/firebase';
import { TechnicalFeature } from '@/src/lib/types';

export function useTechnicalFeatures() {
    const [features, setFeatures] = useState<TechnicalFeature[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await FeatureService.getAllFeatures();
                setFeatures(data);
            } catch (e) {
                setError(e as Error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const refreshFeatures = async () => {
        setLoading(true);
        try {
            const data = await FeatureService.getAllFeatures();
            setFeatures(data);
        } catch (e) {
            setError(e as Error);
        } finally {
            setLoading(false);
        }
    };

    return { features, loading, error, refreshFeatures };
}
