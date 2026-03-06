import { z } from "zod";


/**
 * Validates Firestore document data against a Zod schema.
 * 
 * On success: returns the fully typed, parsed data.
 * On failure: logs a warning with the specific validation issues and
 *             returns the raw data with a type cast (graceful degradation).
 * 
 * This ensures we catch schema drift and corrupt data early via logs
 * without breaking the app for end users.
 */
export function validateDoc<T>(schema: z.ZodType<T>, data: unknown, docId: string): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        console.warn(
            `[Firestore Validation] Document "${docId}" has schema issues:`,
            result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")
        );
        // Graceful fallback — return the data anyway so the app doesn't crash
        return data as T;
    }
    return result.data;
}

/**
 * Validates an array of Firestore documents, logging warnings per-doc.
 */
export function validateDocs<T>(schema: z.ZodType<T>, docs: { id: string; data: () => unknown }[]): T[] {
    return docs.map(doc => validateDoc(schema, doc.data(), doc.id));
}

// ============================================================
// Zod Schemas for types that don't yet have them
// ============================================================

// --- TechnicalFeature ---
export const TechnicalFeatureSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.array(z.string()).default([]),
    status: z.string().optional(),
    description: z.string(),
    caveats: z.array(z.string()).optional(),
    assumptions: z.array(z.string()).optional(),
});

// --- Service hierarchy ---
const ServiceItemBaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    short_description: z.string().default(""),
    detailed_description: z.string().default(""),
    caveats: z.array(z.string()).default([]),
    assumptions: z.array(z.string()).default([]),
    supported_features: z.array(z.string()).optional(),
});

const DesignOptionSchema = ServiceItemBaseSchema.extend({
    category: z.string().optional(),
    decision_driver: z.string().optional(),
    pros: z.array(z.string()).optional(),
    cons: z.array(z.string()).optional(),
    throughput_overhead_mbps: z.number().optional(),
});

const ServiceOptionSchema = ServiceItemBaseSchema.extend({
    design_options: z.array(DesignOptionSchema).default([]),
});

export const ServiceSchema = ServiceItemBaseSchema.extend({
    service_options: z.array(ServiceOptionSchema).default([]),
    active: z.boolean().default(true),
    sortOrder: z.number().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    is_attachment: z.boolean().optional(),
    attaches_to: z.array(z.string()).optional(),
});

// --- Package ---
const PackageFeatureSchema = z.object({
    feature_id: z.string(),
    inclusion_type: z.enum(["required", "standard", "optional"]),
});

const PackageItemSchema = z.object({
    service_id: z.string(),
    service_option_id: z.string().optional(),
    design_option_id: z.string().optional(),
    enabled_features: z.array(PackageFeatureSchema).default([]),
    inclusion_type: z.enum(["required", "standard", "optional"]),
});

const PackageCollateralSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["solution_brief", "technical_reference", "diagram", "other"]),
    url: z.string(),
    file_name: z.string(),
    uploaded_at: z.string(),
});

export const PackageSchema = z.object({
    id: z.string(),
    name: z.string(),
    short_description: z.string().default(""),
    detailed_description: z.string().default(""),
    items: z.array(PackageItemSchema).default([]),
    collateral: z.array(PackageCollateralSchema).optional(),
    active: z.boolean().default(true),
    throughput_basis: z.preprocess((val) => val === null ? undefined : val, z.enum(["rawFirewallThroughputMbps", "sdwanCryptoThroughputMbps", "advancedSecurityThroughputMbps"]).optional().catch(undefined)),
    throughput_overhead_mbps: z.number().optional(),
});

// --- Project ---
export const ProjectSchema = z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    customerName: z.string(),
    description: z.string().optional(),
    status: z.enum(["draft", "scope_selection", "package_selection", "customizing", "completed"]).default("draft"),
    projectScope: z.enum(["complete_network", "standalone_sites"]).optional(),
    currentStep: z.number().default(1),
    selectedPackageId: z.string().optional(),
    packageConfidenceScore: z.number().optional(),
    packageReasoning: z.string().optional(),
    requirementsFiles: z.array(z.string()).optional(),
    requirementsText: z.string().optional(),
    selectedFeatures: z.array(z.string()).optional(),
    selectedDesignOptions: z.record(z.string(), z.string()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    customizedItems: z.array(PackageItemSchema).optional(),
    embeddedEquipment: z.array(z.any()).optional(), // Equipment is a disc. union, use z.any() for simple validation here if needed, or ideally use EquipmentSchema
});

// --- CatalogMetadata ---
const CatalogFieldSchema = z.object({
    label: z.string(),
    values: z.array(z.string()),
});

export const CatalogMetadataSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    fields: z.record(z.string(), CatalogFieldSchema).default({},),
});

// --- BOM Logic Rule ---


const BOMLogicActionSchema = z.object({
    type: z.enum(["select_equipment", "enable_feature", "set_configuration", "set_parameter", "modify_quantity", "require_triage"]),
    targetId: z.string(),
    actionValue: z.any().optional(),
    quantity: z.number().optional(),
    quantityMultiplierField: z.string().optional(),
    reason: z.string().optional(),
    severity: z.enum(['low', 'medium', 'high']).optional(),
    resolutionPaths: z.array(z.string()).optional(),
});

export const BOMLogicRuleSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    priority: z.number(),
    condition: z.record(z.string(), z.unknown()),
    actions: z.array(BOMLogicActionSchema),
});

// --- SystemDefaults (compound) ---
export const SystemDefaultsSchema = z.object({
    features: z.array(TechnicalFeatureSchema).default([]),
    services: z.array(ServiceSchema).default([]),
    packages: z.array(PackageSchema).default([]),
    workflowSteps: z.array(z.object({
        id: z.string(),
        label: z.string(),
        path: z.string(),
    })).optional(),
    bomRules: z.array(BOMLogicRuleSchema).optional(),
});
