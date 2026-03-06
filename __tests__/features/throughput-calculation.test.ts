import { calculateBOM } from "@/src/lib/bom-engine";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { Site, BOM } from "@/src/lib/bom-types";
import { Package, Service } from "@/src/lib/types";
import { SiteType } from "@/src/lib/site-types";

describe("BOM Engine - Throughput Calculation", () => {
    let testRules: import("@/src/lib/types").BOMLogicRule[]; let testCatalog: import("@/src/lib/types").Equipment[];

    beforeEach(() => {
        testRules = SEED_BOM_RULES;
        testCatalog = SEED_EQUIPMENT;
    });

    const mockServiceSDWAN: Service = {
        id: "sdwan",
        name: "SD-WAN",
        short_description: "SD-WAN",
        detailed_description: "",
        caveats: [],
        assumptions: [],
        service_options: [],
        active: true
    };

    const mockPackageWithOverhead: Package = {
        id: "cost_centric",
        name: "Cost Centric (VPN Overhead)",
        short_description: "Standard package with VPN overhead",
        detailed_description: "Standard package with VPN overhead",
        active: true,
        throughput_overhead_mbps: 100, // 100 Mbps Overhead
        items: [
            {
                service_id: "sdwan",
                inclusion_type: "required",
                enabled_features: []
            }
        ]
    };

    const mockSiteHighBW: Site = {
        name: "Site-High",
        address: "123 Test St",
        userCount: 100,
        bandwidthDownMbps: 950, // Just under 1000Mbps limit for MX85
        bandwidthUpMbps: 950,
        redundancyModel: "Single CPE",
        wanLinks: 1,
        lanPorts: 48,
        poePorts: 0,
        indoorAPs: 0,
        outdoorAPs: 0,
        primaryCircuit: "DIA",
        notes: ""
    };

    const mockSiteType: SiteType = {
        id: "standard_branch",
        name: "Standard Branch",
        category: "SD-WAN",
        description: "Standard",
        constraints: [],
        defaults: {
            redundancy: { cpe: "Single", circuit: "Single" },
            slo: 99.9,
            requiredServices: ["sdwan"]
        }
    };

    it("should select MX105 (Gigabit) instead of MX85 (High) when overhead pushes demand over 1000Mbps Aggregate", () => {
        // Site: 450 Down / 450 Up = 900 Aggregate (Simplex 450)
        // With overhead 200: 900 + 200 = 1100 Mbps -> MX105 (Rule: 1000-2000)

        const site: Site = { ...mockSiteHighBW, bandwidthDownMbps: 450, bandwidthUpMbps: 450 };
        const pkg: Package = { ...mockPackageWithOverhead, throughput_overhead_mbps: 200 };

        const bom: BOM = calculateBOM({
            projectId:
                "test-project", sites: [site], selectedPackage: pkg, services: [mockServiceSDWAN], siteTypes: [mockSiteType]
            , equipmentCatalog: testCatalog, rules: testRules
        });

        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");

        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx105");
    });

    it("should select MX85 if aggregate load is under 1000Mbps", () => {
        // Site: 450 Down / 450 Up = 900 Aggregate
        // Overhead 0: 900 Mbps -> MX85 (Rule: 500-1000)

        const site: Site = { ...mockSiteHighBW, bandwidthDownMbps: 450, bandwidthUpMbps: 450 };
        const pkg: Package = { ...mockPackageWithOverhead, throughput_overhead_mbps: 0 };

        const bom: BOM = calculateBOM({
            projectId:
                "test-project", sites: [site], selectedPackage: pkg, services: [mockServiceSDWAN], siteTypes: [mockSiteType]
            , equipmentCatalog: testCatalog, rules: testRules
        });

        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");

        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx85");
    });
});
