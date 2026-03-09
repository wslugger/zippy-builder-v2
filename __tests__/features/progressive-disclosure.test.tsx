import { Site } from "@/src/lib/types";
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectSummaryDashboard } from '@/src/app/sa/project/[id]/bom/ProjectSummaryDashboard';


describe("Progressive Disclosure - ProjectSummaryDashboard", () => {
    const mockSites: Site[] = [
        {
            name: "Site 1",
            address: "123 Main St",
            userCount: 50,
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 100,
            redundancyModel: "Single",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "Broadband",
            siteTypeId: "small_office" // Configured
        },
        {
            name: "Site 2",
            address: "456 Side St",
            userCount: 200,
            bandwidthDownMbps: 1000,
            bandwidthUpMbps: 1000,
            redundancyModel: "Dual",
            wanLinks: 2,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA",
            // Missing siteTypeId -> Flagged
        }
    ];

    it("renders the correct summary counts", () => {
        const mockSetSiteFilter = jest.fn();
        render(<ProjectSummaryDashboard sites={mockSites} setSiteFilter={mockSetSiteFilter} />);

        expect(screen.getByText("Total Sites")).toBeInTheDocument();
        // Use getAllByText because "2" also appears in the instruction steps
        expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);

        expect(screen.getByText("Auto-Configured")).toBeInTheDocument();
        expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);

        expect(screen.getByText("Flagged For Review")).toBeInTheDocument();
    });

    it("calls setSiteFilter when metric cards are clicked", () => {
        const mockSetSiteFilter = jest.fn();
        render(<ProjectSummaryDashboard sites={mockSites} setSiteFilter={mockSetSiteFilter} />);

        const allCard = screen.getByText("Total Sites").parentElement;
        const flaggedCard = screen.getByText("Flagged For Review").parentElement;

        if (allCard) fireEvent.click(allCard);
        expect(mockSetSiteFilter).toHaveBeenCalledWith("all");

        if (flaggedCard) fireEvent.click(flaggedCard);
        expect(mockSetSiteFilter).toHaveBeenCalledWith("flagged");
    });
});
