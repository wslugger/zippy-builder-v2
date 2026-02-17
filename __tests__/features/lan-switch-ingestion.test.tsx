import { EquipmentSchema } from '@/src/lib/types';

describe('LAN Switch Specifications Schema', () => {
    it('successfully validates a Catalyst 9200 configuration with all new fields', () => {
        const validCatalyst = {
            id: 'cisco_catalyst_9200l_24p_4g',
            model: 'C9200L-24P-4G',
            active: true,
            status: 'Supported',
            vendor_id: 'cisco_catalyst',
            purpose: ['LAN'],
            family: 'Catalyst 9200',
            description: 'Catalyst 9200L 24-port PoE+, 4 x 1G, Network Essentials',
            specs: {
                ports: 24,
                poe_budget: 370,
                rack_units: 1,
                mounting_options: ['Rack'],
                stacking_supported: true,
                stacking_bandwidth_gbps: 80,
                forwarding_rate_mpps: 41.66,
                switching_capacity_gbps: 56,
                primary_power_supply: 'PWR-C5-600WAC',
                secondary_power_supply: 'n/a',
                poe_capabilities: 'PoE+',
                power_load_max_watts: 450
            }
        };

        const result = EquipmentSchema.safeParse(validCatalyst);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.specs.stacking_supported).toBe(true);
            expect(result.data.specs.stacking_bandwidth_gbps).toBe(80);
            expect(result.data.specs.forwarding_rate_mpps).toBe(41.66);
            expect(result.data.specs.switching_capacity_gbps).toBe(56);
            expect(result.data.specs.primary_power_supply).toBe('PWR-C5-600WAC');
        }
    });

    it('works with minimal fields for backward compatibility', () => {
        const minimalDevice = {
            id: 'generic_switch',
            model: 'Generic 1G',
            vendor_id: 'cisco_catalyst',
            purpose: ['LAN'],
            specs: {
                ports: 8
            }
        };

        const result = EquipmentSchema.safeParse(minimalDevice);
        expect(result.success).toBe(true);
    });
});
