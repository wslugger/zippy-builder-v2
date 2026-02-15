import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MetadataPage from "@/src/app/admin/metadata/page";
import { MetadataService } from "@/src/lib/firebase";
import "@testing-library/jest-dom";

// Mock the MetadataService
jest.mock("@/src/lib/firebase", () => ({
    MetadataService: {
        getAllCatalogMetadata: jest.fn(),
        saveCatalogMetadata: jest.fn(),
    },
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

        await waitFor(() => screen.getByText("service_catalog"));
        fireEvent.click(screen.getByText("service_catalog"));

        expect(screen.getByText("service_catalog Fields")).toBeInTheDocument();
        expect(screen.getByText("Service Categories")).toBeInTheDocument();
        expect(screen.getByText("Design Option Categories")).toBeInTheDocument();
    });

    it("seeds defaults for both catalogs", async () => {
        render(<MetadataPage />);

        const seedButton = screen.getByText(/Seed Equipment Defaults/i); // Label might be confusing but that's what's in the code
        fireEvent.click(seedButton);

        await waitFor(() => {
            expect(MetadataService.saveCatalogMetadata).toHaveBeenCalledWith(expect.objectContaining({
                id: "equipment_catalog"
            }));
            expect(MetadataService.saveCatalogMetadata).toHaveBeenCalledWith(expect.objectContaining({
                id: "service_catalog"
            }));
        });
    });
});
