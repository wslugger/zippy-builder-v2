import { render, screen, fireEvent } from '@testing-library/react';
import { LANTab } from '@/src/app/sa/project/[id]/bom/LANTab';
import { Site, Equipment } from '@/src/lib/types';
import { BOMLineItem } from '@/src/lib/bom-types';
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

    it('shows all switches in alphabetical order if no PoE is required', () => {
        // Need at least one selection to show the dropdown
        const props = {
            ...defaultProps,
            manualSelections: { "Test Site:managed_lan": [{ itemId: "poe_switch", quantity: 1 }] }
        };
        render(<LANTab {...props} />);
        const dropdown = screen.getByRole('combobox');
        const options = Array.from(dropdown.querySelectorAll('option'));
        const labels = options.map(o => o.textContent);

        // Sorting: "Non-PoE Switch" (N) should be before "PoE Switch" (P) if no PoE requirement
        expect(labels[0]).toContain("Non-PoE Switch");
        expect(labels[1]).toContain("PoE Switch");
    });

    it('prioritizes PoE switches if poePorts requirement is set', () => {
        const poeSite = { ...mockSite, poePorts: 5 };
        const props = {
            ...defaultProps,
            selectedSite: poeSite,
            manualSelections: { "Test Site:managed_lan": [{ itemId: "poe_switch", quantity: 1 }] }
        };
        render(<LANTab {...props} />);
        const dropdown = screen.getByRole('combobox');
        const options = Array.from(dropdown.querySelectorAll('option'));
        const labels = options.map(o => o.textContent);

        // Sorting: "PoE Switch" should be first because site requires PoE
        expect(labels[0]).toContain("PoE Switch");
        expect(labels[1]).toContain("Non-PoE Switch");
    });

    it('displays multiple selected switches in the BOM output', () => {
        const lanItems = [
            { id: '1', itemId: 'poe_switch', itemName: 'PoE Switch', serviceName: 'Managed LAN', itemType: 'equipment', quantity: 2, serviceId: 'managed_lan', siteName: 'Test Site', matchedRules: [], reasoning: 'Manual Selection' },
            { id: '2', itemId: 'non_poe_switch', itemName: 'Non-PoE Switch', serviceName: 'Managed LAN', itemType: 'equipment', quantity: 1, serviceId: 'managed_lan', siteName: 'Test Site', matchedRules: [], reasoning: 'Manual Selection' }
        ];
        render(<LANTab {...defaultProps} lanItems={lanItems as BOMLineItem[]} />);

        expect(screen.getByText('PoE Switch')).toBeInTheDocument();
        expect(screen.getByText('Non-PoE Switch')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows a review banner for sites where lanRequirements.needsManualReview is true', () => {
        const reviewSite = { ...mockSite, lanRequirements: { needsManualReview: true as const } };
        render(<LANTab {...defaultProps} selectedSite={reviewSite} />);
        expect(screen.getByText(/LAN Requirements Need Review/i)).toBeInTheDocument();
        expect(screen.getByText(/Review Now/i)).toBeInTheDocument();
    });

    it('shows a green requirements badge for sites with auto-filled lanRequirements', () => {
        const autoSite = {
            ...mockSite,
            lanRequirements: {
                accessPortType: '1G-Copper',
                uplinkPortType: '10G-Fiber',
                poeCapabilities: 'PoE+',
                needsManualReview: false as const,
            },
        };
        render(<LANTab {...defaultProps} selectedSite={autoSite} />);
        expect(screen.getByText(/LAN Requirements Set/i)).toBeInTheDocument();
        expect(screen.getByText(/1G-Copper/i)).toBeInTheDocument();
    });
});
