import { BOMLogicRule } from "./bom-types";

export const SEED_BOM_RULES: BOMLogicRule[] = [
    // --- Rule Set 1: Cost Centric SD-WAN Selection used for Meraki ---
    // Strategy: Select model based on bandwidth requirements.

    {
        id: "rule_sdwan_low_bw",
        name: "Cost Centric - Small Branch WAN",
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
        name: "Cost Centric - Medium Branch WAN",
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
        name: "Cost Centric - High Branch WAN",
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
        name: "Cost Centric - Gigabit Branch WAN",
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
        name: "Cost Centric - Multi-Gigabit Branch WAN",
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
        name: "Cost Centric - DC / Regional Hub WAN",
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
        id: "rule_lan_poe_calc",
        name: "LAN PoE Calculator",
        priority: 100,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "managed_lan"] },
                { ">": [{ "var": "site.indoorAPs" }, 0] }
            ]
        },
        actions: [
            {
                type: "set_parameter",
                targetId: "required_poe_watts",
                actionValue: {
                    "*": [
                        { "+": [{ "var": "site.indoorAPs" }, { "var": "site.outdoorAPs" }] },
                        30
                    ]
                }
            }
        ]
    },
    {
        id: "rule_lan_high_density",
        name: "LAN High-Density Guardrail",
        priority: 90,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "managed_lan"] },
                { ">": [{ "var": "site.lanPorts" }, 48] }
            ]
        },
        actions: [
            {
                type: "require_triage",
                targetId: "site",
                severity: "high",
                reason: "LAN port count exceeds single switch maximum (48)",
                resolutionPaths: ["Configure Switch Stack", "Split into multiple IDF site profiles"]
            }
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
        id: "rule_wlan_capacity_overload",
        name: "WLAN Capacity Overload",
        priority: 90,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "managed_wifi"] },
                {
                    ">": [
                        {
                            "/": [
                                { "var": "site.userCount" },
                                { "max": [{ "+": [{ "var": "site.indoorAPs" }, { "var": "site.outdoorAPs" }] }, 1] }
                            ]
                        },
                        40
                    ]
                }
            ]
        },
        actions: [
            {
                type: "require_triage",
                targetId: "site",
                severity: "high",
                reason: "User density exceeds 40 users per Access Point.",
                resolutionPaths: ["Increase AP Quantity", "Upgrade to HD AP Models"]
            }
        ]
    },
    {
        id: "rule_wlan_missing_infrastructure",
        name: "WLAN Missing Infrastructure",
        priority: 95,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "managed_wifi"] },
                { "==": [{ "+": [{ "var": "site.indoorAPs" }, { "var": "site.outdoorAPs" }] }, 0] }
            ]
        },
        actions: [
            {
                type: "require_triage",
                targetId: "site",
                severity: "medium",
                reason: "Managed Wi-Fi is selected, but site has 0 Access Points.",
                resolutionPaths: ["Remove Managed Wi-Fi Service", "Estimate APs based on user count"]
            }
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
