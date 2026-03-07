import { EquipmentSchema, EquipmentLicenseSchema } from "@/src/lib/types";
import { calculateBOM } from "@/src/lib/bom-engine";
import { BOMEngineInput, Package } from "@/src/lib/types";

describe("Equipment Licensing", () => {
    it("should parse EquipmentLicenseSchema correctly", () => {
        const licenseData = {
            id: "LIC-TEST-1YR",
            tier: "advanced",
            termLength: "1YR"
        };
        const parsed = EquipmentLicenseSchema.parse(licenseData);
        expect(parsed.id).toBe("LIC-TEST-1YR");
        expect(parsed.tier).toBe("advanced");
    });

    it("should allow licenses array to be optional if not provided", () => {
        const equipmentData = {
            id: "eq-1",
            model: "Test Model",
            vendor_id: "vendor",
            active: true,
            status: "Supported",
            primary_purpose: "LAN",
            role: "LAN",
            specs: { accessPortCount: 8 }
        };
        const eq = EquipmentSchema.parse(equipmentData);
        expect(eq.licenses).toBeUndefined();
    });
});
