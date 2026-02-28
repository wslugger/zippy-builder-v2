import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BOMBuilderPage from '@/src/app/sa/project/[id]/bom/page';

// Mock the Next.js hooks
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
    useParams: () => ({ id: 'demo' })
}));

describe('WLAN Tab Feature', () => {
    it('shows WLAN Tab and allows manual AP selection', async () => {
        render(<BOMBuilderPage />);

        // Wait for demo project to load, then click Load Sample Sites
        const loadButton = await screen.findByRole('button', { name: /Load Sample Sites/i });
        fireEvent.click(loadButton);

        // Click on the first loaded site (NY-HQ) to show the tabs
        const firstSite = await screen.findByText('NY-HQ');
        fireEvent.click(firstSite);

        // Now the tabs should appear
        const wanTab = await screen.findByRole('button', { name: /WAN/i });
        expect(wanTab).toBeInTheDocument();

        // The WLAN tab should exist after adding managed_wifi to package
        const wlanTab = await screen.findByRole('button', { name: /WLAN/i });
        expect(wlanTab).toBeInTheDocument();

        // Click WLAN tab
        fireEvent.click(wlanTab);

        // Should show the new Manual WLAN AP Selection section
        expect(await screen.findByText('Manual WLAN AP Selection')).toBeInTheDocument();

        // Should see Indoor APs requirement
        expect(screen.getByText('Indoor APs')).toBeInTheDocument();

        // Click Add AP Model
        const addApButton = screen.getByRole('button', { name: /➕ Add AP Model/i });
        fireEvent.click(addApButton);

        // A switch or AP selection dropdown should appear, "Select AP"
        const selectElement = await screen.findByRole('combobox', { name: /Select AP/i });
        expect(selectElement).toBeInTheDocument();

        // BOM Output should appear with the selected item
        expect(await screen.findByText('Hardware BOM Output')).toBeInTheDocument();
    });
});
