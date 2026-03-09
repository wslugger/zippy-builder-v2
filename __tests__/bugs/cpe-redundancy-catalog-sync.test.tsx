import { Package, Service, Site, SiteType } from "@/src/lib/types";
import { calculateBOM } from "@/src/lib/bom-engine";


import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";


describe("Bugfix: CPE Redundancy Catalog Sync", () => {
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

    it("should correctly identify 'Dual' redundancy even if the catalog value is 'Dual CPE (HA)'", () => {
        const dynamicSiteType: SiteType = {
            id: "platinum_profile",
            name: "Platinum",
            category: "SD-WAN",
            description: "Elite performance sites",
            constraints: [],
            defaults: {
                requiredServices: ["sdwan"],
                redundancy: {
                    cpe: "Dual CPE (HA)", // Dynamic value from catalog
                    circuit: "Dual Circuit"
                },
                slo: 99.99
            }
        };

        const site: Site = {
            name: "Elite Site",
            bandwidthDownMbps: 100,
            bandwidthUpMbps: 100,
            userCount: 50,
            siteTypeId: "platinum_profile",
            address: "123 Business Way",
            redundancyModel: "",
            wanLinks: 2,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const bom = calculateBOM({ projectId: "test-project", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: [dynamicSiteType], equipmentCatalog: testCatalog, rules: testRules });
        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");

        expect(sdwanItem).toBeDefined();
        // This is currently expected to FAIL because it expects exact match "Dual"
        expect(sdwanItem?.quantity).toBe(2);
        expect(sdwanItem?.reasoning).toContain("Redundant");
    });

    it("should correctly identify 'Single' redundancy even if the catalog value is 'Single CPE'", () => {
        const dynamicSiteType: SiteType = {
            id: "bronze_profile",
            name: "Bronze",
            category: "SD-WAN",
            description: "Retail sites",
            constraints: [],
            defaults: {
                requiredServices: ["sdwan"],
                redundancy: {
                    cpe: "Single CPE", // Dynamic value from catalog
                    circuit: "Single Circuit"
                },
                slo: 99.5
            }
        };

        const site: Site = {
            name: "Retail Shop",
            bandwidthDownMbps: 10,
            bandwidthUpMbps: 10,
            userCount: 5,
            siteTypeId: "bronze_profile",
            address: "Shopping Mall",
            redundancyModel: "",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "Broadband"
        };

        const bom = calculateBOM({ projectId: "test-project", sites: [site], selectedPackage: mockPackage, services: mockServices, siteTypes: [dynamicSiteType], equipmentCatalog: testCatalog, rules: testRules });
        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");

        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.quantity).toBe(1);
    });
});
