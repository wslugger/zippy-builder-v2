/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import EquipmentTable from '@/src/components/admin/EquipmentTable';
import { Equipment } from '@/src/lib/types';

describe('poe_budget in Equipment Catalog', () => {
    it('shows poe_budget of 0W if provided as 0 in LAN equipment', () => {
        const mockData: Equipment[] = [
            {
                id: 'switch1',
                model: 'Switch Model X',
                make: 'TestMake',
                family: 'SwitchFamily',
                vendor_id: 'cisco_catalyst',
                primary_purpose: 'LAN',
                role: 'LAN',
                specs: {
                    poe_budget: 0,
                    ports: 24,
                }
            } as any
        ];

        render(
            <EquipmentTable
                data={mockData}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                selectedIds={new Set()}
                onSelectionChange={jest.fn()}
                onBulkDelete={jest.fn()}
            />
        );

        // We should see "0W" for poe budget based on EquipmentTable logic
        expect(screen.getByText('0W')).toBeInTheDocument();
    });

    it('shows poe_budget fallback if defined as poeBudgetWatts', () => {
        const mockData: Equipment[] = [
            {
                id: 'switch2',
                model: 'Switch Model Y',
                make: 'TestMake',
                family: 'SwitchFamily',
                vendor_id: 'meraki',
                primary_purpose: 'LAN',
                role: 'LAN',
                specs: {
                    poeBudgetWatts: 370,
                    ports: 48,
                }
            } as any
        ];

        render(
            <EquipmentTable
                data={mockData}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                selectedIds={new Set()}
                onSelectionChange={jest.fn()}
                onBulkDelete={jest.fn()}
            />
        );

        expect(screen.getByText('370W')).toBeInTheDocument();
    });
});
