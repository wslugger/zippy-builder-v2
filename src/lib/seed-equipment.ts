import { Equipment } from "./types";

export const SEED_EQUIPMENT: Equipment[] = [
    // --- Meraki SD-WAN ---
    {
        id: "meraki_mx67",
        vendor_id: "meraki",
        model: "MX67",
        active: true,
        status: "Supported",
        purpose: ["SDWAN", "Security"],
        family: "Meraki MX",
        description: "Entry-level SD-WAN appliance for small branches.",
        specs: {
            ngfw_throughput_mbps: 450,
            vpn_throughput_mbps: 200,
            wan_interfaces_desc: "1x GbE RJ45",
            lan_interfaces_desc: "4x GbE RJ45",
            max_clients: 50,
            recommended_use_case: "Small Branch (up to 50 users)",
        },
        images: ["/assets/equipment/meraki_mx67.png"]
    },
    {
        id: "meraki_mx68",
        vendor_id: "meraki",
        model: "MX68",
        active: true,
        status: "Supported",
        purpose: ["SDWAN", "Security"],
        family: "Meraki MX",
        description: "Small branch appliance with more ports and PoE.",
        specs: {
            ngfw_throughput_mbps: 450,
            vpn_throughput_mbps: 200,
            wan_interfaces_desc: "2x GbE RJ45",
            lan_interfaces_desc: "10x GbE RJ45 (2x PoE+)",
            max_clients: 50,
            recommended_use_case: "Small Branch with PoE needs",
        },
        images: ["/assets/equipment/meraki_mx68.png"]
    },
    {
        id: "meraki_mx85",
        vendor_id: "meraki",
        model: "MX85",
        active: true,
        status: "Supported",
        purpose: ["SDWAN", "Security"],
        family: "Meraki MX",
        description: "Mid-range SD-WAN appliance for medium branches.",
        specs: {
            ngfw_throughput_mbps: 1000,
            vpn_throughput_mbps: 500,
            wan_interfaces_desc: "2x GbE RJ45, 2x SFP",
            lan_interfaces_desc: "8x GbE RJ45, 2x SFP",
            max_clients: 250,
            recommended_use_case: "Medium Branch (up to 250 users)",
        },
        images: ["/assets/equipment/meraki_mx85.png"]
    },
    {
        id: "meraki_mx105",
        vendor_id: "meraki",
        model: "MX105",
        active: true,
        status: "Supported",
        purpose: ["SDWAN", "Security"],
        family: "Meraki MX",
        description: "High-performance SD-WAN appliance for large branches.",
        specs: {
            ngfw_throughput_mbps: 1500,
            vpn_throughput_mbps: 750,
            wan_interfaces_desc: "2x 2.5GbE RJ45, 2x SFP+",
            lan_interfaces_desc: "4x GbE RJ45",
            max_clients: 750,
            recommended_use_case: "Large Branch / Campus (up to 750 users)",
        },
        images: ["/assets/equipment/meraki_mx105.png"]
    },
    {
        id: "meraki_mx250",
        vendor_id: "meraki",
        model: "MX250",
        active: true,
        status: "Supported",
        purpose: ["SDWAN", "Security"],
        family: "Meraki MX",
        description: "High-capacity SD-WAN appliance for large-scale deployments.",
        specs: {
            ngfw_throughput_mbps: 4000,
            vpn_throughput_mbps: 2000,
            wan_interfaces_desc: "2x 10GbE SFP+",
            lan_interfaces_desc: "8x GbE RJ45, 8x SFP, 8x 10GbE SFP+",
            max_clients: 2000,
            recommended_use_case: "Campus / Data Center",
        },
        images: ["/assets/equipment/meraki_mx250.png"]
    },
    {
        id: "meraki_c8455_g2_mx",
        vendor_id: "meraki",
        model: "C8455-G2-MX",
        active: true,
        status: "Supported",
        purpose: ["SDWAN", "Security"],
        family: "Catalyst 8400",
        description: "Ultra-high performance fixed-platform SD-WAN appliance.",
        specs: {
            ngfw_throughput_mbps: 10000,
            vpn_throughput_mbps: 5000,
            wan_interfaces_desc: "2x 10G SFP+, 8x 1G RJ45",
            lan_interfaces_desc: "High-density modular interfaces",
            max_clients: 5000,
            recommended_use_case: "Large Data Center / Regional Hub",
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
        purpose: ["LAN"],
        family: "Catalyst 9200",
        description: "Stackable enterprise access switch with 24 PoE+ ports.",
        specs: {
            ports: 24,
            poe_budget: 370,
            lan_interfaces_desc: "24x GbE PoE+, 4x 1G SFP Uplinks",
            recommended_use_case: "Standard Access Layer",
            stacking_supported: true,
            stacking_bandwidth_gbps: 80,
            forwarding_rate_mpps: 41.66,
            switching_capacity_gbps: 56,
            poe_capabilities: "PoE+"
        }
    },
    {
        id: "cisco_c9200L_48p",
        vendor_id: "cisco_catalyst",
        model: "C9200L-48P-4G",
        active: true,
        status: "Supported",
        purpose: ["LAN"],
        family: "Catalyst 9200",
        description: "Stackable enterprise access switch with 48 PoE+ ports.",
        specs: {
            ports: 48,
            poe_budget: 740,
            lan_interfaces_desc: "48x GbE PoE+, 4x 1G SFP Uplinks",
            recommended_use_case: "High Density Access Layer",
            stacking_supported: true,
            stacking_bandwidth_gbps: 80,
            forwarding_rate_mpps: 77.38,
            switching_capacity_gbps: 104,
            poe_capabilities: "PoE+"
        }
    },

    // --- Meraki Generic Wireless ---
    {
        id: "meraki_mr44",
        vendor_id: "meraki",
        model: "MR44",
        active: true,
        status: "Supported",
        purpose: ["WLAN"],
        family: "Meraki MR",
        description: "Wi-Fi 6 Indoor Access Point",
        specs: {
            wifi_standard: "Wi-Fi 6",
            integrated_wifi: true,
            recommended_use_case: "General Office"
        }
    }
];
