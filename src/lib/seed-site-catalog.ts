import { SiteType } from "./site-types";

// Extracted from Sampledocs/SD-WAN Site Type Framework.md
export const SDWAN_SITE_TYPES: SiteType[] = [
    // --- 1. Infrastructure & Core Sites ---
    {
        id: "data_center",
        name: "Data Center (DC)",
        category: "SD-WAN",
        description: "Centralized application hosting and primary hub. Core Hub role.",
        constraints: [
            { id: "cpe_redundancy_active_active", description: "Dual CPE (Active/Active HA)", type: "redundancy", rule: { field: "redundancyModel", operator: "equals", value: "Dual Active/Active" } },
            { id: "throughput_floor", description: "Minimum 2Gbps encrypted throughput", type: "throughput", rule: { field: "bandwidthDownMbps", operator: "min", value: 2000 } },
            { id: "full_mesh", description: "Enforce 'Full Mesh' topology role", type: "circuit" }
        ],
        defaults: {
            requiredServices: ["managed_sdwan"],
            redundancy: { cpe: "Dual", circuit: "Dual" },
            slo: 99.99
        }
    },
    {
        id: "colocation",
        name: "Colocation (CoLo)",
        category: "SD-WAN",
        description: "Cloud on-ramp and regional traffic transit. Regional Hub role.",
        constraints: [
            { id: "cpe_redundancy_active_active", description: "Dual CPE (Active/Active HA)", type: "redundancy" },
            { id: "regional_hub", description: "Regional Hub status", type: "circuit" }
        ],
        defaults: {
            requiredServices: ["managed_sdwan"],
            redundancy: { cpe: "Dual", circuit: "Dual" },
            slo: 99.99
        }
    },
    {
        id: "regional_hq",
        name: "Regional HQ",
        category: "SD-WAN",
        description: "High-density user environment with local services. Headquarters role.",
        constraints: [
            { id: "cpe_redundancy_dual", description: "Dual CPE (Active/Standby or Active/Active)", type: "redundancy" },
            { id: "local_breakout", description: "Local Breakout (DIA) allowed for SaaS", type: "circuit" }
        ],
        defaults: {
            requiredServices: ["managed_sdwan"],
            redundancy: { cpe: "Dual", circuit: "Dual" },
            slo: 99.99
        }
    },

    // --- 2. Cloud & Virtual Sites ---
    {
        id: "cloud_instance",
        name: "Cloud Instance (vCPE)",
        category: "SD-WAN",
        description: "Connecting VPCs/VNets directly to the SD-WAN fabric. Virtual Edge role.",
        constraints: [
            { id: "virtual_ha", description: "Virtual HA (Deployed across Availability Zones)", type: "redundancy" }
        ],
        defaults: {
            requiredServices: ["managed_sdwan"],
            redundancy: { cpe: "Dual", circuit: "Dual" },
            slo: 99.9
        }
    },

    // --- 3. Standard Branch Tiers ---
    {
        id: "large_office",
        name: "Gold (Large Office)",
        category: "SD-WAN",
        description: "Significant branch operations. Major Branch role.",
        constraints: [
            { id: "cpe_redundancy_dual", description: "Dual CPE", type: "redundancy", rule: { field: "redundancyModel", operator: "equals", value: "Dual CPE" } },
            { id: "sdwan_enforce", description: "Enforce SD-WAN (Cannot fall back to simple routing)", type: "hardware" }
        ],
        defaults: {
            requiredServices: ["managed_sdwan"],
            redundancy: { cpe: "Dual", circuit: "Dual" },
            slo: 99.9
        }
    },
    {
        id: "medium_office",
        name: "Silver (Medium Office)",
        category: "SD-WAN",
        description: "Typical branch office.",
        constraints: [
            { id: "lte_required", description: "Require LTE/5G Option as a secondary/tertiary link", type: "circuit" }
        ],
        defaults: {
            requiredServices: ["managed_sdwan"],
            redundancy: { cpe: "Single", circuit: "Dual" },
            slo: 99.9
        }
    },
    {
        id: "small_office",
        name: "Bronze (Small Office / Retail)",
        category: "SD-WAN",
        description: "Lean operations, kiosks, or small shops. Small Branch role.",
        constraints: [
            { id: "cpe_single", description: "Single CPE", type: "redundancy" },
            { id: "lte_usage_cap", description: "Usage-based LTE capping", type: "circuit" }
        ],
        defaults: {
            requiredServices: ["managed_sdwan"],
            redundancy: { cpe: "Single", circuit: "Single" },
            slo: 99.5
        }
    },

    // --- 4. Specialized Edge Profiles ---
    {
        id: "micro_branch",
        name: "Micro-Branch / SOHO",
        category: "SD-WAN",
        description: "Executive home office or temporary pop-up. SOHO role.",
        constraints: [
            { id: "fanless", description: "Fanless Design Hardware Constraint", type: "hardware" },
            { id: "hub_spoke_only", description: "Enforce 'Hub and Spoke' only", type: "circuit" }
        ],
        defaults: {
            requiredServices: ["managed_sdwan"],
            redundancy: { cpe: "Single", circuit: "Single" },
            slo: 99.0
        }
    },
    {
        id: "mobile_vehicular",
        name: "Mobile / Vehicular",
        category: "SD-WAN",
        description: "Emergency services, clinics, or field units. Mobile Unit role.",
        constraints: [
            { id: "ruggedized", description: "Ruggedized Hardware Required", type: "hardware" },
            { id: "dual_sim", description: "Require Dual-SIM hardware", type: "hardware" }
        ],
        defaults: {
            requiredServices: ["managed_sdwan"],
            redundancy: { cpe: "Single", circuit: "Single" },
            slo: 99.0
        }
    }
];

// Extracted from Sampledocs/LAN Site Type Framework.md
export const LAN_SITE_TYPES: SiteType[] = [
    // --- 1. Enterprise Campus Tiers ---
    {
        id: "3_tier_campus",
        name: "3-Tier Campus (Core/Aggregation/Access)",
        category: "LAN",
        description: "Large HQs or Regional Hubs with multiple buildings or floors. Headquarters LAN role.",
        constraints: [
            { id: "redundant_uplinks", description: "Dual-homed links from Access to Aggregation", type: "redundancy" },
            { id: "stacking_required", description: "Enforce physical hardware stacking", type: "hardware" }
        ],
        defaults: {
            requiredServices: ["managed_lan"],
            redundancy: { cpe: "Dual", circuit: "Dual" },
            slo: 99.99
        }
    },
    {
        id: "2_tier_collapsed",
        name: "2-Tier Collapsed Core",
        category: "LAN",
        description: "Medium offices or single-building sites. Branch LAN role.",
        constraints: [
            { id: "sfp_uplinks", description: "Require SFP+ uplinks between layers", type: "hardware" },
            { id: "poe_plus", description: "High-density PoE+ (30W)", type: "poe" }
        ],
        defaults: {
            requiredServices: ["managed_lan"],
            redundancy: { cpe: "Dual", circuit: "Dual" },
            slo: 99.9
        }
    },

    // --- 2. Hybrid & Integrated Tiers ---
    {
        id: "stacked_edge",
        name: "Stacked Edge (Horizontal Expansion)",
        category: "LAN",
        description: "Sites needing high port density (2-3 switches) without 2-tier complexity. Dense Branch LAN role.",
        constraints: [
            { id: "stacking_required", description: "Must be stacked", type: "hardware" }
        ],
        defaults: {
            requiredServices: ["managed_lan"],
            redundancy: { cpe: "Dual", circuit: "Dual" },
            slo: 99.5
        }
    },
    {
        id: "integrated_branch",
        name: "Integrated Branch (Router-Switch)",
        category: "LAN",
        description: "Small or remote sites using internal switch modules. Small Office LAN role.",
        constraints: [
            { id: "no_stacking", description: "No physical stacking support", type: "hardware" },
            { id: "limited_poe", description: "Limited PoE budget", type: "poe" }
        ],
        defaults: {
            requiredServices: ["managed_lan"],
            redundancy: { cpe: "Single", circuit: "Single" },
            slo: 99.5
        }
    },

    // --- 4. Lightweight & Remote Tiers ---
    {
        id: "flat_network_l2",
        name: "Flat Network (Layer 2 Only)",
        category: "LAN",
        description: "Small branch or Retail shop. Retail LAN role.",
        constraints: [
            { id: "vlan_limit", description: "Limited to <3 VLANs", type: "vlan", rule: { field: "vlanCount", operator: "max", value: 3 } }
        ],
        defaults: {
            requiredServices: ["managed_lan"],
            redundancy: { cpe: "Single", circuit: "Single" },
            slo: 99.0
        }
    },
    {
        id: "industrial_iot",
        name: "Industrial / IoT (OT)",
        category: "LAN",
        description: "Warehouses, plants, or utility sites. Industrial LAN role.",
        constraints: [
            { id: "ruggedized", description: "Fanless / Ruggedized Hardware", type: "hardware" },
            { id: "industrial_proto", description: "Must support industrial protocols", type: "software" }
        ],
        defaults: {
            requiredServices: ["managed_lan"],
            redundancy: { cpe: "Single", circuit: "Single" },
            slo: 99.0
        }
    }
];

export const ALL_SITE_TYPES = [...SDWAN_SITE_TYPES, ...LAN_SITE_TYPES];
