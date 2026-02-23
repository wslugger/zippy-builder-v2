import { render, screen, act } from '@testing-library/react';
import MetricsDashboard from '@/src/app/admin/dashboard/page';
import '@testing-library/jest-dom';
import { ProjectService } from '@/src/lib/firebase/project-service';

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

jest.mock('@/src/lib/firebase/project-service', () => ({
    ProjectService: {
        getAllProjects: jest.fn(),
    },
}));

const mockProjects = [
    { id: '1', currentStep: 2, status: 'draft', selectedPackageId: 'cost_centric' },
    { id: '2', currentStep: 4, status: 'draft', selectedPackageId: 'business_critical' },
    { id: '3', currentStep: 6, status: 'completed', selectedPackageId: 'cost_centric' },
];

describe('Metrics Dashboard', () => {
    beforeEach(() => {
        (ProjectService.getAllProjects as jest.Mock).mockResolvedValue(mockProjects);
    });

    it('should render the dashboard title and main sections after loading', async () => {
        await act(async () => {
            render(<MetricsDashboard />);
        });

        expect(screen.getByText(/Metrics Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Active Users Today/i)).toBeInTheDocument();
        expect(screen.getByText(/User Activity/i)).toBeInTheDocument();
        expect(screen.getByText(/Project Lifecycle Funnel/i)).toBeInTheDocument();
        expect(screen.getByText(/Download Conversion Rates/i)).toBeInTheDocument();
        expect(screen.getByText(/Package Popularity/i)).toBeInTheDocument();
        expect(screen.getByText(/Vendor Preference/i)).toBeInTheDocument();
        expect(screen.getByText(/HLD/i)).toBeInTheDocument();
    });

    it('should display the correct dynamic data for top stats', async () => {
        await act(async () => {
            render(<MetricsDashboard />);
        });

        expect(screen.getByText('3')).toBeInTheDocument(); // Total Active Projects (from mockProjects.length)
        expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // Active Users Today
    });
    it('should correctly count projects in each phase and not count BOM-completed as HLD', async () => {
        const testProjects = [
            { id: '1', currentStep: 1, status: 'draft' }, // Started
            { id: '2', currentStep: 2, status: 'draft' }, // Recommended Package
            { id: '3', currentStep: 4, status: 'draft' }, // Recommended Design
            { id: '4', currentStep: 5, status: 'completed' }, // BOM (completed but still Step 5)
            { id: '5', currentStep: 5, status: 'completed' }, // BOM (completed but still Step 5)
        ];
        (ProjectService.getAllProjects as jest.Mock).mockResolvedValue(testProjects);

        await act(async () => {
            render(<MetricsDashboard />);
        });

        // "Download Conversion Rates" section contains the counts in text
        // Recommended Package: 4 of 5 (steps 2, 4, 5, 5)
        // Recommended Design: 3 of 5 (steps 4, 5, 5)
        // BOM: 2 of 5 (steps 5, 5)
        // HLD: 0 of 5 (no step 6)

        expect(screen.getByText('4 of 5 projects')).toBeInTheDocument(); // Package
        expect(screen.getByText('3 of 5 projects')).toBeInTheDocument(); // Design
        expect(screen.getByText('2 of 5 projects')).toBeInTheDocument(); // BOM
        expect(screen.getByText('0 of 5 projects')).toBeInTheDocument(); // HLD
    });
});
