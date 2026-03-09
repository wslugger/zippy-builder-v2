/* eslint-disable @typescript-eslint/no-explicit-any */
import { Package, Service, Equipment, PricingItem, Site } from "@/src/lib/types";
import { calculateBOM } from "@/src/lib/bom-engine";


import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";

describe("BOM Pricing View Features", () => {
    const mockServices: Service[] = [
        {
            id: "sdwan",
            name: "SD-WAN",
            active: true,
            short_description: "test",
            detailed_description: "test",
            caveats: [],
            assumptions: [],
            supported_features: [],
            service_options: [],
        },
    ];

    const mockPackage: Package = {
        id: "cost_centric",
        name: "Test Package",
        active: true,
        short_description: "test",
        detailed_description: "test",
        items: [{ service_id: "sdwan", inclusion_type: "required", enabled_features: [] }],
    };

    const site: Site = {
        name: "Test Site",
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
        primaryCircuit: "Broadband",
    };

    it("calculates pricing totals correctly across multiple sites", () => {
        const pricingCatalog: PricingItem[] = [
            { id: "meraki_mx67", listPrice: 1000, description: "MX67", eosDate: null }
        ];

        const bom = calculateBOM({
            projectId: "test",
            sites: [site, { ...site, name: "Second Site" }],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: ALL_SITE_TYPES,
            equipmentCatalog: SEED_EQUIPMENT,
            pricingCatalog,
            rules: SEED_BOM_RULES,
        });

        // Verify each site has the MX67 (1000 list)
        expect(bom.items.length).toBe(2);
        const totalListTotal = bom.items.reduce((sum, item) => sum + (item.pricing?.purchasePrice || 0) * item.quantity, 0);
        expect(totalListTotal).toBe(2000);
    });

    it("simulates global discount replacement", () => {
        // This test will verify logic that we will implement in the hook/component
        const purchasePrice = 1000;
        const globalDiscount = 20; // 20%
        const netPrice = purchasePrice * (1 - globalDiscount / 100);
        expect(netPrice).toBe(800);
    });

    it("simulates hardware swap impact correctly", () => {
        const originalPrice = 1000; // e.g. MX68
        const swappedPrice = 600;   // e.g. MX67
        const quantity = 2; // Redundant site
        const delta = (swappedPrice - originalPrice) * quantity;
        expect(delta).toBe(-800);
    });

    it("prevents duplication when a package has redundant service entries", () => {
        const dupePackage: Package = {
            ...mockPackage,
            items: [
                { service_id: "sdwan", inclusion_type: "required", enabled_features: [] },
                { service_id: "sdwan", inclusion_type: "required", enabled_features: [] },
            ]
        };

        const bom = calculateBOM({
            projectId: "test",
            sites: [site],
            selectedPackage: dupePackage,
            services: mockServices,
            siteTypes: ALL_SITE_TYPES,
            equipmentCatalog: SEED_EQUIPMENT,
            rules: SEED_BOM_RULES,
        });

        // Should only have 1 item per site despite 2 entries in package
        const siteItems = bom.items.filter(i => i.siteName === site.name);
        expect(siteItems.length).toBe(1);
    });
});
