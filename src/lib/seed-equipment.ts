import { Equipment } from "./types";

export const SEED_EQUIPMENT: Equipment[] = [
    // --- Meraki SD-WAN ---
    {
        id: "meraki_mx67",
        vendor_id: "meraki",
        model: "MX67",
        active: true,
        status: "Supported",
        primary_purpose: "SDWAN", role: "WAN", additional_purposes: ["Security"],
        family: "Meraki MX",
        description: "Entry-level SD-WAN appliance for small branches.",
        specs: {
            ngfw_throughput_mbps: 450,
            vpn_throughput_mbps: 200,
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
        primary_purpose: "SDWAN", role: "WAN", additional_purposes: ["Security"],
        family: "Meraki MX",
        description: "Small branch appliance with more ports and PoE.",
        specs: {
            ngfw_throughput_mbps: 450,
            vpn_throughput_mbps: 200,
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
        primary_purpose: "SDWAN", role: "WAN", additional_purposes: ["Security"],
        family: "Meraki MX",
        description: "Mid-range SD-WAN appliance for medium branches.",
        specs: {
            ngfw_throughput_mbps: 1000,
            vpn_throughput_mbps: 500,
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
        primary_purpose: "SDWAN", role: "WAN", additional_purposes: ["Security"],
        family: "Meraki MX",
        description: "High-performance SD-WAN appliance for large branches.",
        specs: {
            ngfw_throughput_mbps: 1500,
            vpn_throughput_mbps: 750,
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
        primary_purpose: "SDWAN", role: "WAN", additional_purposes: ["Security"],
        family: "Meraki MX",
        description: "High-capacity SD-WAN appliance for large-scale deployments.",
        specs: {
            ngfw_throughput_mbps: 4000,
            vpn_throughput_mbps: 2000,
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
        primary_purpose: "SDWAN", role: "WAN", additional_purposes: ["Security"],
        family: "Catalyst 8400",
        description: "Ultra-high performance fixed-platform SD-WAN appliance.",
        specs: {
            ngfw_throughput_mbps: 10000,
            vpn_throughput_mbps: 5000,
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
            uplinkPortCount: 4,
            accessPortType: '1G',
            uplinkPortType: '1G',
            poe_budget_watts: 370,
            stackable: true,
            switching_capacity_gbps: 56,
            forwarding_rate_mpps: 41.66
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
            uplinkPortCount: 4,
            accessPortType: '1G',
            uplinkPortType: '1G',
            poe_budget_watts: 740,
            stackable: true,
            switching_capacity_gbps: 104,
            forwarding_rate_mpps: 77.38
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
            wifi_standard: "Wi-Fi 6",
            requires_controller: false,
            max_concurrent_clients: 512
        }
    }
];
