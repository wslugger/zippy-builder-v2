import { calculateBOM } from "@/src/lib/bom-engine";
import { Site } from "@/src/lib/bom-types";
import { Package, Service, BOMLogicRule } from "@/src/lib/types";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";

describe("Explainable BOM Traceability", () => {
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

    it("should populate matchedRules for rule-based selection", () => {
        const customRule: BOMLogicRule = {
            id: "special_rule",
            name: "Special Fiber Rule",
            priority: 100,
            condition: { "==": [{ "var": "site.primaryCircuit" }, "Fiber"] },
            actions: [
                {
                    type: "select_equipment",
                    targetId: "meraki_mx85"
                }
            ]
        };

        const site: Site = {
            name: "Fiber Site",
            bandwidthDownMbps: 100,
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
            primaryCircuit: "Fiber"
        };

        const bom = calculateBOM({
            projectId: "test",
            sites: [site],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: ALL_SITE_TYPES,
            equipmentCatalog: testCatalog,
            rules: [customRule]
        });

        const item = bom.items.find(i => i.serviceId === "sdwan");
        expect(item?.matchedRules).toBeDefined();
        expect(item?.matchedRules?.[0].ruleId).toBe("special_rule");
        expect(item?.matchedRules?.[0].ruleName).toBe("Special Fiber Rule");
        expect(item?.matchedRules?.[0].description).toContain("Condition");
    });

    it("should populate dynamic match details when no rules match", () => {
        const site: Site = {
            name: "Standard Site",
            bandwidthDownMbps: 50,
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

        const bom = calculateBOM({
            projectId: "test",
            sites: [site],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: ALL_SITE_TYPES,
            equipmentCatalog: testCatalog,
            rules: []
        });

        const item = bom.items.find(i => i.serviceId === "sdwan");
        expect(item?.matchedRules).toBeDefined();
        expect(item?.matchedRules?.[0].ruleId).toBe("dynamic_match");
        expect(item?.matchedRules?.[0].description).toContain("Mbps");
    });

    it("should record manual selection traceability", () => {
        const site: Site = {
            name: "Manual Site",
            bandwidthDownMbps: 50,
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

        const manualSelections = {
            "Manual Site:sdwan": "meraki_mx105"
        };

        const bom = calculateBOM({
            projectId: "test",
            sites: [site],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: ALL_SITE_TYPES,
            equipmentCatalog: testCatalog,
            rules: [],
            manualSelections
        });

        const item = bom.items.find(i => i.serviceId === "sdwan");
        expect(item?.itemId).toBe("meraki_mx105");
        expect(item?.matchedRules?.[0].ruleId).toBe("manual");
        expect(item?.matchedRules?.[0].ruleName).toBe("Manual Override");
    });
});
