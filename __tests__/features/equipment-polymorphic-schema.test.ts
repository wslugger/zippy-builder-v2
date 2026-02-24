import { EquipmentSchema } from "@/src/lib/types";

describe("Equipment Polymorphic Schema", () => {
    it("should parse a valid WAN equipment record", () => {
        const wanData = {
            id: "cisco_c8300_1n1s_4t2x",
            model: "C8300-1N1S-4T2X",
            vendor_id: "cisco_catalyst",
            primary_purpose: "WAN", additional_purposes: [],
            role: "WAN",
            specs: {
                rawFirewallThroughputMbps: 2000,
                sdwanCryptoThroughputMbps: 5000,
                advancedSecurityThroughputMbps: 0,
                wanPortCount: 4,
                lanPortCount: 4,
            },
        };
        const result = EquipmentSchema.safeParse(wanData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe("WAN");
            expect(result.data.specs).toHaveProperty("rawFirewallThroughputMbps");
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
                accessPortCount: 24,
                accessPortType: '1G-Copper',
                poeBudgetWatts: 370,
                poeStandard: 'PoE+',
                uplinkPortCount: 4,
                uplinkPortType: '10G-Fiber',
                isStackable: false,
            },
        };
        const result = EquipmentSchema.safeParse(lanData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe("LAN");
            expect(result.data.specs).toHaveProperty("accessPortType");
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
                wifiStandard: "Wi-Fi 6",
                mimoBandwidth: "4x4",
                powerDrawWatts: 15,
                uplinkType: "1G-Copper",
                environment: "Indoor"
            },
        };
        const result = EquipmentSchema.safeParse(wlanData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe("WLAN");
            expect(result.data.specs).toHaveProperty("wifiStandard");
        }
    });

    it("should provide backward compatibility for legacy records missing 'role'", () => {
        const legacyData = {
            id: "legacy_router",
            model: "Legacy Router",
            vendor_id: "cisco_catalyst",
            primary_purpose: "WAN", additional_purposes: [],
            specs: {
                rawFirewallThroughputMbps: 1000,
                sdwanCryptoThroughputMbps: 0,
                advancedSecurityThroughputMbps: 0,
                wanPortCount: 2,
                lanPortCount: 4,
            },
        };
        const result = EquipmentSchema.safeParse(legacyData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe("WAN");
            expect(result.data.specs).toHaveProperty("rawFirewallThroughputMbps");
        }
    });

    it("should gracefully handle specs that lack required keys via catch defaults", () => {
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
        expect(result.success).toBe(true);
        if (result.success && result.data.role === 'LAN') {
            expect(result.data.specs.poeBudgetWatts).toBe(0); // Handled by fallback
            expect((result.data.specs as Record<string, unknown>).wifi_standard).toBe("Wi-Fi 6"); // Passthrough string
        }
    });
});
