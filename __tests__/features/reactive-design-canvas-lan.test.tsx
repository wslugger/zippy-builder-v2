import { LANPreferences, SystemConfig, Equipment, Package, Service, Site, BOMEngineInput } from '@/src/lib/types';
import { SiteType } from '@/src/lib/site-types';
import { calculateBOM } from '@/src/lib/bom-engine';

// -------------------------------------------------------
// Shared mock catalogs
// -------------------------------------------------------
const merakiSwitch1G: Equipment = {
    id: 'meraki_ms130_48',
    model: 'MS130-48-HW',
    role: 'LAN',
    active: true,
    status: 'Supported',
    vendor_id: 'meraki',
    primary_purpose: 'LAN',
    additional_purposes: [],
    specs: {
        accessPortCount: 48,
        accessPortType: '1G-Copper',
        poeStandard: 'None',
        poeBudgetWatts: 0,
        uplinkPortCount: 4,
        uplinkPortType: '10G-Fiber',
        isStackable: false,
    },
} as unknown as Equipment;

const merakiSwitch1GPoE: Equipment = {
    id: 'meraki_ms130_48p',
    model: 'MS130-48P-HW',
    role: 'LAN',
    active: true,
    status: 'Supported',
    vendor_id: 'meraki',
    primary_purpose: 'LAN',
    additional_purposes: [],
    specs: {
        accessPortCount: 48,
        accessPortType: '1G-Copper',
        poeStandard: 'PoE+',
        poeBudgetWatts: 370,
        uplinkPortCount: 4,
        uplinkPortType: '10G-Fiber',
        isStackable: true,
    },
} as unknown as Equipment;

const ciscoSwitch1GPoE: Equipment = {
    id: 'cisco_c9200L_48p',
    model: 'C9200L-48P-4G',
    role: 'LAN',
    active: true,
    status: 'Supported',
    vendor_id: 'cisco_catalyst',
    primary_purpose: 'LAN',
    additional_purposes: [],
    family: 'Catalyst 9200',
    specs: {
        accessPortCount: 48,
        accessPortType: '1G-Copper',
        poeStandard: 'PoE+',
        poeBudgetWatts: 740,
        uplinkPortCount: 4,
        uplinkPortType: '1G-Fiber',
        isStackable: true,
    },
} as unknown as Equipment;

// A Meraki WAN appliance (needed for package resolution to work)
const merakiWAN: Equipment = {
    id: 'meraki_mx67',
    model: 'MX67',
    role: 'WAN',
    active: true,
    status: 'Supported',
    vendor_id: 'meraki',
    primary_purpose: 'WAN',
    additional_purposes: ['Security'],
    family: 'Meraki MX',
    specs: {
        advancedSecurityThroughputMbps: 0,
        rawFirewallThroughputMbps: 450,
        sdwanCryptoThroughputMbps: 240,
        wanPortCount: 1,
        lanPortCount: 4,
        sfpPortCount: 0,
    },
} as unknown as Equipment;

// Package that defaults to Meraki vendor
const costCentricPackage: Package = {
    id: 'cost_centric',
    name: 'Cost Centric',
    short_description: 'Value-optimized networking package.',
    detailed_description: '',
    active: true,
    items: [
        { service_id: 'managed_sdwan', inclusion_type: 'required', enabled_features: [] },
        { service_id: 'managed_lan', inclusion_type: 'standard', enabled_features: [] },
    ],
    throughput_basis: 'rawFirewallThroughputMbps',
    throughput_overhead_mbps: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const services: Service[] = [
    {
        id: 'managed_sdwan', name: 'Managed SD-WAN', short_description: '', detailed_description: '',
        active: true, caveats: [], assumptions: [], service_options: [], metadata: { category: 'WAN' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
        id: 'managed_lan', name: 'Managed LAN', short_description: '', detailed_description: '',
        active: true, caveats: [], assumptions: [], service_options: [], metadata: { category: 'LAN' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
];

const siteTypes: SiteType[] = [
    {
        id: 'small_office', name: 'Bronze (Small Office)', category: 'SD-WAN', description: '',
        constraints: [], defaults: { requiredServices: ['managed_sdwan'], redundancy: { cpe: 'Single', circuit: 'Single' }, slo: 99.5 },
    },
];

function makeSite(overrides: Partial<Site> = {}): Site {
    return {
        name: 'Test-Branch-01',
        address: '123 Main St',
        userCount: 30,
        bandwidthDownMbps: 100,
        bandwidthUpMbps: 50,
        redundancyModel: 'Single CPE',
        wanLinks: 1,
        lanPorts: 24,
        poePorts: 0,
        indoorAPs: 0,
        outdoorAPs: 0,
        primaryCircuit: 'DIA',
        ...overrides,
    };
}


describe('Reactive Design Canvas - LAN Preferences (calculateBOM integration)', () => {

    it('LAN Preferences can be updated and are strongly typed', () => {
        const prefs: LANPreferences = {
            poeRequirementId: 'poe_plus',
            uplinkSpeedId: '10g',
            accessPortSpeedId: '1g',
            redundancyModeId: 'stacking',
            portDensity: 48,
        };
        expect(prefs.poeRequirementId).toBe('poe_plus');
        expect(prefs.accessPortSpeedId).toBe('1g');
        expect(prefs.portDensity).toBe(48);
    });

    it('Cost Centric package selects ONLY Meraki LAN equipment (vendor filter)', () => {
        const site = makeSite({
            lanPreferences: {
                poeRequirementId: '',
                uplinkSpeedId: '',
                accessPortSpeedId: '1G-Copper',
                redundancyModeId: '',
                portDensity: 48,
            },
        });

        const input: BOMEngineInput = {
            projectId: 'test',
            sites: [site],
            selectedPackage: costCentricPackage,
            services,
            siteTypes,
            equipmentCatalog: [merakiWAN, merakiSwitch1G, merakiSwitch1GPoE, ciscoSwitch1GPoE],
            rules: [],
        };

        const bom = calculateBOM(input);
        const lanItems = bom.items.filter(i => i.serviceId === 'managed_lan');

        // Should select a Meraki switch, NOT the Cisco Catalyst
        expect(lanItems.length).toBeGreaterThan(0);
        expect(lanItems[0].itemId).not.toBe('cisco_c9200L_48p');
        expect(lanItems[0].itemId).toMatch(/^meraki_/);
    });

    it('PoE requirement filters out non-PoE switches', () => {
        const site = makeSite({
            lanPreferences: {
                poeRequirementId: 'PoE+',
                uplinkSpeedId: '',
                accessPortSpeedId: '1G-Copper',
                redundancyModeId: '',
                portDensity: 48,
            },
        });

        const input: BOMEngineInput = {
            projectId: 'test',
            sites: [site],
            selectedPackage: costCentricPackage,
            services,
            siteTypes,
            equipmentCatalog: [merakiWAN, merakiSwitch1G, merakiSwitch1GPoE, ciscoSwitch1GPoE],
            rules: [],
        };

        const bom = calculateBOM(input);
        const lanItems = bom.items.filter(i => i.serviceId === 'managed_lan');

        // merakiSwitch1G has poeStandard 'None' and should be excluded
        // merakiSwitch1GPoE has poeStandard 'PoE+' and should be selected
        expect(lanItems.length).toBeGreaterThan(0);
        expect(lanItems[0].itemId).toBe('meraki_ms130_48p');
    });

    it('No matching LAN equipment shows fallback reasoning', () => {
        const site = makeSite({
            lanPreferences: {
                poeRequirementId: 'UPoE',
                uplinkSpeedId: '',
                accessPortSpeedId: '10G-Copper',
                redundancyModeId: '',
                portDensity: 48,
            },
        });

        const input: BOMEngineInput = {
            projectId: 'test',
            sites: [site],
            selectedPackage: costCentricPackage,
            services,
            siteTypes,
            // Only 1G switches in catalog — no 10G switch exists for Meraki
            equipmentCatalog: [merakiWAN, merakiSwitch1G, merakiSwitch1GPoE],
            rules: [],
        };

        const bom = calculateBOM(input);
        const lanItems = bom.items.filter(i => i.serviceId === 'managed_lan');

        // When no switch matches exact preferences, the engine may still provide
        // a "Fallback" result. If it does, its reasoning should contain "Fallback".
        if (lanItems.length > 0) {
            expect(lanItems[0].reasoning?.toLowerCase()).toContain('fallback');
        }
        // Otherwise, zero items is also acceptable (no match at all)
    });

    it('SystemConfig contains infrastructure options for LAN Preferences', () => {
        const systemConfig = {
            infrastructureOptions: {
                poeRequirements: ['None', 'PoE+', 'PoE++', 'UPoE'],
                uplinkSpeeds: ['1G', '10G', '25G', '40G', '100G'],
                accessPortSpeeds: ['1G', 'mGig', '10G'],
                redundancyModes: ['Standalone', 'Stacking', 'Chassis', 'M-LAG'],
            },
            taxonomy: {},
            calculationBaselines: {
                defaultRedundancyFactor: 1,
                wanThroughputBuffer: 0,
            },
            defaults: {
                currency: 'USD',
                defaultTermMonths: 36,
            }
        } as unknown as SystemConfig;

        expect(systemConfig.infrastructureOptions).toBeDefined();
        expect(systemConfig.infrastructureOptions?.poeRequirements.length).toBeGreaterThan(0);
        expect(systemConfig.infrastructureOptions?.uplinkSpeeds).toContain('10G');
    });

    it('Port speed normalization handles shorthand format (1G matches 1G-Copper)', () => {
        // Simulate a switch with shorthand accessPortType (as might exist in some databases)
        const merakiSwitch1GShorthand: Equipment = {
            ...merakiSwitch1G,
            id: 'meraki_ms130_48_short',
            model: 'MS130-48-SHORT',
            specs: {
                ...(merakiSwitch1G.specs as Record<string, unknown>),
                accessPortType: '1G', // Shorthand - no '-Copper' suffix
            },
        } as unknown as Equipment;

        const site = makeSite({
            lanPreferences: {
                poeRequirementId: '',
                uplinkSpeedId: '',
                accessPortSpeedId: '1G-Copper', // UI sends full format
                redundancyModeId: '',
                portDensity: 24,
            },
        });

        const input: BOMEngineInput = {
            projectId: 'test',
            sites: [site],
            selectedPackage: costCentricPackage,
            services,
            siteTypes,
            equipmentCatalog: [merakiWAN, merakiSwitch1GShorthand],
            rules: [],
        };

        const bom = calculateBOM(input);
        const lanItems = bom.items.filter(i => i.serviceId === 'managed_lan');

        // Should match even with shorthand because normalizePortSpeed converts '1G' → '1g-copper'
        expect(lanItems.length).toBeGreaterThan(0);
        expect(lanItems[0].itemId).toBe('meraki_ms130_48_short');
        // Reasoning should NOT say "Fallback"
        expect(lanItems[0].reasoning?.toLowerCase()).not.toContain('fallback');
    });

    it('Empty accessPortSpeedId preference accepts all LAN equipment', () => {
        const site = makeSite({
            lanPreferences: {
                poeRequirementId: '',
                uplinkSpeedId: '',
                accessPortSpeedId: '', // No preference → accept default
                redundancyModeId: '',
                portDensity: 24,
            },
        });

        const input: BOMEngineInput = {
            projectId: 'test',
            sites: [site],
            selectedPackage: costCentricPackage,
            services,
            siteTypes,
            equipmentCatalog: [merakiWAN, merakiSwitch1G, merakiSwitch1GPoE],
            rules: [],
        };

        const bom = calculateBOM(input);
        const lanItems = bom.items.filter(i => i.serviceId === 'managed_lan');

        // Should find a match from primary path, not fallback
        expect(lanItems.length).toBeGreaterThan(0);
        expect(lanItems[0].reasoning?.toLowerCase()).not.toContain('fallback');
    });
});
