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
        mapped_services: ["Managed SD-WAN"],
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
        mapped_services: ["Managed SD-WAN"],
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
        mapped_services: ["Managed SD-WAN"],
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
        mapped_services: ["Managed SD-WAN"],
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
        mapped_services: ["Managed SD-WAN"],
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
        mapped_services: ["Managed SD-WAN"],
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
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 24,
            accessPortType: '1G-Copper',
            poeBudgetWatts: 370,
            poe_capabilities: 'PoE+',
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
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 48,
            accessPortType: '1G-Copper',
            poeBudgetWatts: 740,
            poe_capabilities: 'PoE+',
            uplinkPortCount: 4,
            uplinkPortType: '1G-Fiber',
            isStackable: true
        }
    },

    // --- Meraki Managed LAN (MS130 Series) ---
    {
        id: "meraki_ms1308phw",
        vendor_id: "meraki",
        model: "MS130-8P-HW",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS130",
        description: "8-port 1GbE PoE+ compact switch with 2x 1GbE SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 8,
            accessPortType: '1G-Copper',
            poeBudgetWatts: 150,
            poe_capabilities: 'PoE+',
            uplinkPortCount: 2,
            uplinkPortType: '1G-Fiber',
            isStackable: false
        }
    },
    {
        id: "meraki_ms13012xhw",
        vendor_id: "meraki",
        model: "MS130-12X-HW",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS130",
        description: "12-port Multi-Gigabit PoE+ switch with 2x 10GbE SFP+ uplinks (8x 1GbE + 4x 2.5GbE RJ45 access ports).",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 12,
            accessPortType: '1G-Copper',
            poeBudgetWatts: 240,
            poe_capabilities: 'PoE+',
            uplinkPortCount: 2,
            uplinkPortType: '10G-Fiber',
            isStackable: false
        }
    },
    {
        id: "meraki_ms13024phw",
        vendor_id: "meraki",
        model: "MS130-24P-HW",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS130",
        description: "24-port 1GbE PoE+ switch with 4x 1GbE SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 24,
            accessPortType: '1G-Copper',
            poeBudgetWatts: 370,
            poe_capabilities: 'PoE+',
            uplinkPortCount: 4,
            uplinkPortType: '1G-Fiber',
            isStackable: false
        }
    },
    {
        id: "meraki_ms13048phw",
        vendor_id: "meraki",
        model: "MS130-48P-HW",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS130",
        description: "48-port 1GbE PoE+ switch with 4x 1GbE SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 48,
            accessPortType: '1G-Copper',
            poeBudgetWatts: 740,
            poe_capabilities: 'PoE+',
            uplinkPortCount: 4,
            uplinkPortType: '1G-Fiber',
            isStackable: false
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
        mapped_services: ["Managed Wi-Fi"],
        specs: {
            wifiStandard: "Wi-Fi 6",
            mimoBandwidth: "4x4",
            powerDrawWatts: 15,
            uplinkType: "1G-Copper",
            environment: "Indoor"
        }
    },
    {
        id: "meraki_mr76",
        vendor_id: "meraki",
        model: "MR76",
        active: true,
        status: "Supported",
        primary_purpose: "WLAN", role: "WLAN", additional_purposes: [], family: "Meraki MR",
        description: "Wi-Fi 6 Outdoor Access Point",
        mapped_services: ["Managed Wi-Fi"],
        specs: {
            wifiStandard: "Wi-Fi 6",
            mimoBandwidth: "2x2",
            powerDrawWatts: 11,
            uplinkType: "1G-Copper",
            environment: "Outdoor"
        }
    },
    {
        id: "meraki_mr78",
        vendor_id: "meraki",
        model: "MR78",
        active: true,
        status: "Supported",
        primary_purpose: "WLAN", role: "WLAN", additional_purposes: [], family: "Meraki MR",
        description: "Wi-Fi 6 Outdoor Access Point",
        mapped_services: ["Managed Wi-Fi"],
        specs: {
            wifiStandard: "Wi-Fi 6",
            mimoBandwidth: "2x2",
            powerDrawWatts: 15,
            uplinkType: "1G-Copper",
            environment: "Outdoor"
        }
    },
    // --- Cisco Wireless ---
    {
        id: "cisco_cw9164",
        vendor_id: "cisco_catalyst",
        model: "CW9164I",
        active: true,
        status: "Supported",
        primary_purpose: "WLAN", role: "WLAN", additional_purposes: [], family: "Catalyst Wireless",
        description: "Wi-Fi 6E Indoor Access Point",
        mapped_services: ["Managed Wi-Fi"],
        specs: {
            wifiStandard: "Wi-Fi 6E",
            mimoBandwidth: "4x4",
            powerDrawWatts: 30,
            uplinkType: "2.5G-Copper",
            environment: "Indoor"
        }
    },
    {
        id: "cisco_cw9166",
        vendor_id: "cisco_catalyst",
        model: "CW9166D1",
        active: true,
        status: "Supported",
        primary_purpose: "WLAN", role: "WLAN", additional_purposes: [], family: "Catalyst Wireless",
        description: "Wi-Fi 6E Outdoor Access Point",
        mapped_services: ["Managed Wi-Fi"],
        specs: {
            wifiStandard: "Wi-Fi 6E",
            mimoBandwidth: "4x4",
            powerDrawWatts: 30,
            uplinkType: "2.5G-Copper",
            environment: "Outdoor"
        }
    },
    // --- Fortinet Wireless ---
    {
        id: "forti_ap431f",
        vendor_id: "fortinet",
        model: "FAP-431F",
        active: true,
        status: "Supported",
        primary_purpose: "WLAN", role: "WLAN", additional_purposes: [], family: "FortiAP",
        description: "Wi-Fi 6 Indoor Access Point",
        mapped_services: ["Managed Wi-Fi"],
        specs: {
            wifiStandard: "Wi-Fi 6",
            mimoBandwidth: "4x4",
            powerDrawWatts: 24,
            uplinkType: "1G-Copper",
            environment: "Indoor"
        }
    },
    {
        id: "forti_ap433f",
        vendor_id: "fortinet",
        model: "FAP-433F",
        active: true,
        status: "Supported",
        primary_purpose: "WLAN", role: "WLAN", additional_purposes: [], family: "FortiAP",
        description: "Wi-Fi 6 Outdoor Access Point",
        mapped_services: ["Managed Wi-Fi"],
        specs: {
            wifiStandard: "Wi-Fi 6",
            mimoBandwidth: "4x4",
            powerDrawWatts: 25,
            uplinkType: "1G-Copper",
            environment: "Outdoor"
        }
    }
];
