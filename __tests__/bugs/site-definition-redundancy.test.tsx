import { render, screen, fireEvent } from '@testing-library/react';
import EditSiteDefinitionPage from '@/src/app/admin/site-definitions/[id]/page';
import '@testing-library/jest-dom';
import { SiteDefinitionService } from '@/src/lib/firebase';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useParams: () => ({ id: 'new' }),
    useRouter: () => ({ push: jest.fn() }),
}));

// Mock next/link
jest.mock('next/link', () => {
    const MockLink = ({ children, href }: { children: React.ReactNode, href: string }) => {
        return <a href={href}>{children}</a>;
    };
    MockLink.displayName = 'MockLink';
    return MockLink;
});

// Mock SiteDefinitionService
jest.mock('@/src/lib/firebase', () => ({
    SiteDefinitionService: {
        getSiteDefinitionById: jest.fn(),
        saveSiteDefinition: jest.fn(),
    }
}));

jest.mock('@/src/hooks/useSystemConfig', () => ({
    useSystemConfig: () => ({
        config: { taxonomy: { purposes: ["SDWAN", "LAN"] } },
        isLoading: false,
    })
}));

describe('Site Definition Redundancy UI', () => {
    it('shows redundancy settings when category is SD-WAN', () => {
        render(<EditSiteDefinitionPage />);

        // Default category is SD-WAN
        expect(screen.getByText(/CPE Redundancy/i)).toBeInTheDocument();
        expect(screen.getByText(/Circuit Redundancy/i)).toBeInTheDocument();
    });

    it('hides redundancy settings when category is LAN', async () => {
        render(<EditSiteDefinitionPage />);

        const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
        fireEvent.change(categorySelect, { target: { value: 'LAN' } });

        // These should NOT be in the document
        expect(screen.queryByText(/CPE Redundancy/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Circuit Redundancy/i)).not.toBeInTheDocument();
    });
});
