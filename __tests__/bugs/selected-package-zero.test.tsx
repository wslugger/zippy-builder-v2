import React from 'react';
import { render, screen } from '@testing-library/react';
import PackageSummaryPage from '@/src/app/sa/project/[id]/summary/page';
import { Project, Package, Service } from '@/src/lib/types';

// Mock dependencies
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

jest.mock('react', () => {
    const ActualReact = jest.requireActual('react');
    return {
        ...ActualReact,
        use: jest.fn(),
    };
});

const mockedUse = React.use as jest.Mock;

jest.mock('@/src/lib/firebase', () => ({
    ProjectService: {
        getProject: jest.fn(),
        updateProject: jest.fn(),
    },
    PackageService: {
        getPackageById: jest.fn(),
    },
    ServiceService: {
        getAllServices: jest.fn(),
    },
}));

import { ProjectService, PackageService, ServiceService } from '@/src/lib/firebase';

describe('PackageSummaryPage Zero Score', () => {
    const mockProjectId = 'test-project';
    const mockParams = Promise.resolve({ id: mockProjectId });

    const mockProject: Project = {
        id: mockProjectId,
        userId: 'test-user',
        name: 'Test Project',
        customerName: 'Test Customer',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        selectedPackageId: 'pkg-1',
        currentStep: 3,
        packageConfidenceScore: 0, // THE BUG: 0 should not be rendered
    };

    const mockPackage: Package = {
        id: 'pkg-1',
        name: 'Test Package',
        short_description: 'Test Package Description',
        detailed_description: 'Detailed Test Package Description',
        active: true,
        items: [],
        collateral: [],
    };

    const mockServices: Service[] = [];

    beforeEach(() => {
        jest.clearAllMocks();
        mockedUse.mockReturnValue({ id: mockProjectId });
        (ProjectService.getProject as jest.Mock).mockResolvedValue(mockProject);
        (PackageService.getPackageById as jest.Mock).mockResolvedValue(mockPackage);
        (ServiceService.getAllServices as jest.Mock).mockResolvedValue(mockServices);
    });

    it('should NOT render "0" when packageConfidenceScore is 0', async () => {
        render(<PackageSummaryPage params={mockParams} />);

        // Wait for data to load
        const packageName = await screen.findByText('Test Package');
        expect(packageName).toBeInTheDocument();

        // Check if "0" is rendered as a separate text node next to "Selected Package"
        // The bug renders 0 because of {score && score > 0 && ...}

        const selectedPackageLabel = screen.getByText('Selected Package');
        expect(selectedPackageLabel).toBeInTheDocument();

        // In the bug, "0" will be rendered as a text node.
        // We look for a text node that is exactly "0" and NOT part of something else like "10" or "Service 0"
        const zeroText = screen.queryByText(/^0$/);

        // This should be null if the bug is fixed
        expect(zeroText).toBeNull();
    });
});
