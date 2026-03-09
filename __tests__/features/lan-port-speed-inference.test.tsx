import { render, screen, fireEvent } from '@testing-library/react';
import { LANIntentCollector } from '@/src/components/sa/lan/LANIntentCollector';
import { Site } from '@/src/lib/types';

describe('LANIntentCollector Port Speed Inference', () => {
    const mockSite: Site = {
        name: 'Test Site',
        address: '123 Test St',
        userCount: 10,
        bandwidthDownMbps: 100,
        bandwidthUpMbps: 100,
        redundancyModel: 'Single CPE',
        wanLinks: 1,
        lanPorts: 10,
        poePorts: 5,
        indoorAPs: 2,
        outdoorAPs: 0,
        primaryCircuit: 'DIA',
        lanRequirements: {
            needsManualReview: false
        }
    };

    const mockOnRequirementsChange = jest.fn();
    const mockOnOpenCatalog = jest.fn();
    const mockOnChipsChange = jest.fn();

    it('should infer RJ45-2.5G when Wi-Fi 6E is selected', () => {
        const { rerender } = render(
            <LANIntentCollector
                site={mockSite}
                onRequirementsChange={mockOnRequirementsChange}
                onOpenCatalog={mockOnOpenCatalog}
                selectedChips={['aps']}
                onChipsChange={mockOnChipsChange}
            />
        );

        // Find and click Wi-Fi 6E button
        const wifi6EButton = screen.getByText('Wi-Fi 6E');
        fireEvent.click(wifi6EButton);

        // check requirements change call
        expect(mockOnRequirementsChange).toHaveBeenCalledWith(expect.objectContaining({
            accessPortType: 'RJ45-2.5G',
            apWifiStandard: 'Wi-Fi 6E'
        }));
    });

    it('should infer RJ45-10G when 10G Workstations are selected', () => {
         render(
            <LANIntentCollector
                site={mockSite}
                onRequirementsChange={mockOnRequirementsChange}
                onOpenCatalog={mockOnOpenCatalog}
                selectedChips={['workstations']}
                onChipsChange={mockOnChipsChange}
            />
        );

        // Find and click 10G speed button
        const speed10GButton = screen.getByText('10G');
        fireEvent.click(speed10GButton);

        expect(mockOnRequirementsChange).toHaveBeenCalledWith(expect.objectContaining({
            accessPortType: 'RJ45-10G',
            highSpeedWorkstations: '10G'
        }));
    });
});
