---
description: Add or update equipment and vendor pricing catalogs
---

# Equipment Management Workflow (/addequipment)

1. **Extract Specifications**:
   - If using a datasheet, use the `/api/admin/equipment/ingest` Server Action. (Lesson 14)
   - Ensure the AI prompt extracts mandatory core attributes (`bandwidth`, `ports`, `redundancyModel`). (Lesson 187)

2. **Schema Alignment**:
   - Apply the **Slash-Safety Pattern** for document IDs if the SKU contains `/`. (Lesson 383)
   - Map technical metrics to the correct role (LAN, WAN, WLAN). (Lesson 159)

3. **Pricing Decoupling**:
   - Store prices in the separate `Pricing` catalog, linked by `pricingSku`. (Lesson 373)
   - Do **not** embed pricing directly in the Technical Specs (`Equipment` schema).

4. **Persist & Seed**:
   - Update the relevant seed script in `src/lib/` (e.g., `seed-equipment.ts`).
   - Use the **Rule Copilot** workflow if adding associated selection logic. (Lesson 280)

5. **Verify**:
   - Run `npm run build` to ensure no TypeScript regressions in logic modules.
   - Verify the new item appears in the `EquipmentTable` with the correct role-specific specs.
