import { BOMLogicRule } from "@/src/lib/types";


export const SEED_BOM_RULES: BOMLogicRule[] = [
    // --- Rule Set 1: Cost Centric SD-WAN Selection used for Meraki ---
    // Strategy: Select model based on bandwidth requirements.

    {
        id: "rule_sdwan_low_bw",
        source: "seed",
        name: "Cost Centric - Small Branch WAN",
        priority: 100,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "sdwan"] },
                { "<": [{ "var": "site.bandwidthDownMbps" }, 200] }
            ]
        },
        actions: [
            { type: "select_equipment", targetId: "meraki_mx67", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_med_bw",
        source: "seed",
        name: "Cost Centric - Medium Branch WAN",
        priority: 90,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "sdwan"] },
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
        source: "seed",
        name: "Cost Centric - High Branch WAN",
        priority: 80,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "sdwan"] },
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
        source: "seed",
        name: "Cost Centric - Gigabit Branch WAN",
        priority: 70,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "sdwan"] },
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
        source: "seed",
        name: "Cost Centric - Multi-Gigabit Branch WAN",
        priority: 60,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "sdwan"] },
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
        source: "seed",
        name: "Cost Centric - DC / Regional Hub WAN",
        priority: 55,
        condition: {
            "and": [
                { "==": [{ "var": "packageId" }, "cost_centric"] },
                { "==": [{ "var": "serviceId" }, "sdwan"] },
                { ">=": [{ "var": "site.bandwidthDownMbps" }, 5000] }
            ]
        },
        actions: [
            { type: "select_equipment", targetId: "meraki_c8455_g2_mx", quantity: 1 }
        ]
    },

    {
        id: "rule_sdwan_ha",
        source: "seed",
        name: "SD-WAN High Availability (Dual CPE)",
        priority: 110,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "sdwan"] },
                { "contains": [{ "var": "site.redundancyModel" }, "dual"] }
            ]
        },
        actions: [
            { type: "set_parameter", targetId: "cpe_quantity", actionValue: 2 }
        ]
    },
    {
        id: "rule_sdwan_overhead_default",
        source: "seed",
        name: "SD-WAN Default Overhead",
        priority: 5,
        condition: { "==": [{ "var": "serviceId" }, "sdwan"] },
        actions: [
            { type: "set_parameter", targetId: "throughput_overhead_mbps", actionValue: 50 }
        ]
    },
    // --- Rule Set 2: Managed LAN Switch Calculation ---
    // NOTE: serviceId for LAN is "managed_lan" (canonical ID used by the BOM engine)

    {
        id: "rule_lan_utilization_limit",
        source: "seed",
        name: "Managed LAN - 60% Port Utilization Limit",
        description: "Caps port utilization at 60% to avoid switch saturation.",
        priority: 70,
        condition: { "==": [{ "var": "serviceId" }, "lan"] },
        actions: [
            { type: "set_parameter", targetId: "maxPortUtilization", actionValue: 60 }
        ]
    },
    {
        id: "rule_lan_max_stack_size",
        source: "seed",
        name: "Managed LAN - Max Stack Size",
        description: "Limits stackable configurations to 8 switches maximum.",
        priority: 65,
        condition: { "==": [{ "var": "serviceId" }, "lan"] },
        actions: [
            { type: "set_parameter", targetId: "maxStackSize", actionValue: 8 }
        ]
    },
    {
        id: "rule_lan_poe_calc",
        source: "seed",
        name: "LAN PoE Calculator",
        description: "Calculates minimum PoE watts required based on AP count (30W per AP).",
        priority: 100,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "lan"] },
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
        source: "seed",
        name: "LAN High-Density Guardrail",
        description: "Flags sites with more than 48 LAN ports for manual review — multiple switches or a stack are needed.",
        priority: 90,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "lan"] },
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
        source: "seed",
        name: "Managed LAN - Fiber Transceiver Note",
        description: "Adds a transceiver procurement note when fiber uplinks are selected.",
        priority: 50,
        condition: { "==": [{ "var": "serviceId" }, "lan"] },
        actions: [
            { type: "set_parameter", targetId: "fiberTransceiverNote", actionValue: true }
        ]
    },

    // Intent-reactive LAN rules (respond to site.lanRequirements set by the Intent Collector)
    {
        id: "rule_lan_intent_poe_plus",
        source: "intent",
        name: "LAN Intent: PoE+ Required — Mid Density",
        description: "If the SA selected IP Phones or Cameras (→ PoE+) and needs ≤48 ports, set minPorts and flag PoE+ requirement.",
        priority: 120,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "lan"] },
                { "==": [{ "var": "site.lanRequirements.poeCapabilities" }, "PoE+"] },
                { "<=": [{ "var": "site.lanPorts" }, 48] },
                { ">": [{ "var": "site.lanPorts" }, 0] }
            ]
        },
        actions: [
            { type: "set_parameter", targetId: "minAccessPorts", actionValue: { "var": "site.lanPorts" } }
        ]
    },
    {
        id: "rule_lan_intent_upoe",
        source: "intent",
        name: "LAN Intent: UPOE Required (Wi-Fi 6E APs)",
        description: "If the SA selected Wireless APs requiring UPOE, enforce UPOE-capable switch selection.",
        priority: 125,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "lan"] },
                {
                    "or": [
                        { "==": [{ "var": "site.lanRequirements.poeCapabilities" }, "UPOE"] },
                        { "==": [{ "var": "site.lanRequirements.poeCapabilities" }, "UPOE+"] }
                    ]
                }
            ]
        },
        actions: [
            { type: "set_parameter", targetId: "required_poe_watts", actionValue: 90 }
        ]
    },
    {
        id: "rule_lan_intent_stackable",
        source: "intent",
        name: "LAN Intent: Stackable Switch Required",
        description: "If the SA enabled the Stackable toggle in the Intent Collector, enforce stackable hardware only.",
        priority: 130,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "lan"] },
                { "==": [{ "var": "site.lanRequirements.isStackable" }, true] }
            ]
        },
        actions: [
            {
                type: "require_triage",
                targetId: "site",
                severity: "low",
                reason: "Stackable switch required. Verify stack configuration and IOS version compatibility.",
                resolutionPaths: ["Confirm stackable model selection", "Review fiber stack cabling"]
            }
        ]
    },
    {
        id: "rule_lan_intent_rugged",
        source: "intent",
        name: "LAN Intent: Rugged / Industrial Environment",
        description: "If the SA enabled the Rugged toggle, flag for manual review — standard commercial switches may not be suitable.",
        priority: 135,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "lan"] },
                { "==": [{ "var": "site.lanRequirements.isRugged" }, true] }
            ]
        },
        actions: [
            {
                type: "require_triage",
                targetId: "site",
                severity: "medium",
                reason: "Rugged / industrial environment selected. Confirm switch temperature and IP ratings.",
                resolutionPaths: ["Select industrial-grade switch model", "Confirm operating temperature range"]
            }
        ]
    },
    {
        id: "rule_lan_intent_no_poe_small",
        source: "intent",
        name: "LAN Intent: Small Office, No PoE",
        description: "Standard small office with only workstations and printers — an entry-level non-PoE switch is sufficient.",
        priority: 80,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "lan"] },
                { "==": [{ "var": "site.lanRequirements.poeCapabilities" }, "None"] },
                { "<=": [{ "var": "site.lanPorts" }, 24] },
                { ">": [{ "var": "site.lanPorts" }, 0] }
            ]
        },
        actions: [
            { type: "set_parameter", targetId: "minAccessPorts", actionValue: { "var": "site.lanPorts" } }
        ]
    },

    // --- Rule Set 3: Managed Wi-Fi ---
    {
        id: "rule_wlan_capacity_overload",
        source: "seed",
        name: "WLAN Capacity Overload",
        priority: 90,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "wlan"] },
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
        source: "seed",
        name: "WLAN Missing Infrastructure",
        priority: 95,
        condition: {
            "and": [
                { "==": [{ "var": "serviceId" }, "wlan"] },
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
        source: "seed",
        name: "SD-WAN HA - LAN Port Requirement",
        priority: 105,
        condition: { "==": [{ "var": "serviceId" }, "sdwan"] },
        actions: [
            { type: "set_parameter", targetId: "haLanPortMinimum", actionValue: 1 }
        ]
    },
    {
        id: "rule_sdwan_throughput_basis",
        source: "seed",
        name: "SD-WAN Default Throughput Metric",
        priority: 3,
        condition: { "==": [{ "var": "serviceId" }, "sdwan"] },
        actions: [
            { type: "set_parameter", targetId: "throughputBasis", actionValue: "sdwanCryptoThroughputMbps" }
        ]
    }
];
