import { BOMEngine } from "@/src/lib/bom-engine";
import { Site } from "@/src/lib/bom-types";
import { Package, Service } from "@/src/lib/types";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";

describe("BOM Site Type Redundancy Logic", () => {
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

    it("should respect Site Type default redundancy (Dual) when site redundancy is undefined", () => {
        // large_office has defaults.redundancy.cpe = "Dual"
        const site: Site = {
            name: "Dual Default Site",
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 100,
            userCount: 10,
            siteTypeId: "large_office", // Dual CPE Default
            address: "Test",
            redundancyModel: "", // Undefined/Empty
            wanLinks: 2,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const bom = engine.generateBOM("test-project", [site], mockPackage, mockServices, ALL_SITE_TYPES);
        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");

        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.quantity).toBe(2);
        expect(sdwanItem?.reasoning).toContain("Redundant");
    });

    it("should prioritize Site Type default redundancy (Dual) over Site redundancy override (Single)", () => {
        // large_office has defaults.redundancy.cpe = "Dual"
        // Organizational standard (Site Type) should win over potentially incorrect CSV data
        const site: Site = {
            name: "Override Dual with Single",
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 100,
            userCount: 10,
            siteTypeId: "large_office",
            address: "Test",
            redundancyModel: "Single CPE", // This override should be ignored in favor of the profile standard
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
        expect(sdwanItem?.quantity).toBe(2); // Profile standard wins
    });

    it("should prioritize Site Type default redundancy (Single) over Site redundancy override (Dual)", () => {
        // small_office has defaults.redundancy.cpe = "Single"
        // Organizational standard (Site Type) should win
        const site: Site = {
            name: "Override Single with Dual",
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 100,
            userCount: 10,
            siteTypeId: "small_office",
            address: "Test",
            redundancyModel: "Dual CPE", // This override should be ignored in favor of the profile standard
            wanLinks: 2,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const bom = engine.generateBOM("test-project", [site], mockPackage, mockServices, ALL_SITE_TYPES);
        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");

        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.quantity).toBe(1); // Profile standard wins
    });
});
