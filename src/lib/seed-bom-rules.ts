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

    {
        id: "rule_lan_dynamic_quantity",
        name: "Managed LAN - Dynamic Switch Quantity Math",
        priority: 55,
        condition: { "==": [{ "var": "serviceId" }, "managed_lan"] },
        actions: [
            { type: "modify_quantity", targetId: "any_switch", quantityMultiplierField: "lanPorts", actionValue: 48 }
        ]
    },
    {
        id: "rule_lan_utilization_limit",
        name: "Managed LAN - 60% Port Utilization Limit",
        priority: 70,
        condition: { "==": [{ "var": "serviceId" }, "managed_lan"] },
        actions: [
            { type: "set_parameter", targetId: "maxPortUtilization", actionValue: 60 }
        ]
    },
    {
        id: "rule_lan_max_stack_size",
        name: "Managed LAN - Max Stack Size",
        priority: 65,
        condition: { "==": [{ "var": "serviceId" }, "managed_lan"] },
        actions: [
            { type: "set_parameter", targetId: "maxStackSize", actionValue: 8 }
        ]
    },
    {
        id: "rule_lan_fiber_transceiver_note",
        name: "Managed LAN - Fiber Transceiver Note",
        priority: 50,
        condition: { "==": [{ "var": "serviceId" }, "managed_lan"] },
        actions: [
            { type: "set_parameter", targetId: "fiberTransceiverNote", actionValue: true }
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
    },

    // --- Rule Set 4: SD-WAN Engine Parameters ---
    {
        id: "rule_sdwan_ha_lan_port",
        name: "SD-WAN HA - LAN Port Requirement",
        priority: 105,
        condition: { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
        actions: [
            { type: "set_parameter", targetId: "haLanPortMinimum", actionValue: 1 }
        ]
    },
    {
        id: "rule_sdwan_throughput_basis",
        name: "SD-WAN Default Throughput Metric",
        priority: 3,
        condition: { "==": [{ "var": "serviceId" }, "managed_sdwan"] },
        actions: [
            { type: "set_parameter", targetId: "throughputBasis", actionValue: "sdwanCryptoThroughputMbps" }
        ]
    }
];
