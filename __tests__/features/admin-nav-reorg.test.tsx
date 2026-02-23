import { render, screen } from '@testing-library/react';
import AdminNav from '@/src/components/admin/AdminNav';
import AdminHub from '@/src/app/admin/page';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    usePathname: jest.fn(() => '/admin'),
}));

describe('Admin Navigation & Hub', () => {
    describe('AdminNav', () => {
        it('renders the brand and top level links', () => {
            render(<AdminNav />);
            expect(screen.getByText(/Zippy/)).toBeInTheDocument();
            expect(screen.getByText(/Builder/)).toBeInTheDocument();
            expect(screen.getByText('Hub')).toBeInTheDocument();
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.getByText('Catalog')).toBeInTheDocument();
            expect(screen.getByText('Settings & Data')).toBeInTheDocument();
        });

        it('has correct links for standard pages', () => {
            render(<AdminNav />);
            const hubLink = screen.getByRole('link', { name: /Hub/i });
            expect(hubLink).toHaveAttribute('href', '/admin');

            const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
            expect(dashboardLink).toHaveAttribute('href', '/admin/dashboard');
        });
    });

    describe('AdminHub', () => {
        it('renders all section cards', () => {
            render(<AdminHub />);
            expect(screen.getByText(/Control Center/)).toBeInTheDocument();

            // Catalog section
            expect(screen.getByText('Equipment Catalog')).toBeInTheDocument();
            expect(screen.getByText('Services')).toBeInTheDocument();
            expect(screen.getByText('Packages')).toBeInTheDocument();

            // Logic section
            expect(screen.getByText('BOM Logic')).toBeInTheDocument();

            // Data section
            expect(screen.getByText('Ingestion')).toBeInTheDocument();
            expect(screen.getByText('Settings Hub')).toBeInTheDocument();
            expect(screen.getByText('Features')).toBeInTheDocument();
            expect(screen.getByText('Site Types')).toBeInTheDocument();

            // Analytics section
            expect(screen.getByText('Metrics Dashboard')).toBeInTheDocument();
        });

        it('cards have correct hrefs', () => {
            render(<AdminHub />);
            expect(screen.getByText('Equipment Catalog').closest('a')).toHaveAttribute('href', '/admin/catalog');
            expect(screen.getByText('Ingestion').closest('a')).toHaveAttribute('href', '/admin/ingest');
            expect(screen.getByText('Metrics Dashboard').closest('a')).toHaveAttribute('href', '/admin/dashboard');
        });
    });
});
