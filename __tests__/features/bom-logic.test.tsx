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
                isStackable: false,
                accessPortCount: 48,
                uplinkPortCount: 4,
                accessPortType: '1G-Copper',
                poeBudgetWatts: 370,
                poeStandard: 'PoE+',
                uplinkPortType: '10G-Fiber'
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
                isStackable: false,
                accessPortCount: 24,
                uplinkPortCount: 2,
                accessPortType: '10G-Copper',
                poeBudgetWatts: 0,
                poeStandard: 'None',
                uplinkPortType: '10G-Fiber'
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
        throughput_basis: "sdwanCryptoThroughputMbps"
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

    it("overrides throughput overhead with set_parameter rule", () => {
        const site: Site = {
            id: "site3",
            name: "Test Overhead",
            address: "",
            userCount: 10,
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 10,
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
                id: "rOverhead",
                name: "High Overhead Security",
                priority: 100,
                condition: { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
                actions: [
                    { type: "set_parameter", targetId: "throughput_overhead_mbps", actionValue: 500 }
                ]
            }
        ];

        // Total required = 100 + 10 + 500 = 610 Mbps.
        // We'll use managed_sdwan for this test to check throughput logic.
        const sdwanServices: Service[] = [
            {
                id: "managed_sdwan",
                name: "Managed SD-WAN",
                short_description: "",
                detailed_description: "",
                active: true,
                service_options: [],
                caveats: [], assumptions: []
            }
        ];
        const sdwanPackage: Package = {
            ...mockPackage,
            items: [{ service_id: "managed_sdwan", inclusion_type: "required", enabled_features: [] }]
        };
        const sdwanCatalog: Equipment[] = [
            {
                id: "wan_500",
                model: "WAN 500",
                vendor_id: "meraki",
                role: "WAN", primary_purpose: "SDWAN", additional_purposes: [], active: true, status: "Supported",
                specs: {
                    sdwanCryptoThroughputMbps: 500,
                    rawFirewallThroughputMbps: 0,
                    advancedSecurityThroughputMbps: 0,
                    wanPortCount: 2,
                    lanPortCount: 4
                }
            },
            {
                id: "wan_1000",
                model: "WAN 1000",
                vendor_id: "meraki",
                role: "WAN", primary_purpose: "SDWAN", additional_purposes: [], active: true, status: "Supported",
                specs: {
                    sdwanCryptoThroughputMbps: 1000,
                    rawFirewallThroughputMbps: 0,
                    advancedSecurityThroughputMbps: 0,
                    wanPortCount: 2,
                    lanPortCount: 4
                }
            }
        ];

        const bom = calculateBOM({
            projectId: "proj3",
            sites: [site],
            selectedPackage: sdwanPackage,
            services: sdwanServices,
            siteTypes: mockSiteTypes,
            equipmentCatalog: sdwanCatalog,
            rules: rules
        });

        // 610 Mbps needs the WAN 1000
        expect(bom.items[0].itemId).toBe("wan_1000");
    });

    it("sets cpe_quantity to 2 when redundancyModel contains 'dual'", () => {
        const site: Site = {
            id: "site4",
            name: "Test HA",
            address: "",
            userCount: 0,
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 10,
            redundancyModel: "Dual CPE", // Contains 'dual'
            wanLinks: 2,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA",
        };

        const rules: BOMLogicRule[] = [
            {
                id: "rHA",
                name: "Dual CPE Rule",
                priority: 100,
                condition: {
                    "and": [
                        { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
                        { "contains": [{ "var": "site.redundancyModel" }, "dual"] }
                    ]
                },
                actions: [
                    { type: "set_parameter", targetId: "cpe_quantity", actionValue: 2 }
                ]
            }
        ];

        const sdwanServices: Service[] = [
            {
                id: "managed_sdwan",
                name: "Managed SD-WAN",
                short_description: "",
                detailed_description: "",
                active: true,
                service_options: [],
                caveats: [], assumptions: []
            }
        ];
        const sdwanPackage: Package = {
            ...mockPackage,
            items: [{ service_id: "managed_sdwan", inclusion_type: "required", enabled_features: [] }]
        };
        const sdwanCatalog: Equipment[] = [
            {
                id: "wan_basic",
                model: "WAN Basic",
                vendor_id: "meraki",
                role: "WAN", primary_purpose: "SDWAN", additional_purposes: [], active: true, status: "Supported",
                specs: {
                    sdwanCryptoThroughputMbps: 1000,
                    rawFirewallThroughputMbps: 0,
                    advancedSecurityThroughputMbps: 0,
                    wanPortCount: 2,
                    lanPortCount: 4
                }
            }
        ];

        const bom = calculateBOM({
            projectId: "proj4",
            sites: [site],
            selectedPackage: sdwanPackage,
            services: sdwanServices,
            siteTypes: mockSiteTypes,
            equipmentCatalog: sdwanCatalog,
            rules: rules
        });

        // Quantity should be 2 because of the parameter
        expect(bom.items[0].quantity).toBe(2);
    });
});
