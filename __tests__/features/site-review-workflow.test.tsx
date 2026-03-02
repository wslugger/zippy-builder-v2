import { render, screen } from '@testing-library/react';
import { ProjectSummaryDashboard } from '@/src/app/sa/project/[id]/bom/ProjectSummaryDashboard';
import { Site } from '@/src/lib/bom-types';
import '@testing-library/jest-dom';
import React from 'react';

// Mock Site type to avoid full object overhead in tests
const createMockSite = (overrides: Partial<Site>): Site => ({
    id: 'test-id',
    name: 'Test Site',
    address: '123 Test St',
    userCount: 10,
    bandwidthDownMbps: 100,
    bandwidthUpMbps: 100,
    wanLinks: 1,
    lanPorts: 0,
    poePorts: 0,
    indoorAPs: 0,
    outdoorAPs: 0,
    primaryCircuit: 'Broadband',
    redundancyModel: 'Single CPE',
    ...overrides
} as Site);

describe('Site Review Workflow - Dashboard Logic', () => {
    it('counts only unreviewed flagged sites in the Flagged For Review card', () => {
        const mockSites: Site[] = [
            createMockSite({ name: 'Flagged Unreviewed', lanRequirements: { needsManualReview: true }, isReviewed: false }),
            createMockSite({ name: 'Flagged Reviewed', lanRequirements: { needsManualReview: true }, isReviewed: true }),
            createMockSite({ name: 'Missing Profile Unreviewed', siteTypeId: '', isReviewed: false }),
            createMockSite({ name: 'Missing Profile Reviewed', siteTypeId: '', isReviewed: true }),
            createMockSite({ name: 'Standard Site', siteTypeId: 'small_office' }),
        ];

        render(<ProjectSummaryDashboard sites={mockSites} setSiteFilter={() => { }} />);

        expect(screen.getByTestId('flagged-sites-count')).toHaveTextContent('2');
    });

    it('disables the Finalize button if there are unreviewed flagged sites', () => {
        const mockSites: Site[] = [
            createMockSite({ lanRequirements: { needsManualReview: true }, isReviewed: false }),
        ];

        render(<ProjectSummaryDashboard sites={mockSites} setSiteFilter={() => { }} />);

        const finalizeButton = screen.getByRole('button', { name: /Resolve Flags to Finalize/i });
        expect(finalizeButton).toBeDisabled();
    });

    it('enables the Finalize button if all flagged sites are reviewed', () => {
        const mockSites: Site[] = [
            createMockSite({ lanRequirements: { needsManualReview: true }, isReviewed: true }),
        ];

        render(<ProjectSummaryDashboard sites={mockSites} setSiteFilter={() => { }} />);

        const finalizeButton = screen.getByRole('button', { name: /Finalize & Lock Proposal/i });
        expect(finalizeButton).not.toBeDisabled();
    });
});
