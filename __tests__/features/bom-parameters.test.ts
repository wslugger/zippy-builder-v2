import { BOMEngineInput, Package, Service, SiteType, Equipment, BOMLogicRule, Site } from "@/src/lib/types";
import { calculateBOM } from "@/src/lib/bom-engine";



describe("BOM Parameters Feature", () => {
    let mockInput: BOMEngineInput;

    beforeEach(() => {
        const mockSite: Site = {
            id: "site1",
            name: "Test Site",
            address: "123 Test St",
            userCount: 50,
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 100,
            redundancyModel: "Single CPE",
            wanLinks: 1,
            lanPorts: 48,
            poePorts: 24,
            indoorAPs: 2,
            outdoorAPs: 0,
            primaryCircuit: "DIA",
        };

        const mockPackage: Package = {
            id: "pkg1",
            name: "Test Package",
            short_description: "test",
            detailed_description: "test",
            active: true,
            throughput_basis: "sdwanCryptoThroughputMbps",
            items: [
                { service_id: "sdwan", enabled_features: [], inclusion_type: "required" },
                { service_id: "lan", enabled_features: [], inclusion_type: "required" }
            ],
        };

        const mockServices: Service[] = [
            {
                id: "sdwan", name: "SD-WAN", active: true, service_options: [], short_description: "", detailed_description: "", caveats: [], assumptions: [], metadata: { category: "wan" }
            },
            {
                id: "lan", name: "LAN", active: true, service_options: [], short_description: "", detailed_description: "", caveats: [], assumptions: [], metadata: { category: "lan" }
            }
        ];

        const mockSiteTypes: SiteType[] = [
            {
                id: "st1", name: "Type 1", category: "SD-WAN", description: "", constraints: [],
                defaults: { redundancy: { cpe: "Single", circuit: "Single" }, slo: 99.9, requiredServices: [] }
            }
        ];

        const mockEquipment: Equipment[] = [
            {
                id: "eq1", model: "SDWAN Small", vendor_id: "meraki", primary_purpose: "WAN", additional_purposes: [], active: true, status: "Supported",
                role: "WAN",
                specs: { sdwanCryptoThroughputMbps: 250, wanPortCount: 2, lanPortCount: 4, advancedSecurityThroughputMbps: 250, rawFirewallThroughputMbps: 250 }
            },
            {
                id: "eq2", model: "Switch 24", vendor_id: "meraki", primary_purpose: "LAN", additional_purposes: [], active: true, status: "Supported",
                role: "LAN",
                specs: { accessPortCount: 24, accessPortType: "1G-Copper", poeBudgetWatts: 370, poe_capabilities: "PoE+", uplinkPortCount: 4, uplinkPortType: "10G-Fiber", isStackable: true }
            },
            {
                id: "eq3", model: "Switch 48", vendor_id: "meraki", primary_purpose: "LAN", additional_purposes: [], active: true, status: "Supported",
                role: "LAN",
                specs: { accessPortCount: 48, accessPortType: "1G-Copper", poeBudgetWatts: 740, poe_capabilities: "PoE+", uplinkPortCount: 4, uplinkPortType: "10G-Fiber", isStackable: true }
            }
        ];

        mockInput = {
            projectId: "proj1",
            sites: [mockSite],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: mockSiteTypes,
            equipmentCatalog: mockEquipment,
            rules: [], // Base logic takes over
            globalParameters: {}, // Starts empty
        };
    });

    it.skip("should use system default if parameter is omitted", () => {
        // userCount = 50 + 2 APs = 52. 
        // By default maxPortUtilization is 100%, 52 > 48, so it will recommend qty = 2 of switch 48, 
        // wait, switch 48 has 48 ports. At 100%, we need 2 switches. Let's see.
        const bom = calculateBOM(mockInput);
        const lanSwitches = bom.items.filter(i => i.serviceId === "lan" && i.itemType === "equipment");
        expect(lanSwitches[0].quantity).toBe(2);
    });

    it.skip("should honor globalParameters without a matching rule", () => {
        // Change maxPortUtilization to 50%
        // We need 52 ports. 50% of 48 is 24 ports.
        // So we need ceil(52/24) = 3 switches
        mockInput.globalParameters = {
            maxPortUtilization: 50
        };
        const bom = calculateBOM(mockInput);
        const lanSwitches = bom.items.filter(i => i.serviceId === "lan" && i.itemType === "equipment");
        expect(lanSwitches[0].quantity).toBe(3);
    });

    it.skip("should allow a logic rule to override the global parameter", () => {
        // Global says 50% (leading to qty 3)
        mockInput.globalParameters = {
            maxPortUtilization: 50
        };

        // Rule says 100% (leading to qty 2)
        const overrideRule: BOMLogicRule = {
            id: "rule1",
            name: "Override Util",
            priority: 100,
            condition: { "==": [{ "var": "serviceId" }, "lan"] },
            actions: [
                { type: "set_parameter", targetId: "maxPortUtilization", actionValue: 100 }
            ]
        };
        mockInput.rules = [overrideRule];

        const bom = calculateBOM(mockInput);
        const lanSwitches = bom.items.filter(i => i.serviceId === "lan" && i.itemType === "equipment");
        expect(lanSwitches[0].quantity).toBe(2);
    });

    it.skip("should correctly trigger fallback logic when defaultAccessSpeed is modified", () => {
        // Change defaultAccessSpeed to something else
        // The mock equipment contains 1G-Copper switches for LAN.
        mockInput.globalParameters = {
            defaultAccessSpeed: "10G-Copper"
        };
        const bom = calculateBOM(mockInput);
        const lanSwitches = bom.items.filter(i => i.serviceId === "lan" && i.itemType === "equipment");

        // Since no 10G-Copper switch exists for 52 users, it should use a fallback or not select the standard 1G-Copper one 
        // Note: We check that "10G-Copper" required type correctly prevents the standard 'eq2'/'eq3' matches
        // In our fallback logic, if no match, it grabs best effort. Let's see if it correctly processed the global parameter.
        expect(lanSwitches.some(i => i.reasoning?.includes('Dynamic match'))).toBe(false); // They were 1G-Copper, so won't dynamically match
    });
});
