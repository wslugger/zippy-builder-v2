import { render, screen, waitFor, act } from '@testing-library/react';
import React, { Suspense } from 'react';

// Mock dependencies
import { ProjectService, PackageService, ServiceService, FeatureService, SiteDefinitionService } from '@/src/lib/firebase';
import { getDocs } from 'firebase/firestore';

jest.mock('@/src/lib/firebase', () => ({
    ProjectService: {
        getProject: jest.fn(),
    },
    PackageService: {
        getPackageById: jest.fn(),
    },
    ServiceService: {
        getAllServices: jest.fn(),
    },
    FeatureService: {
        getAllFeatures: jest.fn(),
    },
    SiteDefinitionService: {
        getAllSiteDefinitions: jest.fn(),
    }
}));

jest.mock('firebase/firestore', () => {
    return {
        collection: jest.fn(),
        getDocs: jest.fn(),
        getFirestore: jest.fn(),
    };
});

jest.mock('@/src/lib/firebase/config', () => ({
    db: {}
}));

import DesignDocPage from '@/src/app/sa/project/[id]/design-doc/page';

describe('Solution Design Document Page Layout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', async () => {
        const params = Promise.resolve({ id: 'proj-123' });
        render(
            <Suspense fallback={<div>Suspense Loading...</div>}>
                <DesignDocPage params={params} />
            </Suspense>
        );
        expect(screen.getByText(/Suspense Loading.../)).toBeDefined();
    });

    it('renders the design document and appendix when data is loaded', async () => {
        // Mock the returns
        (ProjectService.getProject as jest.Mock).mockResolvedValue({
            id: 'proj-123',
            name: 'Test Project',
            customerName: 'Acme Corp',
            selectedPackageId: 'pkg-1',
            createdAt: new Date().toISOString(),
            customizedItems: [
                {
                    service_id: 'srv-1',
                    service_option_id: 'opt-1',
                    design_option_id: 'dopt-1',
                    enabled_features: [{ feature_id: 'feat-1' }]
                }
            ]
        });

        (PackageService.getPackageById as jest.Mock).mockResolvedValue({
            id: 'pkg-1',
            name: 'Standard Package',
            detailed_description: 'Standard detailed description'
        });

        (ServiceService.getAllServices as jest.Mock).mockResolvedValue([
            {
                id: 'srv-1',
                name: 'Managed SD-WAN',
                detailed_description: 'Detailed service description',
                assumptions: ['Service assumption'],
                service_options: [
                    {
                        id: 'opt-1',
                        name: 'High Availability',
                        detailed_description: 'HA description',
                        caveats: ['Option caveat'],
                        design_options: [
                            {
                                id: 'dopt-1',
                                name: 'Dual Circuit',
                                detailed_description: 'Dual Circuit description',
                                assumptions: ['Design assumption']
                            }
                        ]
                    }
                ]
            }
        ]);

        (FeatureService.getAllFeatures as jest.Mock).mockResolvedValue([
            {
                id: 'feat-1',
                name: 'BGP Routing',
                description: 'BGP feature description',
                assumptions: ['Feature assumption']
            }
        ]);

        (SiteDefinitionService.getAllSiteDefinitions as jest.Mock).mockResolvedValue([
            {
                id: 'site-1',
                name: 'Small Branch',
                constraints: [
                    { type: 'Technical', description: 'Requires stable power' }
                ]
            }
        ]);

        (getDocs as jest.Mock).mockResolvedValue({
            docs: [
                {
                    id: 's-1',
                    data: () => ({ name: 'Site 1', siteTypeId: 'site-1' })
                }
            ]
        });

        const params = Promise.resolve({ id: 'proj-123' });
        await act(async () => {
            render(
                <Suspense fallback={<div>Suspense Loading...</div>}>
                    <DesignDocPage params={params} />
                </Suspense>
            );
        });

        // Wait for the design doc to finish loading
        await waitFor(() => {
            // Check for Service detailed description
            expect(screen.getByText('Detailed service description')).toBeDefined();
            // Check for Option detailed description
            expect(screen.getByText('HA description')).toBeDefined();
            // Check for Design Option detailed description
            expect(screen.getByText('Dual Circuit description')).toBeDefined();
            // Check for Feature description
            expect(screen.getByText('BGP Routing')).toBeDefined();
            expect(screen.getByText('BGP feature description')).toBeDefined();

            // Check Appendix content
            expect(screen.getByText(/Service assumption/)).toBeDefined();
            expect(screen.getByText(/Design assumption/)).toBeDefined();
            expect(screen.getByText(/Option caveat/)).toBeDefined();
            expect(screen.getByText(/Feature assumption/)).toBeDefined();
            expect(screen.getByText(/Requires stable power/)).toBeDefined();
        });
    });
});
