/**
 * Firebase Service Layer — Barrel Export
 * 
 * All services are re-exported from here for backward compatibility.
 * Consumers can import from "@/src/lib/firebase" as before, or import
 * from individual service files for better tree-shaking.
 */

// Core Firebase instances
export { db, storage } from "./config";

// Validation utilities & schemas
export { validateDoc, validateDocs } from "./validation";
export {
    TechnicalFeatureSchema,
    ServiceSchema,
    PackageSchema,
    ProjectSchema,
    CatalogMetadataSchema,
    BOMLogicRuleSchema,
    SystemDefaultsSchema,
} from "./validation";

// Service modules
export { EquipmentService } from "./equipment-service";

export { ServiceService } from "./service-service";
export { FeatureService } from "./feature-service";
export { PackageService } from "./package-service";
export { ProjectService } from "./project-service";
export { SystemDefaultsService } from "./system-defaults-service";
export { BOMService } from "./bom-service";
export { SiteDefinitionService } from "./site-definition-service";

