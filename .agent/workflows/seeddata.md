---
description: Ensure seed data persists correctly and update database schemas
---

1. Ask the user for the context of the seed data changes (e.g., adding a new feature, updating catalog defaults).
// turbo
2. Switch to develop and pull latest: `git checkout develop && git pull origin develop`
// turbo
3. Create a branch: `git checkout -b chore/seed-data-[description]`
4. If modifying database schemas, update the corresponding `src/lib/types.ts` or interface definitions.
5. Update the seed scripts in `src/lib/` (like `seed-data.ts`, `seed-equipment.ts`) so the defaults are fully defined there as the single source of truth.
6. Verify no hardcoded test data is present in production seed code. Ensure any "remove all custom entries" mechanism functions as expected so seeding resets the state perfectly to defaults.
// turbo
7. Run linting: `npm run lint`
8. Write or update a database/seeding unit test in `__tests__/` (e.g. testing that `seedData()` cleans up old config and sets the new structure).
// turbo
9. Test the UI locally with `npm run dev` to verify that dropdowns, catalogs, and tools successfully reflect the newly applied seed state.
// turbo
10. Run regression tests: `npm run test && npm run test:e2e`
// turbo
11. Build verification: `npm run build`
12. Suggest `/mergepush` to wrap up if everything passes.
