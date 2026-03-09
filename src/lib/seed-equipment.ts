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

    // --- Meraki Managed LAN (Fixed/Stackable Access) ---
    // MS120 Series (Layer 2, 1G Uplinks)
    {
        id: "meraki_ms120_8lp",
        vendor_id: "meraki",
        model: "MS120-8LP",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS120",
        description: "8-port 1GbE PoE (67W) compact L2 switch with 2x 1G SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 8, accessPortType: '1G-Copper',
            poeBudgetWatts: 67, poe_capabilities: 'PoE',
            uplinkPortCount: 2, uplinkPortType: '1G-Fiber',
            isStackable: false
        }
    },
    {
        id: "meraki_ms120_24p",
        vendor_id: "meraki",
        model: "MS120-24P",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS120",
        description: "24-port 1GbE PoE+ (370W) L2 switch with 4x 1G SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 24, accessPortType: '1G-Copper',
            poeBudgetWatts: 370, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '1G-Fiber',
            isStackable: false
        }
    },
    {
        id: "meraki_ms120_48lp",
        vendor_id: "meraki",
        model: "MS120-48LP",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS120",
        description: "48-port 1GbE PoE+ (370W) L2 switch with 4x 1G SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 48, accessPortType: '1G-Copper',
            poeBudgetWatts: 370, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '1G-Fiber',
            isStackable: false
        }
    },
    {
        id: "meraki_ms120_48fp",
        vendor_id: "meraki",
        model: "MS120-48FP",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS120",
        description: "48-port 1GbE PoE+ (740W) L2 switch with 4x 1G SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 48, accessPortType: '1G-Copper',
            poeBudgetWatts: 740, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '1G-Fiber',
            isStackable: false
        }
    },

    // MS130 Series (Layer 2, mGig options)
    {
        id: "meraki_ms130_8p",
        vendor_id: "meraki",
        model: "MS130-8P",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS130",
        description: "8-port 1GbE PoE+ compact switch with 2x 1G SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 8, accessPortType: '1G-Copper',
            poeBudgetWatts: 150, poe_capabilities: 'PoE+',
            uplinkPortCount: 2, uplinkPortType: '1G-Fiber',
            isStackable: false
        }
    },
    {
        id: "meraki_ms130_24p",
        vendor_id: "meraki",
        model: "MS130-24P",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS130",
        description: "24-port 1GbE PoE+ switch with 4x 1G SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 24, accessPortType: '1G-Copper',
            poeBudgetWatts: 370, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '1G-Fiber',
            isStackable: false
        }
    },
    {
        id: "meraki_ms130_48p",
        vendor_id: "meraki",
        model: "MS130-48P",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS130",
        description: "48-port 1GbE PoE+ switch with 4x 1G SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 48, accessPortType: '1G-Copper',
            poeBudgetWatts: 740, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '1G-Fiber',
            isStackable: false
        }
    },
    {
        id: "meraki_ms130_12x",
        vendor_id: "meraki",
        model: "MS130-12X",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS130",
        description: "12-port mGig PoE+ switch (8x 1G + 4x 2.5G) with 2x 10G SFP+ uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 12, accessPortType: 'mGig-Copper',
            poeBudgetWatts: 240, poe_capabilities: 'PoE+',
            uplinkPortCount: 2, uplinkPortType: '10G-Fiber',
            isStackable: false
        }
    },

    // MS210 Series (Layer 2, Stackable)
    {
        id: "meraki_ms210_24p",
        vendor_id: "meraki",
        model: "MS210-24P",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS210",
        description: "Stackable 24-port 1GbE PoE+ (370W) L2 switch with 4x 1G SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 24, accessPortType: '1G-Copper',
            poeBudgetWatts: 370, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '1G-Fiber',
            isStackable: true
        }
    },
    {
        id: "meraki_ms210_48fp",
        vendor_id: "meraki",
        model: "MS210-48FP",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS210",
        description: "Stackable 48-port 1GbE PoE+ (740W) L2 switch with 4x 1G SFP uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 48, accessPortType: '1G-Copper',
            poeBudgetWatts: 740, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '1G-Fiber',
            isStackable: true
        }
    },

    // MS225 Series (Layer 2, Stackable, 10G Uplinks)
    {
        id: "meraki_ms225_24p",
        vendor_id: "meraki",
        model: "MS225-24P",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS225",
        description: "Stackable 24-port 1GbE PoE+ (370W) L2 switch with 4x 10G SFP+ uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 24, accessPortType: '1G-Copper',
            poeBudgetWatts: 370, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '10G-Fiber',
            isStackable: true
        }
    },
    {
        id: "meraki_ms225_48fp",
        vendor_id: "meraki",
        model: "MS225-48FP",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS225",
        description: "Stackable 48-port 1GbE PoE+ (740W) L2 switch with 4x 10G SFP+ uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 48, accessPortType: '1G-Copper',
            poeBudgetWatts: 740, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '10G-Fiber',
            isStackable: true
        }
    },

    // MS250 Series (Layer 3, Stackable, 10G Uplinks)
    {
        id: "meraki_ms250_24p",
        vendor_id: "meraki",
        model: "MS250-24P",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS250",
        description: "Stackable 24-port 1GbE PoE+ (370W) L3 switch with 4x 10G SFP+ uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 24, accessPortType: '1G-Copper',
            poeBudgetWatts: 370, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '10G-Fiber',
            isStackable: true
        }
    },
    {
        id: "meraki_ms250_48fp",
        vendor_id: "meraki",
        model: "MS250-48FP",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS250",
        description: "Stackable 48-port 1GbE PoE+ (740W) L3 switch with 4x 10G SFP+ uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 48, accessPortType: '1G-Copper',
            poeBudgetWatts: 740, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '10G-Fiber',
            isStackable: true
        }
    },

    // MS350/355 Series (mGig, UPOE high performance)
    {
        id: "meraki_ms350_24p",
        vendor_id: "meraki",
        model: "MS350-24P",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS350",
        description: "Stackable 24-port 1GbE PoE+ switch with 4x 10G SFP+ uplinks.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 24, accessPortType: '1G-Copper',
            poeBudgetWatts: 370, poe_capabilities: 'PoE+',
            uplinkPortCount: 4, uplinkPortType: '10G-Fiber',
            isStackable: true
        }
    },
    {
        id: "meraki_ms355_24x",
        vendor_id: "meraki",
        model: "MS355-24X",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS355",
        description: "Stackable 24-port mGig (UPOE) switch for high-perf wireless.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 24, accessPortType: 'mGig-Copper',
            poeBudgetWatts: 740, poe_capabilities: 'UPOE',
            uplinkPortCount: 2, uplinkPortType: '40G-Fiber',
            isStackable: true
        }
    },
    {
        id: "meraki_ms355_48x",
        vendor_id: "meraki",
        model: "MS355-48X",
        active: true,
        status: "Supported",
        primary_purpose: "LAN", role: "LAN", additional_purposes: [], family: "Meraki MS355",
        description: "Stackable 48-port mGig (UPOE) switch for high-perf wireless.",
        mapped_services: ["Managed LAN"],
        specs: {
            accessPortCount: 48, accessPortType: 'mGig-Copper',
            poeBudgetWatts: 740, poe_capabilities: 'UPOE',
            uplinkPortCount: 2, uplinkPortType: '40G-Fiber',
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
