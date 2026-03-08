/* eslint-disable @typescript-eslint/no-explicit-any */
import { EquipmentSchema } from '@/src/lib/types';

describe('WAN Cellular Support Schema', () => {
    it('validates equipment with integrated cellular', () => {
        const mx68cw = {
            id: 'meraki_mx68cw',
            model: 'MX68CW',
            vendor_id: 'meraki',
            primary_purpose: 'WAN',
            role: 'WAN',
            specs: {
                rawFirewallThroughputMbps: 450,
                sdwanCryptoThroughputMbps: 200,
                integrated_cellular: true,
                cellular_type: 'LTE'
            },
            active: true,
            status: 'Supported'
        };

        const result = EquipmentSchema.safeParse(mx68cw);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.specs.integrated_cellular).toBe(true);
            expect(result.data.specs.cellular_type).toBe('LTE');
        }
    });

    it('validates equipment with modular cellular (PIM)', () => {
        const c8151 = {
            id: 'cisco_catalyst_c8151g2',
            model: 'C8151-G2',
            vendor_id: 'cisco_catalyst',
            primary_purpose: 'WAN',
            role: 'WAN',
            specs: {
                rawFirewallThroughputMbps: 1000,
                modular_cellular: true,
                cellular_type: '5G'
            },
            active: true,
            status: 'Supported'
        };

        const result = EquipmentSchema.safeParse(c8151);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.specs.modular_cellular).toBe(true);
            expect(result.data.specs.cellular_type).toBe('5G');
        }
    });

    it('handles missing cellular fields as nullish/undefined per schema', () => {
        const standardMX = {
            id: 'meraki_mx85',
            model: 'MX85',
            vendor_id: 'meraki',
            primary_purpose: 'WAN',
            role: 'WAN',
            specs: {
                rawFirewallThroughputMbps: 1000
            },
            active: true,
            status: 'Supported'
        };

        const result = EquipmentSchema.safeParse(standardMX);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.specs.integrated_cellular).toBeUndefined();
            expect(result.data.specs.modular_cellular).toBeUndefined();
        }
    });
});
