import { Service, Package } from "@/src/lib/types";

// Helper type for where a feature is used
interface FeatureUsage {
    serviceId: string;
    serviceName: string;
    type: 'Service' | 'Service Option' | 'Design Option' | 'Package';
    itemName: string; // The specific option/package name
}

export function getFeatureUsage(
    featureId: string,
    services: Service[],
    packages: Package[]
): FeatureUsage[] {
    const usage: FeatureUsage[] = [];

    // 1. Check Services (top-level)
    services.forEach(service => {
        if (service.supported_features?.includes(featureId)) {
            usage.push({
                serviceId: service.id,
                serviceName: service.name,
                type: 'Service',
                itemName: service.name
            });
        }

        // 2. Check Service Options
        service.service_options?.forEach(option => {
            // Assuming ServiceOption has supported_features too (if inherited or explicit)
            // Based on current types, ServiceOption extends ServiceItem which has supported_features
            if (option.supported_features?.includes(featureId)) {
                usage.push({
                    serviceId: service.id,
                    serviceName: service.name,
                    type: 'Service Option',
                    itemName: option.name
                });
            }

            // 3. Check Design Options
            option.design_options?.forEach(designOpt => {
                if (designOpt.supported_features?.includes(featureId)) {
                    usage.push({
                        serviceId: service.id,
                        serviceName: service.name,
                        type: 'Design Option',
                        itemName: designOpt.name
                    });
                }
            });
        });
    });

    // 4. Check Packages
    packages.forEach(pkg => {
        // A package item enables a feature for a specific service/option
        pkg.items.forEach(item => {
            if (item.enabled_features?.includes(featureId)) {
                // Find the service name for context
                const service = services.find(s => s.id === item.service_id);
                usage.push({
                    serviceId: pkg.id,
                    serviceName: pkg.name, // Using package name as 'serviceName' context here
                    type: 'Package',
                    itemName: `${pkg.name} (${service?.name || item.service_id})`
                });
            }
        });
    });

    return usage;
}
