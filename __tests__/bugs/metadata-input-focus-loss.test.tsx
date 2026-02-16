import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MetadataPage from '@/src/app/admin/metadata/page';
import { MetadataService } from '@/src/lib/firebase';
import '@testing-library/jest-dom';

// Mock MetadataService
jest.mock('@/src/lib/firebase', () => ({
    MetadataService: {
        getAllCatalogMetadata: jest.fn(),
        saveCatalogMetadata: jest.fn(),
    }
}));

const mockMetadata = [
    {
        id: 'equipment_catalog',
        fields: {
            purposes: {
                label: 'Equipment Purposes',
                values: ['SDWAN', 'LAN']
            }
        }
    }
];

describe('MetadataPage Focus Loss Bug', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (MetadataService.getAllCatalogMetadata as jest.Mock).mockResolvedValue(mockMetadata);
    });

    it('should preserve newlines and spaces while typing in the textarea', async () => {
        const { container } = render(<MetadataPage />);
        await waitFor(() => expect(container.querySelector('.animate-spin')).not.toBeInTheDocument());

        const textarea = screen.getByPlaceholderText('Enter options...');

        // Initial value is "SDWAN\nLAN"
        // Try to add a newline at the end
        fireEvent.change(textarea, { target: { value: "SDWAN\nLAN\n" } });

        // The value should be EXACTLY what we typed (including the newline)
        expect(textarea).toHaveValue("SDWAN\nLAN\n");

        // Try to add a space
        fireEvent.change(textarea, { target: { value: "SDWAN\nLAN\nNext " } });
        expect(textarea).toHaveValue("SDWAN\nLAN\nNext ");
    });

    it('should not trigger additional fetches when typing in an input', async () => {
        const { container } = render(<MetadataPage />);

        // Wait for initial load (spinner gone)
        await waitFor(() => expect(container.querySelector('.animate-spin')).not.toBeInTheDocument());

        // Find the "Display Label" input for the 'purposes' field
        const labelInput = screen.getByDisplayValue('Equipment Purposes');

        // Initial call count for fetching metadata
        const initialFetchCount = (MetadataService.getAllCatalogMetadata as jest.Mock).mock.calls.length;

        // Simulate typing
        fireEvent.change(labelInput, { target: { value: 'Equipment Purposes Updated' } });

        // If the bug exists, changing selectedCatalog triggers fetchMetadata, which calls getAllCatalogMetadata again.

        // Check for double-trigger of fetch
        // We wait a bit to see if any secondary effect kicks in
        await new Promise(r => setTimeout(r, 100));

        expect((MetadataService.getAllCatalogMetadata as jest.Mock).mock.calls.length).toBe(initialFetchCount);
    });
});
