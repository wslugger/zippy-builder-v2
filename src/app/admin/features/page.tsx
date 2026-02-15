"use client";

import { useServices } from "@/src/hooks/useServices";
import { usePackages } from "@/src/hooks/usePackages";
import { useTechnicalFeatures } from "@/src/hooks/useTechnicalFeatures";
import FeatureList from "@/src/components/admin/FeatureList";

export default function FeaturesPage() {
    const { features, loading: featuresLoading, refreshFeatures } = useTechnicalFeatures();
    const { services, loading: servicesLoading } = useServices();
    const { packages, loading: packagesLoading } = usePackages();

    const loading = featuresLoading || servicesLoading || packagesLoading;

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-zinc-500">Loading Features Catalog...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Feature Catalog</h1>
            <FeatureList
                features={features}
                services={services}
                packages={packages}
                onRefresh={refreshFeatures}
            />
        </div>
    );
}
