import { Package } from "./types";

export const SEED_PACKAGES: Package[] = [
    {
        id: "performance_sase",
        name: "Performance SASE",
        short_description: "High-performance security and networking bundle.",
        detailed_description: "Optimized for large branches requiring advanced security and high throughput.",
        active: true,
        items: [
            {
                service_id: "managed_sdwan",
                inclusion_type: "required",
                enabled_features: []
            },
            {
                service_id: "managed_lan",
                inclusion_type: "standard",
                enabled_features: []
            }
        ],
        throughput_basis: "sdwanCryptoThroughputMbps",
        throughput_overhead_mbps: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "cost_centric",
        name: "Cost Centric",
        short_description: "Value-optimized networking package.",
        detailed_description: "Efficient connectivity for small offices and retail locations.",
        active: true,
        items: [
            {
                service_id: "managed_sdwan",
                inclusion_type: "required",
                enabled_features: []
            }
        ],
        throughput_basis: "rawFirewallThroughputMbps",
        throughput_overhead_mbps: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
];
