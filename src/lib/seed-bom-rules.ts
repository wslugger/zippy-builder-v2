import { BOMLogicRule } from "./bom-types";

export const SEED_BOM_RULES: BOMLogicRule[] = [
    // --- Rule Set 1: Cost Centric SD-WAN Selection used for Meraki ---
    // Strategy: Select model based on bandwidth requirements.

    {
        id: "rule_sdwan_low_bw",
        name: "Cost Centric - Small Branch SDWAN",
        priority: 100,
        conditions: [
            { field: "packageId", operator: "equals", value: "cost_centric" },
            { field: "serviceId", operator: "equals", value: "managed_sdwan" },
            { field: "bandwidthDownMbps", operator: "less_than", value: 200 }
        ],
        actions: [
            { type: "select_equipment", targetId: "meraki_mx67", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_med_bw",
        name: "Cost Centric - Medium Branch SDWAN",
        priority: 90,
        conditions: [
            { field: "packageId", operator: "equals", value: "cost_centric" },
            { field: "serviceId", operator: "equals", value: "managed_sdwan" },
            { field: "bandwidthDownMbps", operator: "greater_than", value: 199 }, // >= 200 effectively
            { field: "bandwidthDownMbps", operator: "less_than", value: 500 }
        ],
        actions: [
            { type: "select_equipment", targetId: "meraki_mx68", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_high_bw",
        name: "Cost Centric - High Branch SDWAN",
        priority: 80,
        conditions: [
            { field: "packageId", operator: "equals", value: "cost_centric" },
            { field: "serviceId", operator: "equals", value: "managed_sdwan" },
            { field: "bandwidthDownMbps", operator: "greater_than", value: 499 },
            { field: "bandwidthDownMbps", operator: "less_than", value: 1000 }
        ],
        actions: [
            { type: "select_equipment", targetId: "meraki_mx85", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_gigabit",
        name: "Cost Centric - Gigabit Branch SDWAN",
        priority: 70,
        conditions: [
            { field: "packageId", operator: "equals", value: "cost_centric" },
            { field: "serviceId", operator: "equals", value: "managed_sdwan" },
            { field: "bandwidthDownMbps", operator: "greater_than", value: 999 },
            { field: "bandwidthDownMbps", operator: "less_than", value: 2000 }
        ],
        actions: [
            { type: "select_equipment", targetId: "meraki_mx105", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_multigig",
        name: "Cost Centric - Multi-Gigabit Branch SDWAN",
        priority: 60,
        conditions: [
            { field: "packageId", operator: "equals", value: "cost_centric" },
            { field: "serviceId", operator: "equals", value: "managed_sdwan" },
            { field: "bandwidthDownMbps", operator: "greater_than", value: 1999 },
            { field: "bandwidthDownMbps", operator: "less_than", value: 5000 }
        ],
        actions: [
            { type: "select_equipment", targetId: "meraki_mx250", quantity: 1 }
        ]
    },
    {
        id: "rule_sdwan_ultra_high",
        name: "Cost Centric - DC / Regional Hub SDWAN",
        priority: 55, // Lower priority than Multi-Gig? No, higher priority or mutually exclusive is better.
        // Actually, let's keep priorities descending by specificity or bandwidth.
        conditions: [
            { field: "packageId", operator: "equals", value: "cost_centric" },
            { field: "serviceId", operator: "equals", value: "managed_sdwan" },
            { field: "bandwidthDownMbps", operator: "greater_than", value: 4999 }
        ],
        actions: [
            { type: "select_equipment", targetId: "meraki_c8455_g2_mx", quantity: 1 }
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
        conditions: [
            { field: "serviceId", operator: "equals", value: "managed_lan" }
        ],
        actions: [
            { type: "set_parameter", targetId: "defaultAccessSpeed", actionValue: "1GbE" }
        ]
    },
    {
        id: "rule_lan_dynamic_quantity",
        name: "Managed LAN - Dynamic Switch Quantity Math",
        priority: 55,
        conditions: [
            { field: "serviceId", operator: "equals", value: "managed_lan" }
        ],
        actions: [
            { type: "modify_quantity", targetId: "any_switch", quantityMultiplierField: "lanPorts", actionValue: 48 }
        ]
    },

    // --- Rule Set 3: Managed Wi-Fi ---
    {
        id: "rule_wifi_aps",
        name: "Managed Wifi - AP Allocation",
        priority: 50,
        conditions: [
            { field: "serviceId", operator: "equals", value: "managed_wifi" }
        ],
        actions: [
            // Give 1 AP per 'indoorAPs' count from CSV
            { type: "select_equipment", targetId: "meraki_mr44", quantity: 1, quantityMultiplierField: "indoorAPs" }
        ]
    }
];
