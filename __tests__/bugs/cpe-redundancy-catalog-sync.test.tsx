import { BOMEngine } from "@/src/lib/bom-engine";
import { Site } from "@/src/lib/bom-types";
import { Package, Service } from "@/src/lib/types";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { SiteType } from "@/src/lib/site-types";

describe("Bugfix: CPE Redundancy Catalog Sync", () => {
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

    it("should correctly identify 'Dual' redundancy even if the catalog value is 'Dual CPE (HA)'", () => {
        const dynamicSiteType: SiteType = {
            id: "platinum_profile",
            name: "Platinum",
            category: "SD-WAN",
            description: "Elite performance sites",
            constraints: [],
            defaults: {
                requiredServices: ["managed_sdwan"],
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

        const bom = engine.generateBOM("test-project", [site], mockPackage, mockServices, [dynamicSiteType]);
        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");

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
                requiredServices: ["managed_sdwan"],
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

        const bom = engine.generateBOM("test-project", [site], mockPackage, mockServices, [dynamicSiteType]);
        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");

        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.quantity).toBe(1);
    });
});
