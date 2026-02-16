import { BOMEngine } from "@/src/lib/bom-engine";
import { Site } from "@/src/lib/bom-types";
import { Package, Service } from "@/src/lib/types";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";

describe("BOM Engine Logic", () => {
    const engine = new BOMEngine(SEED_BOM_RULES, SEED_EQUIPMENT);

    const mockServices: Service[] = [
        {
            id: "managed_sdwan",
            name: "Managed SD-WAN",
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
            id: "managed_lan",
            name: "Managed LAN",
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
            id: "managed_wifi",
            name: "Managed Wi-Fi",
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
                service_id: "managed_sdwan",
                inclusion_type: "required",
                enabled_features: []
            }
        ]
    };

    it("should select Meraki MX67 for small bandwidth site", () => {
        const site: Site = {
            name: "Small Site",
            bandwidthDownMbps: 100, // < 200
            bandwidthUpMbps: 100,
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

        const bom = engine.generateBOM("test-project", [site], mockPackage, mockServices, ALL_SITE_TYPES);

        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");
        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx67");
    });

    it("should select Meraki MX68 for medium bandwidth site", () => {
        const site: Site = {
            name: "Medium Site",
            bandwidthDownMbps: 300, // 200-500
            bandwidthUpMbps: 300,
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

        const bom = engine.generateBOM("test-project", [site], mockPackage, mockServices, ALL_SITE_TYPES);

        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");
        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx68");
    });

    it("should select Meraki MX85 for large bandwidth site", () => {
        const site: Site = {
            name: "Large Site",
            bandwidthDownMbps: 1000, // > 500
            bandwidthUpMbps: 1000,
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

        const bom = engine.generateBOM("test-project", [site], mockPackage, mockServices, ALL_SITE_TYPES);

        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");
        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx85");
    });

    it("should calculate Correct AP count", () => {
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
                    service_id: "managed_wifi",
                    inclusion_type: "standard",
                    enabled_features: []
                }
            ]
        };

        const bom = engine.generateBOM("test-project", [site], wifiPackage, mockServices, ALL_SITE_TYPES);

        const wifiItem = bom.items.find(i => i.serviceId === "managed_wifi");
        expect(wifiItem).toBeDefined();
        expect(wifiItem?.quantity).toBe(5);
        expect(wifiItem?.itemId).toBe("meraki_mr44");
    });
});
