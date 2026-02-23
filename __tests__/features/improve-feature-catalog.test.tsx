import { render, screen, fireEvent } from '@testing-library/react';
import FeatureList from '@/src/components/admin/FeatureList';
import { TechnicalFeature, Service, Package } from '@/src/lib/types';
import '@testing-library/jest-dom';

const mockFeatures: TechnicalFeature[] = [
    { id: 'bgp', name: 'BGP Routing', category: 'Routing', description: 'Border Gateway Protocol' },
    { id: 'ha', name: 'High Availability', category: 'General', description: 'Dual path capability' },
];

const mockServices: Service[] = [
    {
        id: 'sd-wan-service',
        name: 'SD-WAN',
        supported_features: ['bgp'],
        service_options: [],
        active: true,
        short_description: 'SD-WAN service',
        detailed_description: 'Detailed SD-WAN service',
        caveats: [],
        assumptions: [],
        metadata: { category: 'Connectivity' }
    }
];

const mockPackages: Package[] = [
    {
        id: 'premium-package',
        name: 'Premium SD-WAN',
        items: [
            {
                service_id: 'sd-wan-service',
                enabled_features: [{ feature_id: 'ha', inclusion_type: 'standard' }],
                inclusion_type: 'standard'
            }
        ],
        active: true,
        short_description: 'Premium package',
        detailed_description: 'Detailed premium package',
        collateral: []
    }
];

jest.mock('@/src/hooks/useSystemConfig', () => ({
    useSystemConfig: () => ({
        config: { taxonomy: { feature_categories: ['Routing', 'Security', 'General'] } },
        isLoading: false,
    })
}));

describe('FeatureList Improvements', () => {
    it('shows linked items when usage badge is clicked', () => {
        render(
            <FeatureList
                features={mockFeatures}
                services={mockServices}
                packages={mockPackages}
                onRefresh={() => { }}
            />
        );

        // Find the '1 Links' badge for BGP
        const bgpRow = screen.getByText('BGP Routing').closest('tr');
        const bgpLinks = screen.getAllByText(/1 Links/i).find(el => bgpRow?.contains(el));

        expect(bgpLinks).toBeInTheDocument();
        fireEvent.click(bgpLinks!);

        // Expect to see the service name 'SD-WAN'
        expect(screen.getByText('SD-WAN')).toBeInTheDocument();
        expect(screen.getByText('(Service)')).toBeInTheDocument();
    });

    it('shows granular service option links', () => {
        // Add a service option that uses 'ha' feature
        const granularServices: Service[] = [
            {
                ...mockServices[0],
                service_options: [
                    {
                        id: 'opt1',
                        name: 'Option 1',
                        short_description: 'Option 1 description',
                        detailed_description: 'Detailed description',
                        supported_features: ['ha'],
                        design_options: [],
                        caveats: [],
                        assumptions: []
                    }
                ]
            }
        ];

        render(
            <FeatureList
                features={mockFeatures}
                services={granularServices}
                packages={mockPackages}
                onRefresh={() => { }}
            />
        );

        // Find 'High Availability' row (id: ha)
        // Check usage count (should include Option 1 + Package)
        const haRow = screen.getByText('High Availability').closest('tr');
        const haLinks = screen.getAllByText(/Links/i).find(el => haRow?.contains(el)); // Find any links badge in this row
        expect(haLinks).toBeInTheDocument();

        fireEvent.click(haLinks!);

        expect(screen.getByText('Option 1')).toBeInTheDocument();
        expect(screen.getByText('(Service Option)')).toBeInTheDocument();
        expect(screen.getByText(/in SD-WAN/)).toBeInTheDocument();
    });

    it('toggles column visibility correctly', () => {
        render(
            <FeatureList
                features={mockFeatures}
                services={mockServices}
                packages={mockPackages}
                onRefresh={() => { }}
            />
        );

        // Check if 'Description' column is visible initially
        expect(screen.getByText('Border Gateway Protocol')).toBeInTheDocument();

        // Open columns dropdown (we will implement this)
        const columnsButton = screen.getByText(/Columns/i);
        fireEvent.click(columnsButton);

        // Toggle 'Description' off
        const descriptionToggle = screen.getByLabelText(/Description/i);
        fireEvent.click(descriptionToggle);

        // 'Description' should be gone (or hidden)
        expect(screen.queryByText('Border Gateway Protocol')).not.toBeInTheDocument();
    });
});
