import { BOMLogicRule } from "./bom-types";

export const SEED_BOM_RULES: BOMLogicRule[] = [
    // --- Rule Set 1: Cost Centric SD-WAN Selection used for Meraki ---
    // Strategy: Select model based on bandwidth requirements.

    {
        id: "rule_sdwan_low_bw",
        name: "Cost Centric - Small Branch SDWAN",
        priority: 100,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
                { "<": [{ "var": "site.bandwidthDownMbps" }, 200] }
            ]
        },
        actions: [
            { type: "select_equipment", targetId: "meraki_mx67", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_med_bw",
        name: "Cost Centric - Medium Branch SDWAN",
        priority: 90,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
                { ">=": [{ "var": "site.bandwidthDownMbps" }, 200] },
                { "<": [{ "var": "site.bandwidthDownMbps" }, 500] }
            ]
        },
        actions: [
            { type: "select_equipment", targetId: "meraki_mx68", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_high_bw",
        name: "Cost Centric - High Branch SDWAN",
        priority: 80,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
                { ">=": [{ "var": "site.bandwidthDownMbps" }, 500] },
                { "<": [{ "var": "site.bandwidthDownMbps" }, 1000] }
            ]
        },
        actions: [
            { type: "select_equipment", targetId: "meraki_mx85", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_gigabit",
        name: "Cost Centric - Gigabit Branch SDWAN",
        priority: 70,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
                { ">=": [{ "var": "site.bandwidthDownMbps" }, 1000] },
                { "<": [{ "var": "site.bandwidthDownMbps" }, 2000] }
            ]
        },
        actions: [
            { type: "select_equipment", targetId: "meraki_mx105", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_multigig",
        name: "Cost Centric - Multi-Gigabit Branch SDWAN",
        priority: 60,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
                { ">=": [{ "var": "site.bandwidthDownMbps" }, 2000] },
                { "<": [{ "var": "site.bandwidthDownMbps" }, 5000] }
            ]
        },
        actions: [
            { type: "select_equipment", targetId: "meraki_mx250", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_ultra_high",
        name: "Cost Centric - DC / Regional Hub SDWAN",
        priority: 55,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
                { ">=": [{ "var": "site.bandwidthDownMbps" }, 5000] }
            ]
        },
        actions: [
            { type: "select_equipment", targetId: "meraki_c8455_g2_mx", quantity: 1 }
        ]
    },

    {
        id: "rule_sdwan_ha",
        name: "SD-WAN High Availability (Dual CPE)",
        priority: 110,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
                { "contains": [{ "var": "site.redundancyModel" }, "dual"] }
            ]
        },
        actions: [
            { type: "set_parameter", targetId: "cpe_quantity", actionValue: 2 }
        ]
    },
    {
        id: "rule_sdwan_overhead_default",
        name: "SD-WAN Default Overhead",
        priority: 5,
        condition: { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
        actions: [
            { type: "set_parameter", targetId: "throughput_overhead_mbps", actionValue: 50 }
        ]
    },
    // --- Rule Set 2: Managed LAN Switch Calculation ---
    // Strategy: 1x 48 port switch per 48 users/ports needed.
    // Taking a naive approach: If LAN ports > 0, give a switch.
    // Real logic would be math based. For now, simple buckets.

    {
        id: "rule_lan_default_speed",
        name: "Managed LAN - Default Access Speed",
        priority: 60,
        condition: { "==": [{ "var": "serviceId" }, "managed_lan"] },
        actions: [
            { type: "set_parameter", targetId: "defaultAccessSpeed", actionValue: "1G-Copper" }
        ]
    },
    {
        id: "rule_lan_dynamic_quantity",
        name: "Managed LAN - Dynamic Switch Quantity Math",
        priority: 55,
        condition: { "==": [{ "var": "serviceId" }, "managed_lan"] },
        actions: [
            { type: "modify_quantity", targetId: "any_switch", quantityMultiplierField: "lanPorts", actionValue: 48 }
        ]
    },

    // --- Rule Set 3: Managed Wi-Fi ---
    {
        id: "rule_wifi_aps",
        name: "Managed Wifi - AP Allocation",
        priority: 50,
        condition: { "==": [{ "var": "serviceId" }, "managed_wifi"] },
        actions: [
            // Give 1 AP per 'indoorAPs' count from CSV
            { type: "select_equipment", targetId: "meraki_mr44", quantity: 1, quantityMultiplierField: "indoorAPs" }
        ]
    }
];
