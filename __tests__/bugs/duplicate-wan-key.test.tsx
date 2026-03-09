import React from 'react';
import { render } from '@testing-library/react';
import EquipmentTable from '@/src/components/admin/EquipmentTable';
import { Equipment } from '@/src/lib/types';

describe('EquipmentTable Duplicate Key Bug', () => {
    it('should not throw or warn when equipment has duplicate purposes', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const mockEquipment: Equipment[] = [
            ({
                id: 'test-device',
                model: 'Test Model',
                make: 'Test Make',
                vendor_id: 'meraki',
                primary_purpose: 'WAN',
                additional_purposes: ['WAN'], // Duplicate purpose
                family: 'Test Family',
                active: true,
                status: 'Supported',
                role: 'WAN',
                specs: {},
            } as unknown) as Equipment
        ];

        render(
            <EquipmentTable
                data={mockEquipment}
                onEdit={() => { }}
                onDelete={() => { }}
            />
        );

        // Check if console.error was called with the key warning
        const keyWarning = consoleSpy.mock.calls.find(call =>
            typeof call[0] === 'string' && call[0].includes('Encountered two children with the same key')
        );

        expect(keyWarning).toBeUndefined();

        consoleSpy.mockRestore();
    });
});
