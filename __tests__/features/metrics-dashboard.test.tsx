import { render, screen } from '@testing-library/react';
import MetricsDashboard from '@/src/app/admin/dashboard/page';
import '@testing-library/jest-dom';

// Mock ResizeObserver which is needed by Recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock ResponsiveContainer to just render its children without waiting for resize
jest.mock('recharts', () => {
    const OriginalModule = jest.requireActual('recharts');
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    };
});

describe('Metrics Dashboard', () => {
    it('should render the dashboard title and main sections', () => {
        render(<MetricsDashboard />);

        expect(screen.getByText(/Metrics Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Active Users Today/i)).toBeInTheDocument();
        expect(screen.getByText(/User Activity/i)).toBeInTheDocument();
        expect(screen.getByText(/Project Lifecycle Funnel/i)).toBeInTheDocument();
        expect(screen.getByText(/Download Conversion Rates/i)).toBeInTheDocument();
        expect(screen.getByText(/Package Popularity/i)).toBeInTheDocument();
        expect(screen.getByText(/Vendor Preference/i)).toBeInTheDocument();
    });

    it('should display the correct mock data for top stats', () => {
        render(<MetricsDashboard />);

        expect(screen.getByText('87')).toBeInTheDocument(); // Total Active Projects
        expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2); // Active Users Today, Returning Users Today
    });
});
