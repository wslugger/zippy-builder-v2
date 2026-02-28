import { render, screen } from '@testing-library/react';
import { LANTab } from '@/src/app/sa/project/[id]/bom/LANTab';
import { Site, Equipment } from '@/src/lib/types';
import '@testing-library/jest-dom';

const mockSite: Site = {
    id: "site1",
    name: "Test Site",
    address: "123 Test St",
    userCount: 10,
    bandwidthDownMbps: 100,
    bandwidthUpMbps: 100,
    redundancyModel: "Single CPE",
    wanLinks: 1,
    lanPorts: 10,
    poePorts: 0,
    indoorAPs: 0,
    outdoorAPs: 0,
    primaryCircuit: "DIA",
};

const mockCatalog: Equipment[] = [
    {
        id: "poe_switch",
        model: "PoE Switch",
        vendor_id: "meraki",
        role: "LAN",
        primary_purpose: "LAN",
        additional_purposes: [],
        active: true,
        status: "Supported",
        specs: {
            accessPortCount: 24,
            accessPortType: "1G-Copper",
            poeBudgetWatts: 370,
            poe_capabilities: "PoE+",
            uplinkPortCount: 4,
            uplinkPortType: "10G-Fiber",
            isStackable: true
        }
    },
    {
        id: "non_poe_switch",
        model: "Non-PoE Switch",
        vendor_id: "meraki",
        role: "LAN",
        primary_purpose: "LAN",
        additional_purposes: [],
        active: true,
        status: "Supported",
        specs: {
            accessPortCount: 24,
            accessPortType: "1G-Copper",
            poeBudgetWatts: 0,
            poe_capabilities: "None",
            uplinkPortCount: 4,
            uplinkPortType: "10G-Fiber",
            isStackable: true
        }
    }
];

describe('LANTab PoE Filter', () => {
    const defaultProps = {
        selectedSite: mockSite,
        manualSelections: {},
        setManualSelections: jest.fn(),
        catalog: mockCatalog,
        setSelectedSpecsItem: jest.fn(),
        resolvedVendor: "meraki"
    };

    it('shows all switches if no PoE is required', () => {
        render(<LANTab {...defaultProps} />);
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(3);
        const labels = options.map(o => o.textContent);
        expect(labels.some(l => l?.includes("PoE Switch"))).toBe(true);
        expect(labels.some(l => l?.includes("Non-PoE Switch"))).toBe(true);
    });

    it('shows only PoE switches if poePorts requirement is set', () => {
        const poeSite = { ...mockSite, poePorts: 5 };
        render(<LANTab {...defaultProps} selectedSite={poeSite} />);
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(2);
        const labels = options.map(o => o.textContent);
        expect(labels.some(l => l?.includes("PoE Switch"))).toBe(true);
        expect(labels.some(l => l?.includes("Non-PoE Switch"))).toBe(false);
    });

    it('shows only PoE switches if requiredPoePorts requirement is set', () => {
        const poeSite = { ...mockSite, requiredPoePorts: 5 };
        render(<LANTab {...defaultProps} selectedSite={poeSite} />);
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(2);
        const labels = options.map(o => o.textContent);
        expect(labels.some(l => l?.includes("PoE Switch"))).toBe(true);
        expect(labels.some(l => l?.includes("Non-PoE Switch"))).toBe(false);
    });
});
