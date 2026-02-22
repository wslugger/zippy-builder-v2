/* eslint-disable @typescript-eslint/no-explicit-any */
import { calculateUtilization } from "@/src/lib/bom-engine";
import { getEquipmentPerformanceValue } from "@/src/lib/bom-utils";

/**
 * BUG: Throughput utilization shows 0% for MX68/MX250 but works for MX67.
 * 
 * ROOT CAUSE: Firestore stores primary_purpose as "SDWAN, Security" (comma-separated)
 * for multi-purpose devices. The old code used strict equality (=== "SDWAN") which 
 * fails for these entries, causing getEquipmentPerformanceValue to return 0.
 */
describe("Throughput Utilization Bug - Comma-Separated Purpose", () => {
    const mockSite: any = {
        name: "Test Site",
        bandwidthDownMbps: 200,
        bandwidthUpMbps: 50,
        userCount: 25,
        siteTypeId: "small_office",
        address: "Test",
        redundancyModel: "Single",
        wanLinks: 1,
        lanPorts: 0,
        poePorts: 0,
        indoorAPs: 0,
        outdoorAPs: 0,
        primaryCircuit: "Broadband"
    };

    // This is what Firestore actually returns for MX68 - primary_purpose is a comma-separated string
    const mx68FromFirestore: any = {
        id: "meraki_mx68",
        model: "MX68",
        vendor_id: "meraki",
        primary_purpose: "SDWAN, Security",  // <-- THE BUG: comma-separated in Firestore
        additional_purposes: [],
        active: true,
        status: "Supported",
        specs: {
            vpn_throughput_mbps: 400,
            ngfw_throughput_mbps: 450,
            wanPortCount: 2,
            lanPortCount: 10
        }
        // NOTE: no `role` field - Zod preprocess failed because of the bad primary_purpose
    };

    // MX67 works because its primary_purpose is exactly "SDWAN"
    const mx67FromFirestore: any = {
        id: "meraki_mx67",
        model: "MX67",
        vendor_id: "meraki",
        role: "WAN",
        primary_purpose: "SDWAN",
        additional_purposes: ["Security"],
        active: true,
        status: "Supported",
        specs: {
            vpn_throughput_mbps: 200,
            ngfw_throughput_mbps: 450,
            wanPortCount: 1,
            lanPortCount: 4
        }
    };

    it("should return correct performance value for equipment with comma-separated primary_purpose", () => {
        const value = getEquipmentPerformanceValue(mx68FromFirestore, "vpn_throughput_mbps");
        expect(value).toBe(400);
    });

    it("should return correct performance value for equipment with clean primary_purpose", () => {
        const value = getEquipmentPerformanceValue(mx67FromFirestore, "vpn_throughput_mbps");
        expect(value).toBe(200);
    });

    it("should return correct performance value for equipment with no role field and comma-separated purpose", () => {
        const noRoleEquip: any = {
            ...mx68FromFirestore,
            role: undefined // explicitly no role
        };
        const value = getEquipmentPerformanceValue(noRoleEquip, "vpn_throughput_mbps");
        expect(value).toBe(400);
    });

    it("should calculate non-zero utilization for MX68 with comma-separated purpose", () => {
        const utilization = calculateUtilization(mockSite, mx68FromFirestore, "vpn_throughput_mbps", 0);
        // Load = 200 + 50 = 250. Capacity = 400.
        // Expected: round(250/400 * 100) = 63%
        expect(utilization).toBe(63);
    });

    it("should calculate non-zero utilization for MX67 with clean purpose", () => {
        const utilization = calculateUtilization(mockSite, mx67FromFirestore, "vpn_throughput_mbps", 0);
        // Load = 200 + 50 = 250. Capacity = 200.
        // Expected: round(250/200 * 100) = 125%
        expect(utilization).toBe(125);
    });
});
