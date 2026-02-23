import { SystemConfigService } from "@/src/lib/firebase/system-config-service";
import { db, SYSTEM_CONFIG_COLLECTION } from "@/src/lib/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { SystemConfig } from "@/src/lib/types";

jest.mock("firebase/firestore", () => {
    return {
        doc: jest.fn(),
        getDoc: jest.fn(),
        setDoc: jest.fn(),
    };
});

// Mock config dependency
jest.mock("@/src/lib/firebase/config", () => ({
    db: {},
    SYSTEM_CONFIG_COLLECTION: "system_config",
}));

describe("SystemConfigService", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should fetch and validate the system config", async () => {
        const mockData = {
            taxonomy: { regions: ["NA", "EMEA"], siteTypes: [], vendors: [] },
            calculationBaselines: { defaultRedundancyFactor: 2, wanThroughputBuffer: 10 },
            defaults: { currency: "USD", defaultTermMonths: 36 },
        };

        (getDoc as jest.Mock).mockResolvedValueOnce({
            exists: () => true,
            data: () => mockData,
        });
        (doc as jest.Mock).mockReturnValue("mockDocRef");

        const result = await SystemConfigService.getConfig();

        expect(doc).toHaveBeenCalledWith(db, SYSTEM_CONFIG_COLLECTION, "global");
        expect(result).toBeDefined();
        expect(result?.taxonomy.regions).toEqual(["NA", "EMEA"]);
        expect(result?.calculationBaselines.defaultRedundancyFactor).toBe(2);
    });

    it("should return null if config does not exist", async () => {
        (getDoc as jest.Mock).mockResolvedValueOnce({
            exists: () => false,
        });

        const result = await SystemConfigService.getConfig();

        expect(result).toBeNull();
    });

    it("should merge and update config correctly", async () => {
        (getDoc as jest.Mock).mockResolvedValueOnce({
            exists: () => true,
            data: () => ({
                taxonomy: { regions: ["NA"] },
                calculationBaselines: { defaultRedundancyFactor: 1, wanThroughputBuffer: 0 },
                defaults: { currency: "USD", defaultTermMonths: 36 },
                createdAt: "2024-01-01T00:00:00.000Z"
            })
        });

        const newPartialConfig = {
            calculationBaselines: { defaultRedundancyFactor: 2, wanThroughputBuffer: 20 },
        };

        await SystemConfigService.updateConfig(newPartialConfig as unknown as Partial<SystemConfig>);

        expect(setDoc).toHaveBeenCalled();
        const setDocCallArgs = (setDoc as jest.Mock).mock.calls[0];
        const payload = setDocCallArgs[1];

        expect(payload.calculationBaselines.defaultRedundancyFactor).toBe(2);
        expect(payload.calculationBaselines.wanThroughputBuffer).toBe(20);
        expect(payload.taxonomy.regions).toEqual(["NA"]); // preserved
        expect(payload.updatedAt).toBeDefined();
    });
});
