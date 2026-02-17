import { z } from "zod";

export interface SiteConstraint {
    id: string;
    description: string;
    type: string;
    rule?: {
        field: string;
        operator: "equals" | "min" | "max" | "includes" | "distinct";
        value: string | number | boolean | string[];
    };
}

export interface SiteDefault {
    redundancy: {
        cpe: string;
        circuit: string;
    };
    slo: number; // e.g. 99.9 or 99.99
    requiredServices: string[]; // IDs of services that MUST be present (e.g. "managed_sdwan")
}

export interface SiteType {
    id: string;
    name: string;
    category: "SD-WAN" | "LAN" | "WLAN";
    description: string; // From MD docs
    constraints: SiteConstraint[];
    defaults: SiteDefault;
}

export const SiteTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(["SD-WAN", "LAN", "WLAN"]),
    description: z.string(),
    constraints: z.array(z.any()), // Simplified for zod
    defaults: z.object({
        redundancy: z.object({
            cpe: z.string(),
            circuit: z.string()
        }),
        slo: z.number().min(0).max(100),
        requiredServices: z.array(z.string())
    })
});
