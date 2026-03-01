# Feature Plan: Save Work in Progress (WIP) in the BOM

## Overview
The goal of this feature is to allow the Solutions Architect (SA) to save their current work in progress while on the BOM Builder page (Step 4/5). This requires saving both the list of parsed/configured `sites` and the current `bomState` (such as manual overrides, pricing model selection, and global discount) to Firebase, and then correctly reloading them when the user returns to the page.

## Implementation Steps

### 1. Update `Project` Type
**File:** `src/lib/types.ts`
- Add an optional `bomState` field to the `Project` interface to store global configurations from the BOM builder.
```typescript
export interface Project {
  // ... existing fields
  bomState?: {
    manualSelections: Record<string, any>;
    globalDiscount: number;
    acquisitionModel: 'purchase' | 'rental';
    projectManagementLevel: string;
  };
}
```

### 2. Update Firebase Service
**File:** `src/lib/firebase/project-service.ts`
- Implement `getSites` to fetch sites from the `projects/{projectId}/sites` Firestore subcollection.
```typescript
    getSites: async (projectId: string): Promise<Site[]> => {
        try {
            const sitesRef = collection(db, PROJECTS_COLLECTION, projectId, "sites");
            const snapshot = await getDocs(sitesRef);
            return snapshot.docs.map((d) => d.data() as Site);
        } catch (error) {
            console.error("[ProjectService] Failed to get sites:", error);
            return [];
        }
    },
```

### 3. State Hydration in BOM Builder Hook
**File:** `src/app/sa/project/[id]/bom/useBOMBuilder.ts`
- In the `loadData` function, fetch the saved sites (`ProjectService.getSites`) and restore them.
- If `project.bomState` exists, merge it into the respective `useState` values (`manualSelections`, `globalDiscount`, `acquisitionModel`, `projectManagementLevel`).

### 4. Create "Save WIP" Action & UI Widget
**File:** `src/app/sa/project/[id]/bom/page.tsx`
- Add a "Save WIP" (or "Save Draft") button near the "Next" button in the header.
- Create a `handleSaveWIP` function that:
  1. Sets a saving state `isSavingWIP(true)`.
  2. Awaits `ProjectService.saveSites(projectId, sites)`.
  3. Awaits `ProjectService.updateProject(projectId, { bomState: { ... } })`.
  4. Surfaces a success toast or simple "Saved!" inline feedback.

### 5. Architectural & Test Coverage
- **Tests:** Add a feature test in `__tests__/features/save-wip-bom.test.tsx` validating the mock calls to `getSites`/`saveSites` and `updateProject`.
- **Architecture:** Update `ARCHITECTURE.md` to note that BOM WIP state is now persisting via a mix of subcollection documents (for sites) and scalar JSON (for manual selections / global config in `Project.bomState`).
