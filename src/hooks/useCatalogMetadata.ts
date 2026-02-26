import { useSystemConfig } from '@/src/hooks/useSystemConfig';
import {
    VENDOR_IDS,
    EQUIPMENT_PURPOSES,
    CELLULAR_TYPES,
    WIFI_STANDARDS,
    SERVICE_CATEGORIES,
    DESIGN_OPTION_CATEGORIES,
    EQUIPMENT_STATUSES,
} from '@/src/lib/types';

export function useCatalogMetadata() {
    const { config, isLoading: isLoadingConfig } = useSystemConfig();

    const getTaxonomyField = (key: string, fallback: readonly string[]): string[] => {
        const val = (config?.taxonomy as Record<string, string[]> | undefined)?.[key];
        if (Array.isArray(val) && val.length > 0) {
            return val;
        }
        return [...fallback];
    };

    const metadata = {
        regions: getTaxonomyField('regions', []),
        siteTypes: getTaxonomyField('siteTypes', []),
        vendors: getTaxonomyField('vendors', VENDOR_IDS),
        purposes: getTaxonomyField('purposes', EQUIPMENT_PURPOSES),
        cellularTypes: getTaxonomyField('cellular_types', CELLULAR_TYPES),
        wifiStandards: getTaxonomyField('wifi_standards', WIFI_STANDARDS),
        mountingOptions: getTaxonomyField('mounting_options', []),
        recommendedUseCases: getTaxonomyField('recommended_use_cases', []),
        interfaceTypes: getTaxonomyField('interface_types', []),
        featureCategories: getTaxonomyField('feature_categories', []),
        serviceCategories: getTaxonomyField('service_categories', SERVICE_CATEGORIES),
        designOptionCategories: getTaxonomyField('design_option_categories', DESIGN_OPTION_CATEGORIES),
        statuses: getTaxonomyField('statuses', EQUIPMENT_STATUSES),
    };

    return {
        metadata,
        isLoading: isLoadingConfig,
    };
}
