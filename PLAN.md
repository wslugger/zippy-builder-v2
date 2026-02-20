# PLAN: BOM Logic Management Page

## Feature Summary
Enhance the BOM Logic page in the Admin UI to enable dynamic management of equipment selection rules and logic properties for WAN, LAN, and WLAN. We will expand the existing `BOMLogicRule` framework to handle ALL configurations (e.g., fallback models, switch port math, default uplink speeds) so admins can apply conditions to every system parameter.

## Impacted Files
- `src/lib/types.ts`: Extend `BOMLogicAction` to support more robust operations (e.g., `set_parameter`).
- `src/app/admin/bom-logic/page.tsx`: Re-architect to use service-specific tabs (SD-WAN, LAN, WLAN) managing rules.
- `src/components/admin/bom-logic/*`: New components for managing Rules (`RuleList`, `RuleEditorModal`).
- `src/lib/firebase/bom-logic.ts`: Implement Firebase persistence for rules.
- `src/lib/bom-engine.ts`: Refactor hardcoded defaults (e.g., LAN switch math, default uplinks) replacing them with `BOMLogicRule` evaluations.
- `src/lib/seed-bom-rules.ts`: Adjust initial seeds to provide baseline rule sets utilizing the new action types.
- `__tests__/features/bom-logic.test.tsx`: Create end-to-end BOM computation logic test.

## Step-by-Step Implementation Plan
1. **Model & Engine Expansion**: Update `types.ts` to expand `BOMLogicAction`. Upgrade the `BOMEngine` logic evaluating default configurations using these actions.
2. **Rules Editor UI**: Implement `RuleEditorModal` allowing admins to construct complex logic conditions (e.g., `bandwidth < 200 Mbps`) and assign dynamic equipment actions, or parameter configurations.
3. **Admin Dashboard**: Update `bom-logic/page.tsx` and implement `RuleList` component with interactive table logic and service-based filtering.
4. **Firebase Integration**: Connect Rule Editor to Firebase CRUD functions.
5. **Seed Updates**: Set default logic behavior for the engine within `seed-bom-rules.ts`.
6. **Testing**: Add functional tests proving rule alterations safely change output without breaking core engine loops.

## Verification Steps
- Run `npm test __tests__/features/bom-logic.test.tsx`.
- Navigate to `/admin/bom-logic` to confirm rule categories render properly.
- Edit a rule and ensure configurations affect the frontend Builder tool.
