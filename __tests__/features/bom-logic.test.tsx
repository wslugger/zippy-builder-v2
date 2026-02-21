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
            specs: {
                stackable: false,
                accessPortCount: 48,
                uplinkPortCount: 4,
                accessPortType: '1G'
            },
        },
        {
            id: "sw_24p_10g",
            model: "SW 24 Port 10G",
            vendor_id: "meraki",
            primary_purpose: "LAN", additional_purposes: [], role: "LAN",
            active: true,
            status: "Supported",
            specs: {
                stackable: false,
                accessPortCount: 24,
                uplinkPortCount: 2,
                accessPortType: '10G'
            },
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
        ],
        throughput_basis: "vpn_throughput_mbps"
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

    it("evaluates default sizing based on userCount correctly", () => {
        // Site specifies 100 users = 100 ports
        const site: Site = {
            id: "site1",
            name: "Test Site",
            address: "",
            userCount: 100,
            bandwidthDownMbps: 0,
            bandwidthUpMbps: 0,
            redundancyModel: "Single CPE",
            wanLinks: 1,
            lanPorts: 0, // Should use userCount
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const rules: BOMLogicRule[] = [];

        const testRules = rules;
        const testCatalog = mockEquipmentCatalog;
        const bom = calculateBOM({ projectId: "proj1", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: mockSiteTypes, equipmentCatalog: testCatalog, rules: testRules });

        // Should pick the 48 port switch because it's the first matching candidate in sorted order (lowest capacity/ports)
        // Wait, sortedCandidates uses performance value. For LAN, that's switching_capacity_gbps.
        // Since it's missing, it defaults to 0.
        expect(bom.items[0].itemId).toBe("sw_48p_1g");

        // 100 users / 48 ports = 2.08 -> 3 switches
        expect(bom.items[0].quantity).toBe(3);
    });

    it("evaluates dynamic switch quantity with modify_quantity rule", () => {
        const site: Site = {
            id: "site2",
            name: "Test Site Maths",
            address: "",
            userCount: 100, // 100 users
            bandwidthDownMbps: 0,
            bandwidthUpMbps: 0,
            redundancyModel: "Single CPE",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA",
        };

        const rules: BOMLogicRule[] = [
            {
                id: "r2",
                name: "Dynamic Switch Ratio",
                priority: 10,
                condition: { "==": [{ "var": "serviceId" }, "managed_lan"] },
                actions: [
                    { type: "modify_quantity", targetId: "calculate_qty", quantityMultiplierField: "userCount", actionValue: 24 }
                ]
            }
        ];

        const testRules = rules;
        const testCatalog = mockEquipmentCatalog;
        const bom = calculateBOM({ projectId: "proj2", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: mockSiteTypes, equipmentCatalog: testCatalog, rules: testRules });

        // With 100 users, dividing by 24 (via rule) = 4.16, ceiling should be 5.
        expect(bom.items[0].quantity).toBe(5);
    });
});
