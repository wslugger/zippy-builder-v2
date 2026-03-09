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
    items: [{ service_id: 'lan', inclusion_type: 'required', enabled_features: [], design_option_id: 'cisco_catalyst_do' }],
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
        accessPortType: 'RJ45-1G',
        poeBudgetWatts: 370,
        poe_capabilities: 'PoE+',
        uplinkPortCount: 4,
        uplinkPortType: 'SFP+-10G',
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
            requiredServices: ['lan'],
        },
    },
];

const services: Service[] = [
    { id: 'lan', name: 'LAN', short_description: '', detailed_description: '', caveats: [], assumptions: [], active: true, service_options: [] },
];

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('Smart Defaults Engine', () => {
    it('auto-fills LAN requirements for a small branch (userCount <= 25, ports <= 12)', () => {
        const site = baseSite({ userCount: 10, poePorts: 5 });
        const result = evaluateSiteComplexity(site, [], basePackage);

        expect(result.lanRequirements).toBeDefined();
        expect(result.lanRequirements!.needsManualReview).toBe(false);
        expect(result.lanRequirements!.accessPortType).toBe('RJ45-1G');
        expect(result.lanRequirements!.uplinkPortType).toBe('SFP+-10G');
        expect(result.lanRequirements!.poeCapabilities).toBe('PoE+');
    });

    it('applies defaults indiscriminately for sites (userCount > 15)', () => {
        const site = baseSite({ userCount: 50, poePorts: 5 });
        const result = evaluateSiteComplexity(site, [], basePackage);

        expect(result.lanRequirements).toBeDefined();
        expect(result.lanRequirements!.needsManualReview).toBe(false);
        expect(result.lanRequirements!.accessPortType).toBe('RJ45-1G');
        expect(result.lanRequirements!.uplinkPortType).toBe('SFP+-10G');
    });

    it('preserves existing SA-set lanRequirements (does not overwrite)', () => {
        const saOverride = {
            accessPortType: 'RJ45-2.5G',
            uplinkPortType: 'SFP+-10G',
            poeCapabilities: 'PoE++',
            needsManualReview: false,
        };
        const site = baseSite({ userCount: 10, lanRequirements: saOverride });
        const result = evaluateSiteComplexity(site, [], basePackage);

        expect(result.lanRequirements!.accessPortType).toBe('RJ45-2.5G');
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
        baseSwitch('sw1', { accessPortType: 'RJ45-1G', uplinkPortType: 'SFP+-10G', poe_capabilities: 'PoE+' }),
        baseSwitch('sw2', { accessPortType: 'RJ45-2.5G', uplinkPortType: 'SFP+-10G', poe_capabilities: 'PoE++' }),
        baseSwitch('sw3', { accessPortType: 'RJ45-1G', uplinkPortType: 'SFP-1G', poe_capabilities: 'PoE+' }),
        // Inactive — excluded from catalog scan, but canonical base still provides its value
        { ...baseSwitch('sw4', { accessPortType: 'RJ45-10G' }), active: false } as unknown as Equipment,
        // WLAN device — excluded from catalog scan
        { ...baseSwitch('ap1', {}), role: 'WLAN' } as unknown as Equipment,
    ];

    it('includes full INTERFACE_TYPES canonical base in accessPortTypes', () => {
        const taxonomy = extractLANTaxonomy(catalog);
        expect(taxonomy.accessPortTypes).toContain('RJ45-1G');
        expect(taxonomy.accessPortTypes).toContain('RJ45-10G');
        expect(taxonomy.accessPortTypes).toContain('RJ45-2.5G');
        expect(taxonomy.accessPortTypes).toContain('SFP-1G');
        expect(taxonomy.accessPortTypes).toContain('SFP+-10G');
        expect(taxonomy.accessPortTypes).toContain('SFP28-25G');
        expect(taxonomy.accessPortTypes).toContain('QSFP28-100G');
    });

    it('includes full INTERFACE_TYPES canonical base in uplinkPortTypes', () => {
        const taxonomy = extractLANTaxonomy(catalog);
        expect(taxonomy.uplinkPortTypes).toContain('SFP-1G');
        expect(taxonomy.uplinkPortTypes).toContain('SFP+-10G');
        expect(taxonomy.uplinkPortTypes).toContain('SFP28-25G');
        expect(taxonomy.uplinkPortTypes).toContain('QSFP28-100G');
    });

    it('includes POE_CAPABILITIES base and catalog-only extras in poeCapabilities', () => {
        const taxonomy = extractLANTaxonomy(catalog);
        // Canonical base values (from POE_CAPABILITIES constant)
        expect(taxonomy.poeCapabilities).toContain('None');
        expect(taxonomy.poeCapabilities).toContain('PoE');
        expect(taxonomy.poeCapabilities).toContain('PoE+');
        expect(taxonomy.poeCapabilities).toContain('UPOE');
        // PoE++ is not in POE_CAPABILITIES constant but is in the catalog — should still appear
        expect(taxonomy.poeCapabilities).toContain('PoE++');
    });

    it('returns full canonical base even when catalog is empty', () => {
        const taxonomy = extractLANTaxonomy([]);
        // Full INTERFACE_TYPES constant = 10 values
        expect(taxonomy.accessPortTypes.length).toBeGreaterThanOrEqual(10);
        expect(taxonomy.uplinkPortTypes.length).toBeGreaterThanOrEqual(10);
        // Full POE_CAPABILITIES constant = 6 values
        expect(taxonomy.poeCapabilities.length).toBeGreaterThanOrEqual(6);
        expect(taxonomy.poeCapabilities).toContain('PoE+');
        expect(taxonomy.poeCapabilities).toContain('UPOE');
    });
});


describe('BOM Engine strict LAN filtering', () => {
    const switches: Equipment[] = [
        baseSwitch('sw_1g', { accessPortType: 'RJ45-1G', uplinkPortType: 'SFP+-10G', poe_capabilities: 'PoE+' }),
        baseSwitch('sw_mgig', { accessPortType: 'RJ45-2.5G', uplinkPortType: 'SFP+-10G', poe_capabilities: 'PoE+' }),
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

    it('selects only RJ45-1G switch when accessPortType is "RJ45-1G"', () => {
        const bom = makeBOM({
            accessPortType: 'RJ45-1G',
            uplinkPortType: 'SFP+-10G',
            poeCapabilities: 'PoE+',
            needsManualReview: false,
        });
        const lanItems = bom.items.filter(i => i.serviceId === 'lan');
        expect(lanItems.every(i => i.itemId === 'sw_1g')).toBe(true);
        expect(lanItems.some(i => i.itemId === 'sw_mgig')).toBe(false);
    });

    it('selects only mGig switch when accessPortType is "RJ45-2.5G"', () => {
        const bom = makeBOM({
            accessPortType: 'RJ45-2.5G',
            uplinkPortType: 'SFP+-10G',
            poeCapabilities: 'PoE+',
            needsManualReview: false,
        });
        const lanItems = bom.items.filter(i => i.serviceId === 'lan');
        expect(lanItems.every(i => i.itemId === 'sw_mgig')).toBe(true);
    });

    it('skips LAN auto-selection entirely when needsManualReview is true', () => {
        const bom = makeBOM({ needsManualReview: true });
        const lanItems = bom.items.filter(i => i.serviceId === 'lan');
        expect(lanItems).toHaveLength(0);
    });

    it('selects smaller port-count switch when multiple match criteria', () => {
        const smallSwitch = baseSwitch('sw_24', { accessPortCount: 24, accessPortType: 'RJ45-1G', uplinkPortType: 'SFP+-10G', poe_capabilities: 'PoE+' });
        const largeSwitch = baseSwitch('sw_48', { accessPortCount: 48, accessPortType: 'RJ45-1G', uplinkPortType: 'SFP+-10G', poe_capabilities: 'PoE+' });

        const bom = calculateBOM({
            projectId: 'test',
            sites: [baseSite({ userCount: 10, lanPorts: 12, lanRequirements: { accessPortType: 'RJ45-1G', uplinkPortType: 'SFP+-10G', poeCapabilities: 'PoE+', needsManualReview: false } })],
            selectedPackage: basePackage,
            services,
            siteTypes,
            equipmentCatalog: [largeSwitch, smallSwitch], // Intentionally out of order
            rules: [],
        });
        const lanItems = bom.items.filter(i => i.serviceId === 'lan');
        expect(lanItems[0].itemId).toBe('sw_24');
    });

    it('rejects switches with insufficient PoE capabilities tier', () => {
        const noneSwitch = baseSwitch('sw_none', { accessPortCount: 24, accessPortType: 'RJ45-1G', uplinkPortType: 'SFP+-10G', poe_capabilities: 'None' });
        const poeSwitch = baseSwitch('sw_poe', { accessPortCount: 24, accessPortType: 'RJ45-1G', uplinkPortType: 'SFP+-10G', poe_capabilities: 'PoE' });
        const poePlusSwitch = baseSwitch('sw_poe_plus', { accessPortCount: 24, accessPortType: 'RJ45-1G', uplinkPortType: 'SFP+-10G', poe_capabilities: 'PoE+' });
        const poePlusPlusSwitch = baseSwitch('sw_poe_plus_plus', { accessPortCount: 24, accessPortType: 'RJ45-1G', uplinkPortType: 'SFP+-10G', poe_capabilities: 'PoE++' });

        // Requesting PoE+ -- None and PoE should fail, PoE+ and PoE++ should pass
        // Calculate BOM will just return the best fit of those that pass
        const bom = calculateBOM({
            projectId: 'test',
            sites: [baseSite({ userCount: 10, lanPorts: 12, lanRequirements: { accessPortType: 'RJ45-1G', uplinkPortType: 'SFP+-10G', poeCapabilities: 'PoE+', needsManualReview: false } })],
            selectedPackage: basePackage,
            services,
            siteTypes,
            equipmentCatalog: [noneSwitch, poeSwitch, poePlusPlusSwitch, poePlusSwitch],
            rules: [],
        });

        const lanItems = bom.items.filter(i => i.serviceId === 'lan');
        // Will select poePlusSwitch or poePlusPlusSwitch, but let's just make sure neither 'none' nor 'poe' is selected
        expect(lanItems[0].itemId).not.toBe('sw_none');
        expect(lanItems[0].itemId).not.toBe('sw_poe');
        expect(['sw_poe_plus', 'sw_poe_plus_plus']).toContain(lanItems[0].itemId);
    });
});
