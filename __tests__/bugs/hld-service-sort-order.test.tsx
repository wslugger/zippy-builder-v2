/**
 * Bug: HLD servicesIncluded array does not respect the admin-defined sortOrder.
 *
 * Root cause: hld-generator.ts fetches services individually via getServiceById()
 * using a Set of IDs (which has no defined order), then builds the servicesIncluded
 * list from that unsorted result. The fix is to fetch all services via getAllServices()
 * (which applies sortOrder sorting in the service layer), then filter to the ones
 * referenced by the project's customizedItems.
 */

jest.mock("firebase/app", () => ({
    initializeApp: jest.fn(),
    getApps: jest.fn(() => []),
    getApp: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
    initializeFirestore: jest.fn(),
    doc: jest.fn(() => ({ id: "mock" })),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    setDoc: jest.fn(),
    deleteDoc: jest.fn(),
    collection: jest.fn(),
    writeBatch: jest.fn(),
}));

jest.mock("firebase/storage", () => ({
    getStorage: jest.fn(),
}));

import { ServiceService } from "@/src/lib/firebase";
import { getDocs } from "firebase/firestore";
import { Service } from "@/src/lib/types";

const mockService = (overrides: Partial<Service> & { id: string; name: string }): Service => ({
    short_description: "",
    detailed_description: `Description for ${overrides.name}`,
    caveats: [],
    assumptions: [],
    service_options: [],
    active: true,
    ...overrides,
});

describe("Bug: HLD service sort order", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("getAllServices() should return services sorted by sortOrder, not insertion order", async () => {
        // Simulate Firestore returning services in an arbitrary/random order
        const mockDocs = [
            { id: "managed_wifi", data: () => mockService({ id: "managed_wifi", name: "Managed Wi-Fi", sortOrder: 2 }) },
            { id: "managed_sdwan", data: () => mockService({ id: "managed_sdwan", name: "Managed SD-WAN", sortOrder: 0 }) },
            { id: "managed_lan", data: () => mockService({ id: "managed_lan", name: "Managed LAN", sortOrder: 1 }) },
        ];

        (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

        // This is what hld-generator should use (fetch all then filter)
        const allServices = await ServiceService.getAllServices();

        // Filter to services referenced by a hypothetical project
        const projectServiceIds = new Set(["managed_sdwan", "managed_lan", "managed_wifi"]);
        const servicesForHld = allServices.filter(s => projectServiceIds.has(s.id));

        // HLD services should now appear in sortOrder: SD-WAN(0), LAN(1), Wi-Fi(2)
        expect(servicesForHld[0].id).toBe("managed_sdwan");
        expect(servicesForHld[1].id).toBe("managed_lan");
        expect(servicesForHld[2].id).toBe("managed_wifi");
    });

    it("filtering getAllServices() preserves sort order regardless of Set iteration order", async () => {
        // Services with defined sortOrder
        const mockDocs = [
            { id: "c", data: () => mockService({ id: "c", name: "Charlie", sortOrder: 2 }) },
            { id: "a", data: () => mockService({ id: "a", name: "Alpha", sortOrder: 0 }) },
            { id: "b", data: () => mockService({ id: "b", name: "Bravo", sortOrder: 1 }) },
        ];

        (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

        const allServices = await ServiceService.getAllServices();

        // Even if the Set has keys in reverse order, the filtered output should still respect sortOrder
        const setInReverseOrder = new Set(["c", "b", "a"]);
        const filtered = allServices.filter(s => setInReverseOrder.has(s.id));

        expect(filtered[0].id).toBe("a");
        expect(filtered[1].id).toBe("b");
        expect(filtered[2].id).toBe("c");
    });
});
