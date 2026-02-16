import { render, screen, fireEvent } from '@testing-library/react';
import FeatureList from '@/src/components/admin/FeatureList';
import { TechnicalFeature, Service, Package } from '@/src/lib/types';
import '@testing-library/jest-dom';

const mockFeatures: TechnicalFeature[] = [
    { id: 'bgp', name: 'BGP Routing', category: 'Routing', description: 'Border Gateway Protocol' },
    { id: 'ha', name: 'High Availability', category: 'General', description: 'Dual path' },
    { id: 'fw', name: 'Next-Gen Firewall', category: 'Security', description: 'L7 inspection' },
];

const mockServices: Service[] = [];
const mockPackages: Package[] = [];

describe('FeatureList Search', () => {
    it('filters features by name correctly', () => {
        render(
            <FeatureList
                features={mockFeatures}
                services={mockServices}
                packages={mockPackages}
                onRefresh={() => { }}
            />
        );

        const searchInput = screen.getByPlaceholderText(/search features/i);

        // Initial state
        expect(screen.getByText('BGP Routing')).toBeInTheDocument();
        expect(screen.getByText('High Availability')).toBeInTheDocument();

        // Search for 'Firewall'
        fireEvent.change(searchInput, { target: { value: 'Firewall' } });

        expect(screen.getByText('Next-Gen Firewall')).toBeInTheDocument();
        expect(screen.queryByText('BGP Routing')).not.toBeInTheDocument();
        expect(screen.queryByText('High Availability')).not.toBeInTheDocument();
    });

    it('filters features by category correctly', () => {
        render(
            <FeatureList
                features={mockFeatures}
                services={mockServices}
                packages={mockPackages}
                onRefresh={() => { }}
            />
        );

        const searchInput = screen.getByPlaceholderText(/search features/i);

        // Search for category 'Routing'
        fireEvent.change(searchInput, { target: { value: 'Routing' } });

        expect(screen.getByText('BGP Routing')).toBeInTheDocument();
        expect(screen.queryByText('Next-Gen Firewall')).not.toBeInTheDocument();
    });

    it('shows empty state when no matches found', () => {
        render(
            <FeatureList
                features={mockFeatures}
                services={mockServices}
                packages={mockPackages}
                onRefresh={() => { }}
            />
        );

        const searchInput = screen.getByPlaceholderText(/search features/i);

        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

        expect(screen.getByText(/no features found/i)).toBeInTheDocument();
    });
});
