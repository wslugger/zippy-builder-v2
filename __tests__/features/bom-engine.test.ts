import { BOMEngine } from "@/src/lib/bom-engine";
import { Site } from "@/src/lib/bom-types";
import { Package } from "@/src/lib/types";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { SEED_PACKAGES, SEED_SERVICES } from "@/src/lib/seed-data";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";

describe("BOM Engine Logic", () => {
    const engine = new BOMEngine(SEED_BOM_RULES, SEED_EQUIPMENT);
    const costCentricPackage = SEED_PACKAGES.find(p => p.id === "cost_centric")!;

    it("should select Meraki MX67 for small bandwidth site (Cost Centric)", () => {
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

        const bom = engine.generateBOM("test-project", [site], costCentricPackage, SEED_SERVICES, ALL_SITE_TYPES);

        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");
        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx67");
    });

    it("should select Meraki MX68 for medium bandwidth site (Cost Centric)", () => {
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

        const bom = engine.generateBOM("test-project", [site], costCentricPackage, SEED_SERVICES, ALL_SITE_TYPES);

        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");
        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx68");
    });

    it("should select Meraki MX85 for large bandwidth site (Cost Centric)", () => {
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

        const bom = engine.generateBOM("test-project", [site], costCentricPackage, SEED_SERVICES, ALL_SITE_TYPES);

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
            indoorAPs: 5, // request 5 APs
            outdoorAPs: 0,
            primaryCircuit: "Broadband"
        };

        // Ensure Managed Wifi service is considered in the package.
        // Cost Centric by default doesn't have Managed Wifi in SEED_PACKAGES?
        // Let's check SEED_PACKAGES definition.
        // It has Managed SD-WAN.
        // I might need to mock a package that has Wifi or add Wifi to Cost Centric for test.

        // Let's create a custom package for this test
        const wifiPackage: Package = {
            ...costCentricPackage,
            items: [
                ...costCentricPackage.items,
                {
                    service_id: "managed_wifi",
                    inclusion_type: "standard",
                    enabled_features: []
                }
            ]
        };

        const bom = engine.generateBOM("test-project", [site], wifiPackage, SEED_SERVICES, ALL_SITE_TYPES);

        const wifiItem = bom.items.find(i => i.serviceId === "managed_wifi");
        expect(wifiItem).toBeDefined();
        expect(wifiItem?.quantity).toBe(5);
        expect(wifiItem?.itemId).toBe("meraki_mr44");
    });
});
