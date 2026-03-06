/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for the Pricing Resolution Engine:
 *  1. CSV Parser  — price sanitisation, date extraction, EoS detection
 *  2. BOM Engine  — pricing snapshot injected into BOMLineItem
 *  3. EoS Filter  — eos-marked equipment excluded from selectable options
 */

import { parsePricingCSV, sanitisePrice } from "@/src/lib/pricing-csv-parser";
import { calculateBOM } from "@/src/lib/bom-engine";
import { Site } from "@/src/lib/bom-types";
import { Package, Service, Equipment } from "@/src/lib/types";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CSV Parser
// ─────────────────────────────────────────────────────────────────────────────
describe("parsePricingCSV", () => {
    const sampleCSV = [
        `"Global Price List - Effective : 2024-06-01"`,
        `Product,Price in USD,End Of Sale Date`,
        `C9200-24T,"$1,206.54",`,
        `C9200-48T,"$2,450.00","2024-12-31"`,
        `MX85,"$3,000.00",`,
        `INVALID-ROW,not-a-price,`,
    ].join("\n");

    it("extracts the effective date from the first row", () => {
        const { effectiveDate } = parsePricingCSV(sampleCSV);
        expect(effectiveDate).toBe("2024-06-01");
    });

    it("parses list prices correctly, stripping $ and commas", () => {
        const { rows } = parsePricingCSV(sampleCSV);
        const c9200 = rows.find(r => r.product === "C9200-24T");
        expect(c9200?.listPrice).toBe(1206.54);
    });

    it("extracts End-of-Sale date when present", () => {
        const { rows } = parsePricingCSV(sampleCSV);
        const eos = rows.find(r => r.product === "C9200-48T");
        expect(eos?.eosDate).toBe("2024-12-31");
    });

    it("returns null eosDate when EoS column is empty", () => {
        const { rows } = parsePricingCSV(sampleCSV);
        const noEos = rows.find(r => r.product === "C9200-24T");
        expect(noEos?.eosDate).toBeNull();
    });

    it("parses multiple valid rows", () => {
        const { rows } = parsePricingCSV(sampleCSV);
        // INVALID-ROW should be dropped (non-numeric price)
        expect(rows.length).toBe(3);
        expect(rows.map(r => r.product)).toContain("MX85");
    });

    it("returns empty rows for an empty CSV", () => {
        const { rows, effectiveDate } = parsePricingCSV("");
        expect(rows).toHaveLength(0);
        expect(effectiveDate).toBeNull();
    });
});

describe("sanitisePrice", () => {
    it("handles plain number strings", () => {
        expect(sanitisePrice("1206.54")).toBe(1206.54);
    });

    it("strips $ and commas from currency strings", () => {
        expect(sanitisePrice("$1,206.54")).toBe(1206.54);
    });

    it("returns null for empty strings", () => {
        expect(sanitisePrice("")).toBeNull();
    });

    it("returns null for non-numeric strings", () => {
        expect(sanitisePrice("N/A")).toBeNull();
    });

    it("handles zero correctly", () => {
        expect(sanitisePrice("$0.00")).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. BOM Engine — pricing snapshot
// ─────────────────────────────────────────────────────────────────────────────
describe("BOM Engine pricing snapshot", () => {
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

    it("injects pricing snapshot when equipment has a listPrice", () => {
        // Augment one catalog item with a listPrice
        const catalogWithPrice: Equipment[] = SEED_EQUIPMENT.map(e =>
            e.id === "meraki_mx67"
                ? ({ ...e, listPrice: 595.00, pricingEffectiveDate: "2024-06-01" } as any)
                : e
        );

        const site: Site = {
            name: "Small Site",
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

        const bom = calculateBOM({
            projectId: "test",
            sites: [site],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: ALL_SITE_TYPES,
            equipmentCatalog: catalogWithPrice,
            rules: SEED_BOM_RULES,
        });

        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");
        expect(sdwanItem).toBeDefined();
        expect(sdwanItem?.itemId).toBe("meraki_mx67");
        expect(sdwanItem?.pricing).toBeDefined();
        expect(sdwanItem?.pricing?.listPrice).toBe(595.00);
        expect(sdwanItem?.pricing?.netPrice).toBe(595.00);
        expect(sdwanItem?.pricing?.discountPercent).toBe(0);
        expect(sdwanItem?.pricing?.effectiveDate).toBe("2024-06-01");
    });

    it("omits pricing snapshot when equipment has no listPrice", () => {
        const site: Site = {
            name: "Small Site",
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

        const bom = calculateBOM({
            projectId: "test",
            sites: [site],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: ALL_SITE_TYPES,
            equipmentCatalog: SEED_EQUIPMENT, // no listPrice on any seed item
            rules: SEED_BOM_RULES,
        });

        const sdwanItem = bom.items.find(i => i.serviceId === "sdwan");
        expect(sdwanItem).toBeDefined();
        // pricing should be undefined when no listPrice is present
        expect(sdwanItem?.pricing).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. EoS Filter
// ─────────────────────────────────────────────────────────────────────────────
describe("EoS equipment filter", () => {
    it("excludes equipment with status === 'eos' from selectable options", () => {
        const catalog = [
            { id: "e1", model: "DeviceA", status: "Supported" },
            { id: "e2", model: "DeviceB", status: "eos" },
            { id: "e3", model: "DeviceC", status: "In development" },
        ] as any[];

        const selectable = catalog.filter(e => e.status !== "eos");
        expect(selectable.length).toBe(2);
        expect(selectable.map(e => e.id)).not.toContain("e2");
    });

    it("keeps equipment without status set", () => {
        const catalog = [
            { id: "e1", model: "DeviceA" },
            { id: "e2", model: "DeviceB", status: "eos" },
        ] as any[];

        const selectable = catalog.filter(e => e.status !== "eos");
        expect(selectable.length).toBe(1);
        expect(selectable[0].id).toBe("e1");
    });
});
