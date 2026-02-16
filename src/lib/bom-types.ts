import { z } from "zod";

// --- Site Types ---

export const SiteSchema = z.object({
    id: z.string().optional(), // specific ID if tracking by ID
    siteTypeId: z.string().optional(), // Reference to SiteType
    name: z.string(),
    address: z.string(),
    userCount: z.number(),
    bandwidthDownMbps: z.number(),
    bandwidthUpMbps: z.number(),
    redundancyModel: z.string(), // "Dual CPE", "Single CPE"
    wanLinks: z.number(),
    lanPorts: z.number(),
    poePorts: z.number(),
    indoorAPs: z.number(),
    outdoorAPs: z.number(),
    primaryCircuit: z.string(), // "DIA", "Broadband"
    secondaryCircuit: z.string().optional(),
    notes: z.string().optional(),
});

export type Site = z.infer<typeof SiteSchema>;

// --- BOM Logic ---

export type LogicOperator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in_list";

export interface LogicCondition {
    field: keyof Site | "packageId" | "serviceId" | "designOptionId";
    operator: LogicOperator;
    value: string | number | boolean | string[];
}

export interface BOMLogicAction {
    type: "select_equipment" | "enable_feature" | "set_configuration";
    targetId: string; // SKU or Feature ID
    quantity?: number; // Fixed number or derived? (e.g. 1 per site)
    quantityMultiplierField?: keyof Site; // e.g. "indoorAPs" -> 1 per AP count
}

export interface BOMLogicRule {
    id: string;
    name: string;
    priority: number; // Higher number = higher priority
    conditions: LogicCondition[];
    actions: BOMLogicAction[];
}

// --- BOM Output ---

export interface BOMLineItem {
    id: string;
    siteName: string;
    serviceId: string;
    serviceName: string; // Snapshot
    itemId: string; // Equipment SKU or Feature ID
    itemName: string; // Snapshot
    itemType: "equipment" | "feature" | "license" | "labor";
    quantity: number;
    unitPrice?: number; // Placeholder
    totalPrice?: number; // Placeholder
    reasoning?: string; // Which rule triggered this?
}

export interface BOM {
    id: string;
    projectId: string;
    createdAt: string;
    items: BOMLineItem[];
    summary: {
        totalOneTimeCost?: number;
        totalMonthlyCost?: number;
        siteCount: number;
    };
}
