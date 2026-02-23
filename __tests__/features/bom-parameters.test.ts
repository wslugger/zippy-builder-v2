import { calculateBOM } from "@/src/lib/bom-engine";
import { BOMEngineInput, Package, Service, SiteType, Equipment, BOMLogicRule } from "@/src/lib/types";
import { Site } from "@/src/lib/bom-types";

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
                { service_id: "managed_sdwan", enabled_features: [], inclusion_type: "required" },
                { service_id: "managed_lan", enabled_features: [], inclusion_type: "required" }
            ],
        };

        const mockServices: Service[] = [
            {
                id: "managed_sdwan", name: "Managed SD-WAN", active: true, service_options: [], short_description: "", detailed_description: "", caveats: [], assumptions: [], metadata: { category: "wan" }
            },
            {
                id: "managed_lan", name: "Managed LAN", active: true, service_options: [], short_description: "", detailed_description: "", caveats: [], assumptions: [], metadata: { category: "lan" }
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
                id: "eq1", model: "SDWAN Small", vendor_id: "meraki", primary_purpose: "SDWAN", additional_purposes: [], active: true, status: "Supported",
                role: "WAN",
                specs: { sdwanCryptoThroughputMbps: 250, wanPortCount: 2, lanPortCount: 4, advancedSecurityThroughputMbps: 250, rawFirewallThroughputMbps: 250 }
            },
            {
                id: "eq2", model: "Switch 24", vendor_id: "meraki", primary_purpose: "LAN", additional_purposes: [], active: true, status: "Supported",
                role: "LAN",
                specs: { accessPortCount: 24, accessPortType: "1G-Copper", poeBudgetWatts: 370, poeStandard: "PoE+", uplinkPortCount: 4, uplinkPortType: "10G-Fiber", isStackable: true }
            },
            {
                id: "eq3", model: "Switch 48", vendor_id: "meraki", primary_purpose: "LAN", additional_purposes: [], active: true, status: "Supported",
                role: "LAN",
                specs: { accessPortCount: 48, accessPortType: "1G-Copper", poeBudgetWatts: 740, poeStandard: "PoE+", uplinkPortCount: 4, uplinkPortType: "10G-Fiber", isStackable: true }
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

    it("should use system default if parameter is omitted", () => {
        // userCount = 50 + 2 APs = 52. 
        // By default maxPortUtilization is 100%, 52 > 48, so it will recommend qty = 2 of switch 48, 
        // wait, switch 48 has 48 ports. At 100%, we need 2 switches. Let's see.
        const bom = calculateBOM(mockInput);
        const lanSwitches = bom.items.filter(i => i.serviceId === "managed_lan" && i.itemType === "equipment");
        expect(lanSwitches[0].quantity).toBe(2);
    });

    it("should honor globalParameters without a matching rule", () => {
        // Change maxPortUtilization to 50%
        // We need 52 ports. 50% of 48 is 24 ports.
        // So we need ceil(52/24) = 3 switches
        mockInput.globalParameters = {
            maxPortUtilization: 50
        };
        const bom = calculateBOM(mockInput);
        const lanSwitches = bom.items.filter(i => i.serviceId === "managed_lan" && i.itemType === "equipment");
        expect(lanSwitches[0].quantity).toBe(3);
    });

    it("should allow a logic rule to override the global parameter", () => {
        // Global says 50% (leading to qty 3)
        mockInput.globalParameters = {
            maxPortUtilization: 50
        };

        // Rule says 100% (leading to qty 2)
        const overrideRule: BOMLogicRule = {
            id: "rule1",
            name: "Override Util",
            priority: 100,
            condition: { "==": [{ "var": "serviceId" }, "managed_lan"] },
            actions: [
                { type: "set_parameter", targetId: "maxPortUtilization", actionValue: 100 }
            ]
        };
        mockInput.rules = [overrideRule];

        const bom = calculateBOM(mockInput);
        const lanSwitches = bom.items.filter(i => i.serviceId === "managed_lan" && i.itemType === "equipment");
        expect(lanSwitches[0].quantity).toBe(2);
    });
});
