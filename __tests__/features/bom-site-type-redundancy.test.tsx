import { calculateBOM } from "@/src/lib/bom-engine";
import { Site } from "@/src/lib/bom-types";
import { Package, Service } from "@/src/lib/types";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";

describe("BOM Site Type Redundancy Logic", () => {
    const testRules = SEED_BOM_RULES;
    const testCatalog = SEED_EQUIPMENT;

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

        const bom = calculateBOM({ projectId: "test-project", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: ALL_SITE_TYPES, equipmentCatalog: testCatalog, rules: testRules });
        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");

        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.quantity).toBe(2);
        expect(sdwanItem?.reasoning).toContain("Redundant");
    });

    it("should prioritize Site redundancy override (Single) over Site Type default redundancy (Dual)", () => {
        // large_office has defaults.redundancy.cpe = "Dual"
        // Site-level explicitly requests Single CPE - this should win
        const site: Site = {
            name: "Override Dual with Single",
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 100,
            userCount: 10,
            siteTypeId: "large_office",
            address: "Test",
            redundancyModel: "Single CPE",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const bom = calculateBOM({ projectId: "test-project", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: ALL_SITE_TYPES, equipmentCatalog: testCatalog, rules: testRules });
        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");

        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.quantity).toBe(1); // Site override wins
    });

    it("should prioritize Site redundancy override (Dual) over Site Type default redundancy (Single)", () => {
        // small_office has defaults.redundancy.cpe = "Single"
        // Site-level explicitly requests Dual CPE - this should win
        const site: Site = {
            name: "Override Single with Dual",
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 100,
            userCount: 10,
            siteTypeId: "small_office",
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
        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");

        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.quantity).toBe(2); // Site override wins
    });
});
