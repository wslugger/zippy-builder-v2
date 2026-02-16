import { z } from "zod";

export type SiteTier = "Infrastructure" | "Core" | "Standard Branch" | "Small Branch" | "Specialized" | "Cloud";

export interface SiteConstraint {
    id: string;
    description: string;
    type: "redundancy" | "throughput" | "circuit" | "security" | "hardware" | "vlan" | "poe" | "software";
    rule?: {
        field: string;
        operator: "equals" | "min" | "max" | "includes" | "distinct";
        value: string | number | boolean | string[];
    };
}

export interface SiteDefault {
    redundancy: {
        cpe: "Single" | "Dual";
        circuit: "Single" | "Dual" | "Hybrid";
    };
    slo: number; // e.g. 99.9 or 99.99
    requiredServices: string[]; // IDs of services that MUST be present (e.g. "managed_sdwan")
}

export interface SiteType {
    id: string;
    name: string;
    category: "SD-WAN" | "LAN";
    tier: SiteTier;
    description: string; // From MD docs
    constraints: SiteConstraint[];
    defaults: SiteDefault;
}

export const SiteTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(["SD-WAN", "LAN"]),
    tier: z.string(),
    description: z.string(),
    constraints: z.array(z.any()), // Simplified for zod
    defaults: z.object({
        redundancy: z.object({
            cpe: z.enum(["Single", "Dual"]),
            circuit: z.enum(["Single", "Dual", "Hybrid"])
        }),
        slo: z.number().min(0).max(100),
        requiredServices: z.array(z.string())
    })
});
