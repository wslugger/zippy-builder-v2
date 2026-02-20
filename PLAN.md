# PLAN: Add Feature Status Column

## Feature Summary
Add a `status` column to the Feature Catalog in the Admin UI. This field will track the readiness of technical features (e.g., "Supported", "In development", "Not supported"), mirroring the functionality found in the Equipment Catalog.

## Impacted Files
- `ARCHITECTURE.md`: Update system design documentation.
- `src/lib/types.ts`: Ensure data structures support the status field.
- `src/components/admin/FeatureList.tsx`: display the status in the catalog table.
- `src/components/modals/FeatureModal.tsx`: allow editors to modify the status field.
- `src/lib/firebase/validation.ts`: ensure Zod schemas allow the status field.

## Step-by-Step Implementation Plan
1. **Document**: Add `status` to `TECHNICAL_FEATURES` in `ARCHITECTURE.md`.
2. **Types**: Verify `status` is available in `TechnicalFeature` in `src/lib/types.ts`.
3. **UI Display**: Ensure `FeatureList.tsx` correctly renders the status column with appropriate color coding.
4. **UI Editor**: Ensure `FeatureModal.tsx` has a dropdown for status selecting from `EQUIPMENT_STATUSES`.
5. **Seeding**: Ensure default features have a status set during the bootstrap/seed process.
6. **Testing**: Add a test case to verify status persistence and display.

## Verification Steps
- Run `npm test __tests__/features/feature-status.test.tsx` (to be created).
- Manually verify the "Status" column in the Admin Features page.
- Edit a feature and verify the status update persists after refresh.
