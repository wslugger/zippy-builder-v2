import { useSystemConfig } from '@/src/hooks/useSystemConfig';
import {
    VENDOR_IDS,
    EQUIPMENT_PURPOSES,
    CELLULAR_TYPES,
    WIFI_STANDARDS,
    SERVICE_CATEGORIES,
    DESIGN_OPTION_CATEGORIES,
    EQUIPMENT_STATUSES,
    INTERFACE_TYPES,
    POE_CAPABILITIES,
} from '@/src/lib/types';

export interface CatalogMetadata {
    regions: string[];
    siteTypes: string[];
    vendors: string[];
    purposes: string[];
    cellularTypes: string[];
    wifiStandards: string[];
    mountingOptions: string[];
    recommendedUseCases: string[];
    interfaceTypes: string[];
    featureCategories: string[];
    serviceCategories: string[];
    designOptionCategories: string[];
    statuses: string[];
    poeCapabilities: string[];
}

export function useCatalogMetadata() {
    const { config, isLoading: isLoadingConfig } = useSystemConfig();

    const getTaxonomyField = (key: string, fallback: readonly string[]): string[] => {
        const val = (config?.taxonomy as Record<string, string[]> | undefined)?.[key];
        if (Array.isArray(val) && val.length > 0) {
            return val;
        }
        return [...fallback];
    };

    const metadata: CatalogMetadata = {
        regions: getTaxonomyField('regions', []),
        siteTypes: getTaxonomyField('siteTypes', []),
        vendors: getTaxonomyField('vendors', VENDOR_IDS),
        purposes: getTaxonomyField('purposes', EQUIPMENT_PURPOSES).filter(p => EQUIPMENT_PURPOSES.includes(p as typeof EQUIPMENT_PURPOSES[number])),
        cellularTypes: getTaxonomyField('cellular_types', CELLULAR_TYPES),
        wifiStandards: getTaxonomyField('wifi_standards', WIFI_STANDARDS),
        mountingOptions: getTaxonomyField('mounting_options', []),
        recommendedUseCases: getTaxonomyField('recommended_use_cases', []),
        interfaceTypes: (() => {
            // Canonical types always come first; Firestore extras (admin-added) are appended.
            // Old-format values (e.g. "1G-Copper", "10G-Fiber") are stripped automatically.
            const DEPRECATED = /^(\d+G|mGig)-(Copper|Fiber)$/;
            const merged = [...INTERFACE_TYPES] as string[];
            getTaxonomyField('interface_types', []).forEach(t => {
                if (!DEPRECATED.test(t) && !merged.includes(t)) merged.push(t);
            });
            return merged;
        })(),
        featureCategories: getTaxonomyField('feature_categories', []),
        serviceCategories: getTaxonomyField('service_categories', SERVICE_CATEGORIES),
        designOptionCategories: getTaxonomyField('design_option_categories', DESIGN_OPTION_CATEGORIES),
        statuses: getTaxonomyField('statuses', EQUIPMENT_STATUSES),
        poeCapabilities: config?.validPoeTypes
            ? config.validPoeTypes.split(',').map(s => s.trim()).filter(Boolean)
            : [...POE_CAPABILITIES],
    };

    return {
        metadata,
        isLoading: isLoadingConfig,
    };
}
