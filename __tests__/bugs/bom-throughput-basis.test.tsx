import { Package, Service, Site, BOM, SiteType } from "@/src/lib/types";
import { calculateBOM } from "@/src/lib/bom-engine";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";




describe("Bug Reproduction: BOM Throughput Basis", () => {
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
        active: true,
        metadata: { category: "wan" }
    };

    const mockSite: Site = {
        name: "Test Site",
        address: "123 Test St",
        userCount: 10,
        bandwidthDownMbps: 100,
        bandwidthUpMbps: 100,
        redundancyModel: "Single CPE",
        wanLinks: 1,
        lanPorts: 0,
        poePorts: 0,
        indoorAPs: 0,
        outdoorAPs: 0,
        primaryCircuit: "Broadband",
        notes: ""
    };

    const mockSiteType: SiteType = {
        id: "generic",
        name: "Generic Branch",
        category: "SD-WAN",
        description: "Generic",
        constraints: [],
        defaults: {
            redundancy: { cpe: "Single", circuit: "Single" },
            slo: 99.9,
            requiredServices: ["sdwan"]
        }
    };

    it("should use the throughput basis from the package if provided in fallback logic", () => {
        const pkg: Package = {
            id: "dynamic_package", // Changed from cost_centric to avoid rule match
            name: "Dynamic Package",
            short_description: "Desc",
            detailed_description: "Detailed",
            active: true,
            throughput_basis: "rawFirewallThroughputMbps",
            items: [
                {
                    service_id: "sdwan",
                    inclusion_type: "required",
                    enabled_features: []
                }
            ]
        };

        // MX67 specs: VPN=450, NGFW=250
        // Aggregate Load: 100 + 100 = 200 Mbps

        // If it uses VPN basis, it should definitely pick MX67 (200 < 450)
        // If it uses NGFW basis, it should still pick MX67 (200 < 250)

        // Let's force a scenario where it differs.
        // MX67: VPN=450, NGFW=250
        // Let's set load to 300 Mbps.
        // VPN basis (450) -> MX67 is fine.
        // NGFW basis (250) -> MX67 is NOT enough, should pick MX68 (NGFW=450)

        const highLoadSite: Site = { ...mockSite, bandwidthDownMbps: 150, bandwidthUpMbps: 150 }; // 300 Mbps aggregate

        // Test with VPN basis
        const pkgVPN: Package = { ...pkg, throughput_basis: "sdwanCryptoThroughputMbps" };
        const bomVPN = calculateBOM({ projectId: "proj", sites: [highLoadSite], selectedPackage: pkgVPN, services: [mockServiceSDWAN], siteTypes: [mockSiteType], equipmentCatalog: testCatalog, rules: testRules });
        const itemVPN = bomVPN.items.find(i => i.serviceId === "sdwan");

        // Test with NGFW basis
        const pkgNGFW: Package = { ...pkg, throughput_basis: "rawFirewallThroughputMbps" };
        const bomNGFW = calculateBOM({ projectId: "proj", sites: [highLoadSite], selectedPackage: pkgNGFW, services: [mockServiceSDWAN], siteTypes: [mockSiteType], equipmentCatalog: testCatalog, rules: testRules });
        const itemNGFW = bomNGFW.items.find(i => i.serviceId === "sdwan");

        // These should differ if the basis is respected
        console.log(`VPN Basis Item: ${itemVPN?.itemId}`);
        console.log(`NGFW Basis Item: ${itemNGFW?.itemId}`);

        expect(itemVPN?.reasoning).toContain("SDWANCRYPTOTHROUGHPUTMBPS=500 Mbps");
        expect(itemNGFW?.reasoning).toContain("RAWFIREWALLTHROUGHPUTMBPS=450 Mbps");
    });
});
