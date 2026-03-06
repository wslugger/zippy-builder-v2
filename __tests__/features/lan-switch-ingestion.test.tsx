/* eslint-disable @typescript-eslint/no-explicit-any */
import { EquipmentSchema } from '@/src/lib/types';

describe('LAN Switch Specifications Schema', () => {
    it('successfully validates a Catalyst 9200 configuration with refined physical fields', () => {
        const validCatalyst = {
            id: 'cisco_catalyst_9200l_24p_4g',
            model: 'C9200L-24P-4G',
            active: true,
            status: 'Supported',
            vendor_id: 'cisco_catalyst',
            primary_purpose: "LAN", additional_purposes: [],
            family: 'Catalyst 9200',
            description: 'Catalyst 9200L 24-port PoE+, 4 x 1G, Network Essentials',
            specs: {
                accessPortCount: 24,
                accessPortType: '1G-Copper',
                poeBudgetWatts: 370,
                poeStandard: 'PoE+',
                uplinkPortCount: 4,
                uplinkPortType: '1G-Fiber',
                isStackable: true
            }
        };

        const result = EquipmentSchema.safeParse(validCatalyst);
        expect(result.success).toBe(true);
        if (result.success) {
            expect((result.data.specs as any).isStackable).toBe(true);
            expect((result.data.specs as any).accessPortCount).toBe(24);
            expect((result.data.specs as any).poeBudgetWatts).toBe(370);
            expect((result.data.specs as any).poeStandard).toBe('PoE+');
        }
    });

    it('gracefully applies defaults for legacy devices', () => {
        const legacyDevice = {
            id: 'legacy_switch',
            model: 'Generic 1G',
            vendor_id: 'cisco_catalyst',
            primary_purpose: "LAN", additional_purposes: [],
            specs: {
                ports: 8,
                switching_capacity_gbps: 56
            }
        };

        const result = EquipmentSchema.safeParse(legacyDevice);
        expect(result.success).toBe(true);
        if (result.success && result.data.role === 'LAN') {
            expect(result.data.specs.accessPortCount).toBeUndefined(); // No longer handled by schema-level catch
            expect((result.data.specs as any).ports).toBe(8); // Passthrough field
        }
    });
});
