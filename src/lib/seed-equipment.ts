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
    {
        id: "meraki_mg21",
        vendor_id: "meraki",
        model: "MG21",
        active: true,
        status: "Supported",
        primary_purpose: "WAN", 
        role: "WAN", 
        additional_purposes: ["Cellular Gateway", "SD-WAN Accessory"],
        family: "Meraki MG",
        description: "LTE Cat 6 Cellular Gateway for secondary WAN connectivity.",
        mapped_services: ["Managed SD-WAN"],
        specs: {
            cellular_type: "LTE",
            cellular_throughput_mbps: 300,
            modem_details: "Cat 6",
            integrated_cellular: true,
            wanPortCount: 0,
            lanPortCount: 1,
            antenna_type: "Integrated Dipole"
        },
        images: ["/assets/equipment/meraki_mg21.png"]
    },
    {
        id: "meraki_mg51",
        vendor_id: "meraki",
        model: "MG51",
        active: true,
        status: "Supported",
        primary_purpose: "WAN", 
        role: "WAN", 
        additional_purposes: ["Cellular Gateway", "SD-WAN Accessory"],
        family: "Meraki MG",
        description: "5G Cellular Gateway for high-speed primary or secondary WAN.",
        mapped_services: ["Managed SD-WAN"],
        specs: {
            cellular_type: "5G",
            cellular_throughput_mbps: 2000,
            modem_details: "5G Sub-6",
            integrated_cellular: true,
            wanPortCount: 0,
            lanPortCount: 1,
            antenna_type: "Integrated Omni"
        },
        images: ["/assets/equipment/meraki_mg51.png"]
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
            accessPortType: 'RJ45-1G',
            poeBudgetWatts: 370,
            poe_capabilities: 'PoE+',
            uplinkPortCount: 4,
            uplinkPortType: 'SFP-1G',
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
            accessPortType: 'RJ45-1G',
            poeBudgetWatts: 740,
            poe_capabilities: 'PoE+',
            uplinkPortCount: 4,
            uplinkPortType: 'SFP-1G',
            isStackable: true
        }
    },

    // --- Meraki Managed LAN (Comprehensive MS Catalog) ---
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_8",
        "model": "MS120-8",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 8-port Cloud Managed Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 8,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_8_lp",
        "model": "MS120-8-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 8-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 8,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 31,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_8_p",
        "model": "MS120-8-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 8-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 8,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 62,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_8_fp",
        "model": "MS120-8-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 8-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 8,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 93,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_24",
        "model": "MS120-24",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 24-port Cloud Managed Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_24_lp",
        "model": "MS120-24-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 185,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_24_p",
        "model": "MS120-24-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_24_fp",
        "model": "MS120-24-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 555,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_48",
        "model": "MS120-48",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 48-port Cloud Managed Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_48_lp",
        "model": "MS120-48-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_48_p",
        "model": "MS120-48-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms120_48_fp",
        "model": "MS120-48-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS120",
        "description": "Meraki MS120 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 1110,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms125_24",
        "model": "MS125-24",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS125",
        "description": "Meraki MS125 24-port Cloud Managed Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms125_24_lp",
        "model": "MS125-24-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS125",
        "description": "Meraki MS125 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 185,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms125_24_p",
        "model": "MS125-24-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS125",
        "description": "Meraki MS125 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms125_24_fp",
        "model": "MS125-24-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS125",
        "description": "Meraki MS125 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 555,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms125_48",
        "model": "MS125-48",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS125",
        "description": "Meraki MS125 48-port Cloud Managed Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms125_48_lp",
        "model": "MS125-48-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS125",
        "description": "Meraki MS125 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms125_48_p",
        "model": "MS125-48-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS125",
        "description": "Meraki MS125 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms125_48_fp",
        "model": "MS125-48-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS125",
        "description": "Meraki MS125 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 1110,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": false,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_8",
        "model": "MS130-8",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 8-port Cloud Managed Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 8,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_8_p",
        "model": "MS130-8-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 8-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 8,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 62,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_8_fp",
        "model": "MS130-8-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 8-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 8,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 93,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_12",
        "model": "MS130-12",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 12-port Cloud Managed Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 12,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_12_p",
        "model": "MS130-12-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 12-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 12,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_12_fp",
        "model": "MS130-12-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 12-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 12,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 1110,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_24",
        "model": "MS130-24",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 24-port Cloud Managed Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_24_p",
        "model": "MS130-24-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_24_fp",
        "model": "MS130-24-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 555,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_48",
        "model": "MS130-48",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 48-port Cloud Managed Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_48_p",
        "model": "MS130-48-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130_48_fp",
        "model": "MS130-48-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130",
        "description": "Meraki MS130 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 1110,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130r_8_p",
        "model": "MS130R-8-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130R",
        "description": "Meraki MS130R 8-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 8,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 62,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": false,
            "isRugged": true
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130r_12_p",
        "model": "MS130R-12-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130R",
        "description": "Meraki MS130R 12-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 12,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": false,
            "isRugged": true
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130x_8_p",
        "model": "MS130X-8-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130X",
        "description": "Meraki MS130X 8-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 8,
            "accessPortType": "RJ45-2.5G",
            "poeBudgetWatts": 62,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130x_12_p",
        "model": "MS130X-12-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130X",
        "description": "Meraki MS130X 12-port PoE Switch",
        "managementSize": "Small",
        "specs": {
            "accessPortCount": 12,
            "accessPortType": "RJ45-2.5G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms130x_24_p",
        "model": "MS130X-24-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS130X",
        "description": "Meraki MS130X 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-2.5G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms210_24",
        "model": "MS210-24",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS210",
        "description": "Meraki MS210 24-port Cloud Managed Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms210_24_lp",
        "model": "MS210-24-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS210",
        "description": "Meraki MS210 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 185,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms210_24_p",
        "model": "MS210-24-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS210",
        "description": "Meraki MS210 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms210_24_fp",
        "model": "MS210-24-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS210",
        "description": "Meraki MS210 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 555,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms210_48",
        "model": "MS210-48",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS210",
        "description": "Meraki MS210 48-port Cloud Managed Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms210_48_lp",
        "model": "MS210-48-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS210",
        "description": "Meraki MS210 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms210_48_p",
        "model": "MS210-48-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS210",
        "description": "Meraki MS210 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms210_48_fp",
        "model": "MS210-48-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS210",
        "description": "Meraki MS210 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 1110,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP-1G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms225_24",
        "model": "MS225-24",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS225",
        "description": "Meraki MS225 24-port Cloud Managed Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms225_24_lp",
        "model": "MS225-24-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS225",
        "description": "Meraki MS225 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 185,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms225_24_p",
        "model": "MS225-24-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS225",
        "description": "Meraki MS225 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms225_24_fp",
        "model": "MS225-24-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS225",
        "description": "Meraki MS225 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 555,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms225_48",
        "model": "MS225-48",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS225",
        "description": "Meraki MS225 48-port Cloud Managed Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms225_48_lp",
        "model": "MS225-48-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS225",
        "description": "Meraki MS225 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms225_48_p",
        "model": "MS225-48-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS225",
        "description": "Meraki MS225 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms225_48_fp",
        "model": "MS225-48-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS225",
        "description": "Meraki MS225 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 1110,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms250_24",
        "model": "MS250-24",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS250",
        "description": "Meraki MS250 24-port Cloud Managed Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms250_24_lp",
        "model": "MS250-24-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS250",
        "description": "Meraki MS250 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 185,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms250_24_p",
        "model": "MS250-24-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS250",
        "description": "Meraki MS250 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms250_24_fp",
        "model": "MS250-24-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS250",
        "description": "Meraki MS250 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 555,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms250_48",
        "model": "MS250-48",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS250",
        "description": "Meraki MS250 48-port Cloud Managed Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms250_48_lp",
        "model": "MS250-48-LP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS250",
        "description": "Meraki MS250 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms250_48_p",
        "model": "MS250-48-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS250",
        "description": "Meraki MS250 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms250_48_fp",
        "model": "MS250-48-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS250",
        "description": "Meraki MS250 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 1110,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms350_24",
        "model": "MS350-24",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS350",
        "description": "Meraki MS350 24-port Cloud Managed Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms350_24_p",
        "model": "MS350-24-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS350",
        "description": "Meraki MS350 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms350_24_fp",
        "model": "MS350-24-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS350",
        "description": "Meraki MS350 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 555,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms350_48",
        "model": "MS350-48",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS350",
        "description": "Meraki MS350 48-port Cloud Managed Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms350_48_p",
        "model": "MS350-48-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS350",
        "description": "Meraki MS350 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms350_48_fp",
        "model": "MS350-48-FP",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS350",
        "description": "Meraki MS350 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 1110,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms355_24_p",
        "model": "MS355-24-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS355",
        "description": "Meraki MS355 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-10G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "QSFP+-40G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms355_24_x",
        "model": "MS355-24-X",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS355",
        "description": "Meraki MS355 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-10G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "QSFP+-40G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms355_48_p",
        "model": "MS355-48-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS355",
        "description": "Meraki MS355 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-10G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "QSFP+-40G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms355_48_x",
        "model": "MS355-48-X",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS355",
        "description": "Meraki MS355 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-10G",
            "poeBudgetWatts": 0,
            "poe_capabilities": "None",
            "uplinkPortCount": 4,
            "uplinkPortType": "QSFP+-40G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms390_24_p",
        "model": "MS390-24-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS390",
        "description": "Meraki MS390 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 370,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms390_24_u",
        "model": "MS390-24-U",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS390",
        "description": "Meraki MS390 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 720,
            "poe_capabilities": "UPOE",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms390_24_ux",
        "model": "MS390-24-UX",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS390",
        "description": "Meraki MS390 24-port PoE Switch",
        "managementSize": "Medium",
        "specs": {
            "accessPortCount": 24,
            "accessPortType": "RJ45-10G",
            "poeBudgetWatts": 720,
            "poe_capabilities": "UPOE",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms390_48_p",
        "model": "MS390-48-P",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS390",
        "description": "Meraki MS390 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 740,
            "poe_capabilities": "PoE+",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms390_48_u",
        "model": "MS390-48-U",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS390",
        "description": "Meraki MS390 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-1G",
            "poeBudgetWatts": 1440,
            "poe_capabilities": "UPOE",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
        }
    },
    {
             active: true,
        status: "Supported",
        additional_purposes: [],
        "id": "meraki_ms390_48_ux",
        "model": "MS390-48-UX",
        
        "vendor_id": "meraki",
        "role": "LAN",
        "primary_purpose": "LAN",
        "family": "MS390",
        "description": "Meraki MS390 48-port PoE Switch",
        "managementSize": "Large",
        "specs": {
            "accessPortCount": 48,
            "accessPortType": "RJ45-10G",
            "poeBudgetWatts": 1440,
            "poe_capabilities": "UPOE",
            "uplinkPortCount": 4,
            "uplinkPortType": "SFP+-10G",
            "isStackable": true,
            "isRugged": false
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
            uplinkType: "RJ45-1G",
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
            uplinkType: "RJ45-1G",
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
            uplinkType: "RJ45-1G",
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
            uplinkType: "RJ45-2.5G",
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
            uplinkType: "RJ45-2.5G",
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
            uplinkType: "RJ45-1G",
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
            uplinkType: "RJ45-1G",
            environment: "Outdoor"
        }
    }
];
