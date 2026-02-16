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
            { field: "bandwidthDownMbps", operator: "greater_than", value: 1999 }
        ],
        actions: [
            { type: "select_equipment", targetId: "meraki_mx250", quantity: 1 }
        ]
    },

    // --- Rule Set 2: Managed LAN Switch Calculation ---
    // Strategy: 1x 48 port switch per 48 users/ports needed.
    // Taking a naive approach: If LAN ports > 0, give a switch.
    // Real logic would be math based. For now, simple buckets.

    {
        id: "rule_lan_small",
        name: "Managed LAN - Small Switch",
        priority: 50,
        conditions: [
            { field: "serviceId", operator: "equals", value: "managed_lan" },
            { field: "lanPorts", operator: "less_than", value: 25 }
        ],
        actions: [
            { type: "select_equipment", targetId: "cisco_c9200L_24p", quantity: 1 }
        ]
    },
    {
        id: "rule_lan_large",
        name: "Managed LAN - Large Switch",
        priority: 40,
        conditions: [
            { field: "serviceId", operator: "equals", value: "managed_lan" },
            { field: "lanPorts", operator: "greater_than", value: 24 }
        ],
        actions: [
            // Example of multiplier. If we have 100 ports, we might want ceil(100/48) switches.
            // But my simple engine supports 'quantityMultiplierField'.
            // If I set quantity: 1, and multiplier 'lanPorts', I get 100 switches. That's wrong.
            // I'll stick to fixed quantity for this prototype or specific rules (100-200 range -> 2 switches).
            { type: "select_equipment", targetId: "cisco_c9200L_48p", quantity: 1 }
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
