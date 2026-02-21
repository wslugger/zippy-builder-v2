/* eslint-disable @typescript-eslint/no-explicit-any */
import { calculateBOM } from "@/src/lib/bom-engine";
import { BOMLogicRule, Site, Equipment, Package, Service, SiteType } from "@/src/lib/types";
import { SERVICE_TO_PURPOSE } from "@/src/lib/bom-utils";

describe("BOM Engine - Extended Logic Rules", () => {
    const mockEquipmentCatalog: Equipment[] = [
        {
            id: "sw_48p_1g",
            model: "SW 48 Port 1G",
            vendor_id: "meraki",
            primary_purpose: "LAN", additional_purposes: [], role: "LAN",
            active: true,
            status: "Supported",
            specs: { stackable: false, port_configuration: { copper1G: 48, mGig: 0, sfp10G: 0 } },
        },
        {
            id: "sw_24p_10g",
            model: "SW 24 Port 10G",
            vendor_id: "meraki",
            primary_purpose: "LAN", additional_purposes: [], role: "LAN",
            active: true,
            status: "Supported",
            specs: { stackable: false, port_configuration: { copper1G: 0, mGig: 0, sfp10G: 24 } },
        }
    ];

    const mockPackage: Package = {
        id: "pkg1",
        name: "Test Package",
        short_description: "",
        detailed_description: "",
        active: true,
        items: [
            { service_id: "managed_lan", inclusion_type: "required", enabled_features: [] }
        ]
    };

    const mockServices: Service[] = [
        {
            id: "managed_lan",
            name: "Managed LAN",
            short_description: "",
            detailed_description: "",
            caveats: [],
            assumptions: [],
            active: true,
            service_options: []
        }
    ];

    const mockSiteTypes: SiteType[] = [
        {
            id: "generic",
            name: "Generic Branch",
            category: "SD-WAN",
            description: "",
            constraints: [],
            defaults: { redundancy: { cpe: "Single", circuit: "Single" }, slo: 99.9, requiredServices: ["managed_lan"] }
        }
    ];

    it("evaluates default access speed from set_parameter correctly", () => {
        // Site specifies no access speed
        const site: Site = {
            id: "site1",
            name: "Test Site",
            address: "",
            userCount: 0,
            bandwidthDownMbps: 0,
            bandwidthUpMbps: 0,
            redundancyModel: "Single CPE",
            wanLinks: 1,
            lanPorts: 48,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const rules: BOMLogicRule[] = [
            {
                id: "r1",
                name: "Default Speed",
                priority: 10,
                condition: { "==": [{ "var": "serviceId" }, "managed_lan"] },
                actions: [{ type: "set_parameter", targetId: "defaultAccessSpeed", actionValue: "10GbE" }]
            }
        ];

        const testRules = rules;
        const testCatalog = mockEquipmentCatalog;
        const bom = calculateBOM({ projectId: "proj1", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: mockSiteTypes, equipmentCatalog: testCatalog, rules: testRules });

        // Should filter out the 1GbE switch and pick the 10GbE switch based on set_parameter logic replacing undefined
        expect(bom.items[0].itemId).toBe("sw_24p_10g");

        // At 24 ports per switch and 48 ports required, it should default to 2
        // because we didn't specify a quantity rule, it falls back to requiredPorts / switchPorts = 2
        expect(bom.items[0].quantity).toBe(2);
    });

    it("evaluates dynamic switch quantity with modify_quantity rule", () => {
        const site: Site = {
            id: "site2",
            name: "Test Site Maths",
            address: "",
            userCount: 0,
            bandwidthDownMbps: 0,
            bandwidthUpMbps: 0,
            redundancyModel: "Single CPE",
            wanLinks: 1,
            lanPorts: 100, // 100 ports required
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA",
            accessPortSpeed: "1GbE", // Explicitly 1GbE
        };

        const rules: BOMLogicRule[] = [
            {
                id: "r2",
                name: "Dynamic Switch Ratio",
                priority: 10,
                condition: { "==": [{ "var": "serviceId" }, "managed_lan"] },
                actions: [
                    { type: "modify_quantity", targetId: "calculate_qty", quantityMultiplierField: "lanPorts", actionValue: 48 }
                ]
            }
        ];

        const testRules = rules;
        const testCatalog = mockEquipmentCatalog;
        const bom = calculateBOM({ projectId: "proj2", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: mockSiteTypes, equipmentCatalog: testCatalog, rules: testRules });

        // With 100 ports, dividing by 48 = 2.08, ceiling should be 3.
        expect(bom.items[0].itemId).toBe("sw_24p_10g");
        expect(bom.items[0].quantity).toBe(3);
    });
});
