/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SpecsModal } from '@/src/app/sa/project/[id]/bom/SpecsModal';
import { Equipment } from '@/src/lib/types';

describe('Bug: LAN PoE Budget Display', () => {
    it('should display the correct PoE Budget even if poeStandard is missing but poeBudgetWatts is present', () => {
        const mockEquipment = {
            id: 'mock-lan-switch',
            family: 'Mock Family',
            model: 'MS130-48P-HW',
            vendor_id: 'Meraki',
            status: 'Supported',
            primary_purpose: 'LAN',
            role: 'LAN',
            description: 'Mock Switch',
            pricing: {
                purchasePrice: 1000,
                rentalPrice: 50,
            },
            specs: {
                poe_budget: 740,
                poeBudgetWatts: 740,
                poeBudget: 740,
                // Intentionally omitting poeStandard or setting it to undefined/empty string
            } as any
        } as unknown as Equipment;

        render(<SpecsModal item={mockEquipment} onClose={() => { }} />);

        // The PoE Budget section should show "740 W" instead of "None" if budget is available
        expect(screen.getByText('PoE Budget').nextElementSibling?.textContent).toBe('740 W');
    });

    it('should display None if no poeBudget is provided', () => {
        const mockEquipment = {
            id: 'mock-lan-switch-2',
            family: 'Mock Family',
            model: 'Mock-Non-PoE',
            vendor_id: 'Meraki',
            status: 'Supported',
            primary_purpose: 'LAN',
            role: 'LAN',
            description: 'Mock Switch',
            pricing: {
                purchasePrice: 1000,
                rentalPrice: 50,
            },
            specs: {
                // No PoE budget or standard
            } as any
        } as unknown as Equipment;

        render(<SpecsModal item={mockEquipment} onClose={() => { }} />);

        expect(screen.getByText('PoE Budget').nextElementSibling?.textContent).toBe('None');
    });
});
