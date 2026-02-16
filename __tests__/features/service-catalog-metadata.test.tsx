import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MetadataPage from "@/src/app/admin/metadata/page";
import { MetadataService } from "@/src/lib/firebase";
import "@testing-library/jest-dom";

// Mock the MetadataService
jest.mock("@/src/lib/firebase", () => ({
    MetadataService: {
        getAllCatalogMetadata: jest.fn(),
        saveCatalogMetadata: jest.fn(),
        updateCatalogField: jest.fn(),
    },
    SystemDefaultsService: {
        getWorkflowSteps: jest.fn().mockResolvedValue([]),
        saveWorkflowSteps: jest.fn(),
    }
}));

describe("Service Catalog Metadata Integration", () => {
    const mockMetadata = [
        {
            id: "equipment_catalog",
            fields: {
                purposes: { label: "Equipment Purposes", values: ["SDWAN", "LAN"] },
            },
        },
        {
            id: "service_catalog",
            fields: {
                service_categories: {
                    label: "Service Categories",
                    values: ["Fiber", "Cybersecurity"],
                },
                design_option_categories: {
                    label: "Design Option Categories",
                    values: ["Topology", "Internet Breakout"],
                },
            },
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (MetadataService.getAllCatalogMetadata as jest.Mock).mockResolvedValue(mockMetadata);
        window.confirm = jest.fn(() => true);
        window.alert = jest.fn();
    });

    it("renders both equipment and service catalogs in the sidebar", async () => {
        render(<MetadataPage />);

        await waitFor(() => {
            expect(screen.getByText("equipment_catalog")).toBeInTheDocument();
            expect(screen.getByText("service_catalog")).toBeInTheDocument();
        });
    });

    it("allows switching to service_catalog and editing its fields", async () => {
        render(<MetadataPage />);

        await screen.findByText("service_catalog");
        fireEvent.click(screen.getByText("service_catalog"));

        expect(await screen.findByText("service_catalog Fields")).toBeInTheDocument();
        // The labels are inside inputs, so use getByDisplayValue
        expect(screen.getByDisplayValue("Service Categories")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Design Option Categories")).toBeInTheDocument();
    });

    it("seeds defaults for both catalogs", async () => {
        render(<MetadataPage />);

        const seedButton = await screen.findByText(/Seed Equipment Defaults/i);
        fireEvent.click(seedButton);

        await waitFor(() => {
            expect(MetadataService.saveCatalogMetadata).toHaveBeenCalledWith(expect.objectContaining({
                id: "equipment_catalog"
            }));
            // The seedEquipmentDefaults doesn't seed service_catalog, there's a separate button for that in the UI
            // But let's check if the test intended to test both buttons.
            // In the current MetadataPage, they are separate functions.
        });

        const seedServiceButton = screen.getByText(/Seed Service Catalog/i);
        fireEvent.click(seedServiceButton);

        await waitFor(() => {
            expect(MetadataService.saveCatalogMetadata).toHaveBeenCalledWith(expect.objectContaining({
                id: "service_catalog"
            }));
        });
    });
});
