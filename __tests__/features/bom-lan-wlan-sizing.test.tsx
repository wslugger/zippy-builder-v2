/* eslint-disable @typescript-eslint/no-explicit-any */
import { calculateBOM } from "@/src/lib/bom-engine";
import { Equipment, Site, Package, Service, SiteType } from "@/src/lib/types";

describe("BOM Engine - LAN/WLAN Sizing Logic", () => {
    const mockEquipmentCatalog: Equipment[] = [
        // APs
        {
            id: "ap_standard",
            model: "AP Standard",
            vendor_id: "meraki",
            role: "WLAN", primary_purpose: "WLAN", additional_purposes: [], active: true, status: "Supported",
            specs: {
                wifiStandard: 'Wi-Fi 6',
                mimoBandwidth: '2x2',
                powerDrawWatts: 15,
                uplinkType: '1G-Copper',
                environment: 'Indoor'
            } as any
        },
        {
            id: "ap_mgig",
            model: "AP mGig High Power",
            vendor_id: "meraki",
            role: "WLAN", primary_purpose: "WLAN", additional_purposes: [], active: true, status: "Supported",
            specs: {
                wifiStandard: 'Wi-Fi 6E',
                mimoBandwidth: '4x4',
                powerDrawWatts: 30, // Needs more PoE
                uplinkType: 'mGig-Copper',
                environment: 'Indoor'
            } as any
        },
        // Switches
        {
            id: "sw_24p_poe_1g",
            model: "SW 24 Port PoE 1G",
            vendor_id: "meraki",
            role: "LAN", primary_purpose: "LAN", additional_purposes: [], active: true, status: "Supported",
            specs: {
                accessPortCount: 24,
                accessPortType: '1G-Copper',
                poeBudgetWatts: 370,
                poeStandard: 'PoE+',
                uplinkPortCount: 4,
                uplinkPortType: '10G-Fiber',
                isStackable: true
            } as any
        },
        {
            id: "sw_24p_poe_mgig",
            model: "SW 24 Port PoE mGig",
            vendor_id: "meraki",
            role: "LAN", primary_purpose: "LAN", additional_purposes: [], active: true, status: "Supported",
            specs: {
                accessPortCount: 24,
                accessPortType: 'mGig-Copper',
                poeBudgetWatts: 740,
                poeStandard: 'PoE+',
                uplinkPortCount: 4,
                uplinkPortType: '10G-Fiber',
                isStackable: true
            } as any
        },
        {
            id: "sw_single_non_stackable",
            model: "Standalone 24P",
            vendor_id: "meraki",
            role: "LAN", primary_purpose: "LAN", additional_purposes: [], active: true, status: "Supported",
            specs: {
                accessPortCount: 24,
                accessPortType: '1G-Copper',
                poeBudgetWatts: 100, // Small PoE budget
                poeStandard: 'PoE+',
                uplinkPortCount: 4,
                uplinkPortType: '1G-Copper',
                isStackable: false
            } as any
        }
    ];

    const mockPackage: Package = {
        id: "pkg_lan_wlan",
        name: "LAN & WLAN Package",
        short_description: "",
        detailed_description: "",
        active: true,
        items: [
            { service_id: "managed_wlan", inclusion_type: "required", enabled_features: [] },
            { service_id: "managed_lan", inclusion_type: "required", enabled_features: [] }
        ],
        throughput_basis: "sdwanCryptoThroughputMbps"
    };

    const mockServices: Service[] = [
        { id: "managed_lan", name: "Managed LAN", short_description: "", detailed_description: "", caveats: [], assumptions: [], active: true, service_options: [] },
        { id: "managed_wlan", name: "Managed WLAN", short_description: "", detailed_description: "", caveats: [], assumptions: [], active: true, service_options: [] }
    ];

    const mockSiteTypes: SiteType[] = [
        {
            id: "generic",
            name: "Generic Branch",
            category: "SD-WAN",
            description: "",
            constraints: [],
            defaults: { redundancy: { cpe: "Single", circuit: "Single" }, slo: 99.9, requiredServices: ["managed_lan", "managed_wlan"] }
        }
    ];

    const projectId = "test_proj";

    it("sizes LAN switch mGig ports based on AP uplinkType", () => {
        const site: Site = {
            id: "site1",
            name: "mGig Site",
            address: "",
            userCount: 10,
            bandwidthDownMbps: 0,
            bandwidthUpMbps: 0,
            redundancyModel: "Single CPE",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 5,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const bom = calculateBOM({
            projectId,
            sites: [site],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: mockSiteTypes,
            equipmentCatalog: mockEquipmentCatalog,
            rules: []
        });

        // AP should be standard/mgig depending on availability (first match is standard)
        // Wait, I should probably use a rule or ensure the best fit logic works.
        // For WLAN, it currently just picks the first one matching role.

        // Find the WLAN item
        const wlanItem = bom.items.find(i => i.serviceId === "managed_wlan");
        // Manually setting the scenario where AP mGig is selected if we want to test switch matching
        // Actually, the automatic logic should pick 'ap_standard' first since it's first in catalog.

        // Let's force mGig selection via a mock catalog where ONLY mGig AP is available or via manual selection
        const mgigOnlyCatalog = mockEquipmentCatalog.filter(e => e.id !== "ap_standard");

        const bomMgig = calculateBOM({
            projectId,
            sites: [site],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: mockSiteTypes,
            equipmentCatalog: mgigOnlyCatalog,
            rules: []
        });

        const lanItem = bomMgig.items.find(i => i.serviceId === "managed_lan");
        expect(lanItem?.itemId).toBe("sw_24p_poe_mgig");
    });

    it("stacks switches when PoE budget is exceeded", () => {
        const site: Site = {
            id: "site2",
            name: "High PoE Load",
            address: "",
            userCount: 5,
            bandwidthDownMbps: 0,
            bandwidthUpMbps: 0,
            redundancyModel: "Single CPE",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 40, // 40 * 15W = 600W
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        // Use a catalog where only the low-PoE switch and 1G PoE switch are available
        // ap_standard (15W, 1G-Copper)
        const catalog = [
            mockEquipmentCatalog.find(e => e.id === "ap_standard")!,
            mockEquipmentCatalog.find(e => e.id === "sw_single_non_stackable")!, // 100W budget, non-stackable, 1G-Copper
            mockEquipmentCatalog.find(e => e.id === "sw_24p_poe_1g")!, // 370W budget, stackable, 1G-Copper
        ];

        const bom = calculateBOM({
            projectId,
            sites: [site],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: mockSiteTypes,
            equipmentCatalog: catalog,
            rules: []
        });

        const lanItem = bom.items.find(i => i.serviceId === "managed_lan");

        // It should NOT pick sw_single_non_stackable because 600W > 100W and it can't stack.
        // It SHOULD pick sw_24p_poe_1g.
        // 600W / 370W = 1.62 -> 2 switches.
        expect(lanItem?.itemId).toBe("sw_24p_poe_1g");
        expect(lanItem?.quantity).toBe(2);
    });

    it("adds fiber transceiver note to reasoning if uplink type is Fiber", () => {
        const site: Site = {
            id: "site3",
            name: "Fiber Site",
            address: "",
            userCount: 10,
            bandwidthDownMbps: 0,
            bandwidthUpMbps: 0,
            redundancyModel: "Single CPE",
            wanLinks: 1,
            lanPorts: 0,
            poePorts: 0,
            indoorAPs: 1,
            outdoorAPs: 0,
            primaryCircuit: "DIA"
        };

        const bom = calculateBOM({
            projectId,
            sites: [site],
            selectedPackage: mockPackage,
            services: mockServices,
            siteTypes: mockSiteTypes,
            equipmentCatalog: mockEquipmentCatalog,
            rules: []
        });

        const lanItem = bom.items.find(i => i.serviceId === "managed_lan");
        // sw_24p_poe_1g has uplinkPortType: '10G-Fiber'
        expect(lanItem?.reasoning?.toLowerCase()).toContain("transceiver");
    });
});
