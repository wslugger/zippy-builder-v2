import { BOMEngine } from "@/src/lib/bom-engine";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { Site, BOM } from "@/src/lib/bom-types";
import { Package, Service } from "@/src/lib/types";
import { SiteType } from "@/src/lib/site-types";

describe("BOM Engine - Throughput Calculation", () => {
    let engine: BOMEngine;

    beforeEach(() => {
        engine = new BOMEngine(SEED_BOM_RULES, SEED_EQUIPMENT);
    });

    const mockServiceSDWAN: Service = {
        id: "managed_sdwan",
        name: "Managed SD-WAN",
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
                service_id: "managed_sdwan",
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
        tier: "Standard Branch",
        description: "Standard",
        constraints: [],
        defaults: {
            redundancy: { cpe: "Single", circuit: "Single" },
            slo: 99.9,
            requiredServices: ["managed_sdwan"]
        }
    };

    it("should select MX105 (Gigabit) instead of MX85 (High) when overhead pushes demand over 1000Mbps", () => {
        // Without overhead: 950Mbps -> MX85 (High Bandwidth Rule: 500-1000)
        // With overhead: 950 + 100 = 1050Mbps -> MX105 (Gigabit Rule: 1000-2000)

        const bom: BOM = engine.generateBOM(
            "test-project",
            [mockSiteHighBW],
            mockPackageWithOverhead,
            [mockServiceSDWAN],
            [mockSiteType]
        );

        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");

        expect(sdwanItem).toBeDefined();
        // Expect MX105 because 1050Mbps > 1000Mbps (MX85 limit)
        expect(sdwanItem?.itemId).toBe("meraki_mx105");
        expect(sdwanItem?.itemName).toContain("MX105");
    });

    it("should select MX85 if overhead is 0 (Control logic check)", () => {
        const mockPackageNoOverhead: Package = {
            ...mockPackageWithOverhead,
            id: "cost_centric",
            throughput_overhead_mbps: 0
        };

        const bom: BOM = engine.generateBOM(
            "test-project",
            [mockSiteHighBW],
            mockPackageNoOverhead,
            [mockServiceSDWAN],
            [mockSiteType]
        );

        const sdwanItem = bom.items.find(i => i.serviceId === "managed_sdwan");

        expect(sdwanItem).toBeDefined();
        // Expect MX85 because 950Mbps < 1000Mbps
        expect(sdwanItem?.itemId).toBe("meraki_mx85");
    });
});
