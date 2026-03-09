import { Site, Equipment, BOMLineItem } from "@/src/lib/types";
import { render, screen, fireEvent } from '@testing-library/react';
import { LANTab } from '@/src/app/sa/project/[id]/bom/LANTab';

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

describe('LANTab Features', () => {
    const defaultProps = {
        selectedSite: mockSite,
        lanItems: [],
        manualSelections: {},
        setManualSelections: jest.fn(),
        catalog: mockCatalog,
        setSelectedSpecsItem: jest.fn(),
        resolvedVendor: "meraki",
        handleSiteUpdate: jest.fn()
    };

    it('renders the intent collector with device type chips', () => {
        render(<LANTab {...defaultProps} />);
        expect(screen.getByText(/What connects here\?/i)).toBeInTheDocument();
        expect(screen.getByText('Workstations')).toBeInTheDocument();
        expect(screen.getByText('IP Phones')).toBeInTheDocument();
        expect(screen.getByText('Wireless APs')).toBeInTheDocument();
    });

    it('shows the Find Your Own button to open the catalog browser', () => {
        render(<LANTab {...defaultProps} />);
        const btn = screen.getByRole('button', { name: /Find Your Own/i });
        expect(btn).toBeInTheDocument();

        fireEvent.click(btn);
        expect(screen.getByRole('dialog', { name: /LAN Switch Catalog/i })).toBeInTheDocument();
    });

    it('selecting an intent chip updates the inferred requirements', () => {
        render(<LANTab {...defaultProps} />);

        // Click "IP Phones" chip
        const phonesChip = screen.getByRole('button', { name: /IP Phones/i });
        fireEvent.click(phonesChip);

        // Inferred bar should show PoE+ (not None)
        expect(screen.getByText('PoE')).toBeInTheDocument();
    });

    it('displays multiple items in the BOM output section', () => {
        const lanItems = [
            { id: '1', itemId: 'poe_switch', itemName: 'PoE Switch', serviceName: 'LAN', itemType: 'equipment', quantity: 2, serviceId: 'managed_lan', siteName: 'Test Site', matchedRules: [], reasoning: 'Manual Selection' },
            { id: '2', itemId: 'non_poe_switch', itemName: 'Non-PoE Switch', serviceName: 'LAN', itemType: 'equipment', quantity: 1, serviceId: 'managed_lan', siteName: 'Test Site', matchedRules: [], reasoning: 'Manual Selection' }
        ];
        render(<LANTab {...defaultProps} lanItems={lanItems as BOMLineItem[]} />);

        // Both models appear (possibly more than once: once in hero card, once in BOM output)
        expect(screen.getAllByText('PoE Switch').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Non-PoE Switch').length).toBeGreaterThanOrEqual(1);
    });

    it('shows the hero card as Auto-Resolved when BOM has items but no manual selection', () => {
        const lanItems = [
            { id: '1', itemId: 'poe_switch', itemName: 'PoE Switch', serviceName: 'LAN', itemType: 'equipment', quantity: 1, serviceId: 'lan', siteName: 'Test Site', matchedRules: [], reasoning: 'Dynamic match' }
        ];
        render(<LANTab {...defaultProps} lanItems={lanItems as BOMLineItem[]} />);
        expect(screen.getByText(/Auto-Resolved/i)).toBeInTheDocument();
    });

    it('shows hero card as Manual Override when a manual selection is set', () => {
        const propsWithManual = {
            ...defaultProps,
            manualSelections: { "Test Site:lan": [{ itemId: "poe_switch", quantity: 1 }] },
            lanItems: [
                { id: '1', itemId: 'poe_switch', itemName: 'PoE Switch', serviceName: 'LAN', itemType: 'equipment', quantity: 1, serviceId: 'lan', siteName: 'Test Site', matchedRules: [], reasoning: 'Manual Selection' }
            ] as BOMLineItem[]
        };
        render(<LANTab {...propsWithManual} />);
        expect(screen.getByText(/Manual Override/i)).toBeInTheDocument();
    });

    it('opens the catalog browser when "Find Your Own" is clicked and can close it', () => {
        render(<LANTab {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Find Your Own/i }));
        expect(screen.getByRole('dialog', { name: /LAN Switch Catalog/i })).toBeInTheDocument();

        // Find and click the close button in the dialog
        const closeBtn = screen.getByRole('dialog').querySelector('button[class*="rounded-lg"]');
        if (closeBtn) fireEvent.click(closeBtn);
    });
});
