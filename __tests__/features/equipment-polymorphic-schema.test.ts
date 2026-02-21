import { EquipmentSchema } from "@/src/lib/types";

describe("Equipment Polymorphic Schema", () => {
    it("should parse a valid WAN equipment record", () => {
        const wanData = {
            id: "cisco_c8300_1n1s_4t2x",
            model: "C8300-1N1S-4T2X",
            vendor_id: "cisco_catalyst",
            primary_purpose: "SDWAN", additional_purposes: [],
            role: "WAN",
            specs: {
                ngfw_throughput_mbps: 2000,
                vpn_throughput_mbps: 5000,
            },
        };
        const result = EquipmentSchema.safeParse(wanData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe("WAN");
            expect(result.data.specs).toHaveProperty("ngfw_throughput_mbps");
        }
    });

    it("should parse a valid LAN equipment record", () => {
        const lanData = {
            id: "meraki_ms120_24p",
            model: "MS120-24P",
            vendor_id: "meraki",
            primary_purpose: "LAN", additional_purposes: [],
            role: "LAN",
            specs: {
                switching_capacity_gbps: 56,
                poe_budget_watts: 370,
                accessPortCount: 24,
                uplinkPortCount: 4,
                accessPortType: '1G',
                uplinkPortType: '10G',
            },
        };
        const result = EquipmentSchema.safeParse(lanData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe("LAN");
            expect(result.data.specs).toHaveProperty("switching_capacity_gbps");
        }
    });

    it("should parse a valid WLAN equipment record", () => {
        const wlanData = {
            id: "meraki_mr44",
            model: "MR44",
            vendor_id: "meraki",
            primary_purpose: "WLAN", additional_purposes: [],
            role: "WLAN",
            specs: {
                wifi_standard: "Wi-Fi 6",
                radios: "2.4 GHz, 5 GHz",
                mimo: "4x4",
            },
        };
        const result = EquipmentSchema.safeParse(wlanData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe("WLAN");
            expect(result.data.specs).toHaveProperty("wifi_standard");
        }
    });

    it("should provide backward compatibility for legacy records missing 'role'", () => {
        const legacyData = {
            id: "legacy_router",
            model: "Legacy Router",
            vendor_id: "cisco_catalyst",
            primary_purpose: "SDWAN", additional_purposes: [],
            specs: {
                ngfw_throughput_mbps: 1000,
            },
        };
        const result = EquipmentSchema.safeParse(legacyData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe("WAN");
            expect(result.data.specs).toHaveProperty("ngfw_throughput_mbps");
        }
    });

    it("should fail validation if 'role' is present but 'specs' do not match", () => {
        const invalidLanData = {
            id: "invalid_lan",
            model: "Invalid LAN",
            vendor_id: "meraki",
            primary_purpose: "LAN", additional_purposes: [],
            role: "LAN",
            specs: {
                wifi_standard: "Wi-Fi 6", // WLAN spec in LAN role
            },
        };
        const result = EquipmentSchema.safeParse(invalidLanData);
        expect(result.success).toBe(false);
    });
});
