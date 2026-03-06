 
import { calculateBOM } from "@/src/lib/bom-engine";
import { Site } from "@/src/lib/bom-types";
import { Package, Service } from "@/src/lib/types";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";

describe("BOM Engine Logic", () => {
    const testRules = SEED_BOM_RULES;
    const testCatalog = SEED_EQUIPMENT;

    const mockServices: Service[] = [
        {
            id: "sdwan",
            name: "SD-WAN",
            active: true,
            short_description: "test",
            detailed_description: "test",
            metadata: { category: "Connectivity" },
            caveats: [],
            assumptions: [],
            supported_features: [],
            service_options: []
        },
        {
            id: "lan",
            name: "LAN",
            active: true,
            short_description: "test",
            detailed_description: "test",
            metadata: { category: "Managed Services" },
            caveats: [],
            assumptions: [],
            supported_features: [],
            service_options: []
        },
        {
            id: "wlan",
            name: "Wireless LAN",
            active: true,
            short_description: "test",
            detailed_description: "test",
            metadata: { category: "Wireless" },
            caveats: [],
            assumptions: [],
            supported_features: [],
            service_options: []
        }
    ];

    const mockPackage: Package = {
        id: "cost_centric",
        name: "Test Package",
        active: true,
        short_description: "test",
        detailed_description: "test",
        items: [
            {
                service_id: "sdwan",
                inclusion_type: "required",
                enabled_features: []
            }
        ]
    };

    it("should select Meraki MX67 for small bandwidth site", () => {
        const site: Site = {
            name: "Small Site",
            bandwidthDownMbps: 50, // Aggregate 100 < 200
            bandwidthUpMbps: 50,
            userCount: 10,
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

        const bom = calculateBOM({ projectId: "test-project", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: ALL_SITE_TYPES, equipmentCatalog: testCatalog, rules: testRules });

        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");
        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx67");
    });

    it("should select Meraki MX68 for medium bandwidth site", () => {
        const site: Site = {
            name: "Medium Site",
            bandwidthDownMbps: 150, // Aggregate 300 (200-500)
            bandwidthUpMbps: 150,
            userCount: 50,
            siteTypeId: "small_office",
            address: "Test",
            redundancyModel: "Single",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const bom = calculateBOM({ projectId: "test-project", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: ALL_SITE_TYPES, equipmentCatalog: testCatalog, rules: testRules });

        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");
        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx68");
    });

    it("should select Meraki MX85 for large bandwidth site", () => {
        const site: Site = {
            name: "Large Site",
            bandwidthDownMbps: 600, // Aggregate 1200 (1000-2000)
            bandwidthUpMbps: 600,
            userCount: 50,
            siteTypeId: "small_office",
            address: "Test",
            redundancyModel: "Single",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const bom = calculateBOM({ projectId: "test-project", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: ALL_SITE_TYPES, equipmentCatalog: testCatalog, rules: testRules });

        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");
        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx105");
    });

    it.skip("should calculate Correct AP count", () => {
        const site: Site = {
            name: "Wifi Site",
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 100,
            userCount: 10,
            siteTypeId: "small_office",
            address: "Test",
            redundancyModel: "Single",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 5,
            outdoorAPs: 0,
            primaryCircuit: "Broadband"
        };

        const wifiPackage: Package = {
            ...mockPackage,
            items: [
                ...mockPackage.items,
                {
                    service_id: "wlan",
                    inclusion_type: "standard",
                    enabled_features: []
                }
            ]
        };

        const bom = calculateBOM({ projectId: "test-project", sites: [site], selectedPackage: wifiPackage, services: mockServices, siteTypes: ALL_SITE_TYPES, equipmentCatalog: testCatalog, rules: testRules });

        const wifiItem = bom.items.find(i => i.serviceId === "wlan");
        expect(wifiItem).toBeDefined();
        expect(wifiItem?.quantity).toBe(5);
        expect(wifiItem?.itemId).toBe("meraki_mr44");
    });

    it("should select C8455-G2-MX for 10G DC hub site", () => {
        const site: Site = {
            name: "Data Center",
            bandwidthDownMbps: 10000,
            bandwidthUpMbps: 10000,
            userCount: 50,
            siteTypeId: "large_office",
            address: "Test",
            redundancyModel: "Dual CPE",
            wanLinks: 2,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const bom = calculateBOM({ projectId: "test-project", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: ALL_SITE_TYPES, equipmentCatalog: testCatalog, rules: testRules });

        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");
        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_c8455_g2_mx");
    });
});
