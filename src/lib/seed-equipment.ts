import { Equipment } from "./types";

export const SEED_EQUIPMENT: Equipment[] = [
    // --- Meraki SD-WAN ---
    {
        id: "meraki_mx67",
        vendor_id: "meraki",
        model: "MX67",
        active: true,
        status: "Supported",
        primary_purpose: "WAN", role: "WAN", additional_purposes: ["Security"],
        family: "Meraki MX",
        description: "Entry-level SD-WAN appliance for small branches.",
        specs: {
            advancedSecurityThroughputMbps: 0,
            rawFirewallThroughputMbps: 450,
            sdwanCryptoThroughputMbps: 240, // Reduced to trigger MX68 for 300Mbps aggregate site
            wanPortCount: 1,
            lanPortCount: 4,
            sfpPortCount: 0
        },
        images: ["/assets/equipment/meraki_mx67.png"]
    },
    {
        id: "meraki_mx68",
        vendor_id: "meraki",
        model: "MX68",
        active: true,
        status: "Supported",
        primary_purpose: "WAN", role: "WAN", additional_purposes: ["Security"],
        family: "Meraki MX",
        description: "Small branch appliance with more ports and PoE.",
        specs: {
            advancedSecurityThroughputMbps: 0,
            rawFirewallThroughputMbps: 600,
            sdwanCryptoThroughputMbps: 500, // Enough for 300Mbps aggregate test
            wanPortCount: 2,
            lanPortCount: 10,
            sfpPortCount: 0,
            poe_budget: 60
        },
        images: ["/assets/equipment/meraki_mx68.png"]
    },
    {
        id: "meraki_mx85",
        vendor_id: "meraki",
        model: "MX85",
        active: true,
        status: "Supported",
        primary_purpose: "WAN", role: "WAN", additional_purposes: ["Security"],
        family: "Meraki MX",
        description: "Mid-range SD-WAN appliance for medium branches.",
        specs: {
            advancedSecurityThroughputMbps: 0,
            rawFirewallThroughputMbps: 1000,
            sdwanCryptoThroughputMbps: 1000,
            wanPortCount: 4,
            lanPortCount: 8,
            sfpPortCount: 2
        },
        images: ["/assets/equipment/meraki_mx85.png"]
    },
    {
        id: "meraki_mx105",
        vendor_id: "meraki",
        model: "MX105",
        active: true,
        status: "Supported",
        primary_purpose: "WAN", role: "WAN", additional_purposes: ["Security"],
        family: "Meraki MX",
        description: "High-performance SD-WAN appliance for large branches.",
        specs: {
            advancedSecurityThroughputMbps: 0,
            rawFirewallThroughputMbps: 2000,
            sdwanCryptoThroughputMbps: 1500,
            wanPortCount: 4,
            lanPortCount: 4,
            sfpPortCount: 2
        },
        images: ["/assets/equipment/meraki_mx105.png"]
    },
    {
        id: "meraki_mx250",
        vendor_id: "meraki",
        model: "MX250",
        active: true,
        status: "Supported",
        primary_purpose: "WAN", role: "WAN", additional_purposes: ["Security"],
        family: "Meraki MX",
        description: "High-capacity SD-WAN appliance for large-scale deployments.",
        specs: {
            advancedSecurityThroughputMbps: 0,
            rawFirewallThroughputMbps: 4000,
            sdwanCryptoThroughputMbps: 2000,
            wanPortCount: 2,
            lanPortCount: 24,
            sfpPortCount: 8
        },
        images: ["/assets/equipment/meraki_mx250.png"]
    },
    {
        id: "meraki_c8455_g2_mx",
        vendor_id: "meraki",
        model: "C8455-G2-MX",
        active: true,
        status: "Supported",
        primary_purpose: "WAN", role: "WAN", additional_purposes: ["Security"],
        family: "Catalyst 8400",
        description: "Ultra-high performance fixed-platform SD-WAN appliance.",
        specs: {
            advancedSecurityThroughputMbps: 0,
            rawFirewallThroughputMbps: 10000,
            sdwanCryptoThroughputMbps: 5000,
            wanPortCount: 2,
            lanPortCount: 8,
            sfpPortCount: 2
        },
        images: ["/assets/equipment/cisco_c8455.png"]
    },

    // --- Cisco Catalyst Switches (Managed LAN) ---
    {
        id: "cisco_c9200L_24p",
        vendor_id: "cisco_catalyst",
        model: "C9200L-24P-4G",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Catalyst 9200",
        description: "Stackable enterprise access switch with 24 PoE+ ports.",
        specs: {
            accessPortCount: 24,
            accessPortType: '1G-Copper',
            poeBudgetWatts: 370,
            poeStandard: 'PoE+',
            uplinkPortCount: 4,
            uplinkPortType: '1G-Fiber',
            isStackable: true
        }
    },
    {
        id: "cisco_c9200L_48p",
        vendor_id: "cisco_catalyst",
        model: "C9200L-48P-4G",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Catalyst 9200",
        description: "Stackable enterprise access switch with 48 PoE+ ports.",
        specs: {
            accessPortCount: 48,
            accessPortType: '1G-Copper',
            poeBudgetWatts: 740,
            poeStandard: 'PoE+',
            uplinkPortCount: 4,
            uplinkPortType: '1G-Fiber',
            isStackable: true
        }
    },

    // --- Meraki Generic Wireless ---
    {
        id: "meraki_mr44",
        vendor_id: "meraki",
        model: "MR44",
        active: true,
        status: "Supported",
        primary_purpose: "WLAN", role: "WLAN", additional_purposes: [], family: "Meraki MR",
        description: "Wi-Fi 6 Indoor Access Point",
        specs: {
            wifiStandard: "Wi-Fi 6",
            mimoBandwidth: "4x4",
            powerDrawWatts: 15,
            uplinkType: "1G-Copper",
            environment: "Indoor"
        }
    }
];
