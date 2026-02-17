import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MetadataPage from '@/src/app/admin/metadata/page';
import { MetadataService } from '@/src/lib/firebase';
import { CatalogMetadata } from '@/src/lib/types';
import '@testing-library/jest-dom';

// Mock MetadataService
jest.mock('@/src/lib/firebase', () => ({
    MetadataService: {
        getAllCatalogMetadata: jest.fn(),
        saveCatalogMetadata: jest.fn(),
        getCatalogMetadata: jest.fn(),
    },
    SystemDefaultsService: {
        getWorkflowSteps: jest.fn().mockResolvedValue([]),
        saveWorkflowSteps: jest.fn(),
    }
}));

describe('Feature Metadata Management', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('seeds feature defaults correctly', async () => {
        // Setup initial state: no metadata
        (MetadataService.getAllCatalogMetadata as jest.Mock).mockResolvedValue([]);
        (MetadataService.saveCatalogMetadata as jest.Mock).mockResolvedValue(undefined);

        // Simple alert mock
        window.alert = jest.fn();
        window.confirm = jest.fn(() => true);

        render(<MetadataPage />);

        // Wait for the button to appear
        const seedButton = await waitFor(() => screen.getByText("Seed Feature Defaults"));
        expect(seedButton).toBeInTheDocument();

        // Click it
        fireEvent.click(seedButton);

        // Verify saveCatalogMetadata was called with correct data
        await waitFor(() => {
            expect(MetadataService.saveCatalogMetadata).toHaveBeenCalledWith(expect.objectContaining({
                id: 'feature_catalog',
                fields: expect.objectContaining({
                    feature_categories: expect.objectContaining({
                        label: 'Feature Categories',
                        values: expect.arrayContaining(['Routing', 'Security', 'Management', 'SD-WAN', 'Monitoring']),
                    }),
                }),
            }));
        });
    });

    it('displays feature catalog in the list after seeding', async () => {
        const mockFeatureCatalog: CatalogMetadata = {
            id: 'feature_catalog',
            fields: {
                feature_categories: {
                    label: 'Feature Categories',
                    values: ['Routing', 'Security']
                }
            }
        };

        (MetadataService.getAllCatalogMetadata as jest.Mock).mockResolvedValue([mockFeatureCatalog]);

        render(<MetadataPage />);

        await waitFor(() => {
            expect(screen.getAllByText('feature_catalog').length).toBeGreaterThan(0);
        });
    });
});
