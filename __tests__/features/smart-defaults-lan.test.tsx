/**
 * Feature: Smart Defaults Engine & Exception-Based LAN UI
 *
 * Verifies:
 * 1. Small sites (userCount <= 15) receive auto-filled LAN requirements
 * 2. Complex sites are flagged for manual SA review
 * 3. Existing SA-set lanRequirements are preserved (not overwritten)
 * 4. extractLANTaxonomy extracts correct unique arrays
 * 5. calculateBOM strict filter: only matching-spec switches are selected
 */

import { evaluateSiteComplexity } from '@/src/lib/bom-engine';
import { extractLANTaxonomy } from '@/src/lib/bom-utils';
import { calculateBOM } from '@/src/lib/bom-engine';
import { Site, Equipment, Package, Service, SiteType } from '@/src/lib/types';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const basePackage: Package = {
    id: 'pkg_lan',
    name: 'LAN Package',
    short_description: '',
    detailed_description: '',
    active: true,
    items: [{ service_id: 'managed_lan', inclusion_type: 'required', enabled_features: [] }],
    throughput_basis: 'sdwanCryptoThroughputMbps',
};

const baseSite = (overrides: Partial<Site> = {}): Site => ({
    id: 'site1',
    name: 'Test Site',
    address: '1 Main St',
    userCount: 10,
    bandwidthDownMbps: 100,
    bandwidthUpMbps: 100,
    redundancyModel: 'Single CPE',
    wanLinks: 1,
    lanPorts: 10,
    poePorts: 0,
    indoorAPs: 0,
    outdoorAPs: 0,
    primaryCircuit: 'DIA',
    ...overrides,
});

const baseSwitch = (id: string, extra: Record<string, unknown> = {}): Equipment => ({
    id,
    model: `Switch ${id}`,
    vendor_id: 'cisco_catalyst',
    role: 'LAN',
    primary_purpose: 'LAN',
    additional_purposes: [],
    active: true,
    status: 'Supported',
    specs: {
        accessPortCount: 24,
        accessPortType: '1G-Copper',
        poeBudgetWatts: 370,
        poe_capabilities: 'PoE+',
        uplinkPortCount: 4,
        uplinkPortType: '10G-Fiber',
        isStackable: true,
        ...extra,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

const siteTypes: SiteType[] = [
    {
        id: 'generic',
        name: 'Generic Branch',
        category: 'SD-WAN',
        description: '',
        constraints: [],
        defaults: {
            redundancy: { cpe: 'Single', circuit: 'Single' },
            slo: 99.9,
            requiredServices: ['managed_lan'],
        },
    },
];

const services: Service[] = [
    { id: 'managed_lan', name: 'Managed LAN', short_description: '', detailed_description: '', caveats: [], assumptions: [], active: true, service_options: [] },
];

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('Smart Defaults Engine', () => {
    it('auto-fills LAN requirements for a small branch (userCount <= 15)', () => {
        const site = baseSite({ userCount: 10 });
        const result = evaluateSiteComplexity(site, [], basePackage);

        expect(result.lanRequirements).toBeDefined();
        expect(result.lanRequirements!.needsManualReview).toBe(false);
        expect(result.lanRequirements!.accessPortType).toBe('1G-Copper');
        expect(result.lanRequirements!.uplinkPortType).toBe('10G-Fiber');
        expect(result.lanRequirements!.poeCapabilities).toBe('PoE+');
    });

    it('flags complex sites (userCount > 15) for manual review', () => {
        const site = baseSite({ userCount: 50 });
        const result = evaluateSiteComplexity(site, [], basePackage);

        expect(result.lanRequirements).toBeDefined();
        expect(result.lanRequirements!.needsManualReview).toBe(true);
        expect(result.lanRequirements!.accessPortType).toBeUndefined();
        expect(result.lanRequirements!.uplinkPortType).toBeUndefined();
    });

    it('preserves existing SA-set lanRequirements (does not overwrite)', () => {
        const saOverride = {
            accessPortType: 'mGig-Copper',
            uplinkPortType: '10G-Fiber',
            poeCapabilities: 'PoE++',
            needsManualReview: false,
        };
        const site = baseSite({ userCount: 10, lanRequirements: saOverride });
        const result = evaluateSiteComplexity(site, [], basePackage);

        expect(result.lanRequirements!.accessPortType).toBe('mGig-Copper');
        expect(result.lanRequirements!.poeCapabilities).toBe('PoE++');
    });

    it('also returns needsManualReview=false for userCount exactly 15 (boundary)', () => {
        const site = baseSite({ userCount: 15 });
        const result = evaluateSiteComplexity(site, [], basePackage);
        expect(result.lanRequirements!.needsManualReview).toBe(false);
    });
});

describe('extractLANTaxonomy', () => {
    const catalog: Equipment[] = [
        baseSwitch('sw1', { accessPortType: '1G-Copper', uplinkPortType: '10G-Fiber', poe_capabilities: 'PoE+' }),
        baseSwitch('sw2', { accessPortType: 'mGig-Copper', uplinkPortType: '10G-Fiber', poe_capabilities: 'PoE++' }),
        baseSwitch('sw3', { accessPortType: '1G-Copper', uplinkPortType: '1G-Fiber', poe_capabilities: 'PoE+' }),
        // Inactive — should be excluded
        { ...baseSwitch('sw4', { accessPortType: '10G-Copper' }), active: false } as unknown as Equipment,
        // WLAN device — should be excluded
        { ...baseSwitch('ap1', {}), role: 'WLAN' } as unknown as Equipment,
    ];

    it('returns unique, sorted accessPortTypes from active LAN equipment', () => {
        const taxonomy = extractLANTaxonomy(catalog);
        expect(taxonomy.accessPortTypes).toEqual(['1G-Copper', 'mGig-Copper']);
    });

    it('returns unique, sorted uplinkPortTypes', () => {
        const taxonomy = extractLANTaxonomy(catalog);
        expect(taxonomy.uplinkPortTypes).toEqual(['10G-Fiber', '1G-Fiber']);
    });

    it('returns unique, sorted poeCapabilities', () => {
        const taxonomy = extractLANTaxonomy(catalog);
        expect(taxonomy.poeCapabilities).toEqual(['PoE+', 'PoE++']);
    });

    it('returns empty arrays if no active LAN equipment in catalog', () => {
        const taxonomy = extractLANTaxonomy([]);
        expect(taxonomy.accessPortTypes).toHaveLength(0);
        expect(taxonomy.uplinkPortTypes).toHaveLength(0);
        expect(taxonomy.poeCapabilities).toHaveLength(0);
    });
});

describe('BOM Engine strict LAN filtering', () => {
    const switches: Equipment[] = [
        baseSwitch('sw_1g', { accessPortType: '1G-Copper', uplinkPortType: '10G-Fiber', poe_capabilities: 'PoE+' }),
        baseSwitch('sw_mgig', { accessPortType: 'mGig-Copper', uplinkPortType: '10G-Fiber', poe_capabilities: 'PoE+' }),
    ];

    const makeBOM = (lanReq: Site['lanRequirements']) =>
        calculateBOM({
            projectId: 'test',
            sites: [baseSite({ userCount: 10, lanRequirements: lanReq })],
            selectedPackage: basePackage,
            services,
            siteTypes,
            equipmentCatalog: switches,
            rules: [],
        });

    it('selects only 1G-Copper switch when accessPortType is "1G-Copper"', () => {
        const bom = makeBOM({
            accessPortType: '1G-Copper',
            uplinkPortType: '10G-Fiber',
            poeCapabilities: 'PoE+',
            needsManualReview: false,
        });
        const lanItems = bom.items.filter(i => i.serviceId === 'managed_lan');
        expect(lanItems.every(i => i.itemId === 'sw_1g')).toBe(true);
        expect(lanItems.some(i => i.itemId === 'sw_mgig')).toBe(false);
    });

    it('selects only mGig switch when accessPortType is "mGig-Copper"', () => {
        const bom = makeBOM({
            accessPortType: 'mGig-Copper',
            uplinkPortType: '10G-Fiber',
            poeCapabilities: 'PoE+',
            needsManualReview: false,
        });
        const lanItems = bom.items.filter(i => i.serviceId === 'managed_lan');
        expect(lanItems.every(i => i.itemId === 'sw_mgig')).toBe(true);
    });

    it('skips LAN auto-selection entirely when needsManualReview is true', () => {
        const bom = makeBOM({ needsManualReview: true });
        const lanItems = bom.items.filter(i => i.serviceId === 'managed_lan');
        expect(lanItems).toHaveLength(0);
    });
});
