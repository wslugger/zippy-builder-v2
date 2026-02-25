// Mock Firebase completely before any imports
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
    writeBatch: jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
    })),
}));

jest.mock("firebase/storage", () => ({
    getStorage: jest.fn(),
}));

import { ServiceService } from "@/src/lib/firebase";
import { getDocs, writeBatch } from "firebase/firestore";
import { Service } from "@/src/lib/types";

const mockService = (overrides: Partial<Service> & { id: string; name: string }): Service => ({
    short_description: "",
    detailed_description: "",
    caveats: [],
    assumptions: [],
    service_options: [],
    active: true,
    ...overrides,
});

describe("ServiceService - Sort Order", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should sort services by sortOrder ascending", async () => {
        const mockDocs = [
            { id: "c", data: () => mockService({ id: "c", name: "Charlie", sortOrder: 2 }) },
            { id: "a", data: () => mockService({ id: "a", name: "Alpha", sortOrder: 0 }) },
            { id: "b", data: () => mockService({ id: "b", name: "Bravo", sortOrder: 1 }) },
        ];

        (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

        const result = await ServiceService.getAllServices();

        expect(result[0].id).toBe("a");
        expect(result[1].id).toBe("b");
        expect(result[2].id).toBe("c");
    });

    it("should fall back to alphabetical sort when sortOrder is missing", async () => {
        const mockDocs = [
            { id: "z", data: () => mockService({ id: "z", name: "Zulu" }) },
            { id: "a", data: () => mockService({ id: "a", name: "Alpha" }) },
            { id: "m", data: () => mockService({ id: "m", name: "Mike" }) },
        ];

        (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

        const result = await ServiceService.getAllServices();

        expect(result[0].id).toBe("a");
        expect(result[1].id).toBe("m");
        expect(result[2].id).toBe("z");
    });

    it("should sort services with sortOrder before those without", async () => {
        const mockDocs = [
            { id: "no-order", data: () => mockService({ id: "no-order", name: "No Order" }) },
            { id: "has-order", data: () => mockService({ id: "has-order", name: "Has Order", sortOrder: 0 }) },
        ];

        (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

        const result = await ServiceService.getAllServices();

        expect(result[0].id).toBe("has-order");
        expect(result[1].id).toBe("no-order");
    });

    it("should use alphabetical tiebreaker when sortOrder is equal", async () => {
        const mockDocs = [
            { id: "b", data: () => mockService({ id: "b", name: "Bravo", sortOrder: 1 }) },
            { id: "a", data: () => mockService({ id: "a", name: "Alpha", sortOrder: 1 }) },
        ];

        (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

        const result = await ServiceService.getAllServices();

        expect(result[0].id).toBe("a");
        expect(result[1].id).toBe("b");
    });

    it("should call writeBatch for updateServiceSortOrders", async () => {
        const mockBatch = {
            update: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        };
        (writeBatch as jest.Mock).mockReturnValue(mockBatch);

        const updates = [
            { id: "svc1", sortOrder: 0 },
            { id: "svc2", sortOrder: 1 },
            { id: "svc3", sortOrder: 2 },
        ];

        await ServiceService.updateServiceSortOrders(updates);

        expect(writeBatch).toHaveBeenCalled();
        expect(mockBatch.update).toHaveBeenCalledTimes(3);
        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
});
