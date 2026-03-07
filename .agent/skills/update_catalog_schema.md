---
name: update_catalog_schema
description: Safely update Zod schemas and database metadata without breaking legacy production data.
---

# Catalog Schema Skill

Use this skill when modifying technical specs, equipment roles, or metadata catalogs.

## Schema Safety Rules
- **Loose Containers**: Maintain a polymorphic schema for equipment specs. All domain-specific fields must be `.optional()` without schema-level defaults. (Lesson 47)
- **Consumer-Held Defaults**: Put interpretation of missing data in the logic modules (e.g., `lan-logic.ts`), not the schema.
- **Normalization**: If changing a field from string to array (e.g., `category`), implement a "Normalize on Fetch" layer in hooks to handle legacy data. (Lesson 339)

## ID Management
- **Slash-Safety**: For Firestore Document IDs, use the `getPricingDocId` pattern to escape `/` with `_sl_`. (Lesson 52)
- **Stable IDs**: Always use Stable IDs for cross-referencing catalog items in seed data and rules.

## Database Integrity
- **Embedded Specs**: When updating equipment, ensure you handle the `embeddedEquipment` patterns used for project snapshotting. (Lesson 20)
- **Metadata Sync**: Ensure new metadata fields are added to `useCatalogMetadata` and supported by the AI ingestion prompts.
