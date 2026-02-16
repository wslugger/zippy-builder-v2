import React from 'react';
import { render, screen } from '@testing-library/react';
import CustomizeProjectPage from '@/src/app/sa/project/[id]/customize/page';
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

describe('CustomizeProjectPage Filtering', () => {
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
    };

    const mockPackage: Package = {
        id: 'pkg-1',
        name: 'Test Package',
        short_description: 'Test Package Description',
        detailed_description: 'Detailed Test Package Description',
        active: true,
        items: [
            {
                service_id: 'service-included',
                inclusion_type: 'required',
                enabled_features: [],
            }
        ],
        collateral: [],
    };

    const mockServices: Service[] = [
        {
            id: 'service-included',
            name: 'Included Service',
            short_description: 'Included',
            detailed_description: 'Included Detailed',
            active: true,
            service_options: [],
            caveats: [],
            assumptions: [],
        },
        {
            id: 'service-not-included',
            name: 'Excluded Service',
            short_description: 'Not Included',
            detailed_description: 'Excluded Detailed',
            active: true,
            service_options: [],
            caveats: [],
            assumptions: [],
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockedUse.mockReturnValue({ id: mockProjectId });
        (ProjectService.getProject as jest.Mock).mockResolvedValue(mockProject);
        (PackageService.getPackageById as jest.Mock).mockResolvedValue(mockPackage);
        (ServiceService.getAllServices as jest.Mock).mockResolvedValue(mockServices);
    });

    it('should NOT render services that are not part of the package', async () => {
        render(<CustomizeProjectPage params={mockParams} />);

        // Wait for data to load (since it uses useEffect)
        // In a real test we'd use findByText or act()
        const includedService = await screen.findByText('Included Service');
        expect(includedService).toBeInTheDocument();

        // The bug is that this should NOT be in the document
        const excludedService = screen.queryByText('Excluded Service');

        // This expectation will fail initially (it will be found)
        expect(excludedService).toBeNull();
    });
});
