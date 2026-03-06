/* eslint-disable @typescript-eslint/no-explicit-any */

import { calculateBOM } from "@/src/lib/bom-engine";
import { Site } from "@/src/lib/bom-types";
import { Package, Service } from "@/src/lib/types";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";

describe("Bug Reproduction: BOM Edge Device Selection", () => {
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

    const costCentricPackage: Package = {
        id: "cost_centric",
        name: "Cost Centric",
        active: true,
        short_description: "Meraki based",
        detailed_description: "test",
        items: [
            {
                service_id: "sdwan",
                inclusion_type: "required",
                enabled_features: []
            }
        ]
    };

    it("should select a device capable of handling 1100 Mbps for a high bandwidth site", () => {
        // User scenario: 1000 Mbps + 100 Mbps VPN = 1100 Mbps total (simplification)
        const site: Site = {
            name: "High Bandwidth Site",
            bandwidthDownMbps: 1100,
            bandwidthUpMbps: 1100,
            userCount: 100,
            siteTypeId: "generic",
            address: "123 Test St",
            redundancyModel: "Single",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 0,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const bom = calculateBOM({ projectId: "test-project-bug", sites: [site], selectedPackage: costCentricPackage, services: mockServices, siteTypes: ALL_SITE_TYPES, equipmentCatalog: testCatalog, rules: testRules });

        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");
        expect(sdwanItem).toBeDefined();

        // Currently, it likely picks "meraki_mx85" (1 Gbps Raw / 500 Mbps Crypto) due to the >499 rule.
        // But 1100 Mbps clearly exceeds mx85 capabilities if we consider strict bandwidth adherence.
        // We expect it to pick something larger, like mx105 (1.5 Gbps NGFW) or mx250.

        // Checking against mx85 to show it fails (or rather, we want it NOT to be mx85 if mx85 is too small)
        // If the requirement is 1100, mx85 (1000 max) should NOT be selected.
        expect(sdwanItem?.itemId).not.toBe("meraki_mx85");

        // We probably expect mx105 or better
        const selectedDevice = SEED_EQUIPMENT.find(e => e.id === sdwanItem?.itemId);
        const capacity = (selectedDevice?.specs as any)?.sdwanCryptoThroughputMbps || 0;
        expect(capacity).toBeGreaterThanOrEqual(1100);
    });
});
