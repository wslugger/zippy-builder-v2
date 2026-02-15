---
description: create a new feature branch and start development
---

1. Ask user for the feature name if not provided
2. Create a new branch: `git checkout -b feature/[feature-name]`
3. Create a functional test file in `__tests__/features/[feature-name].test.tsx`
4. Update `ARCHITECTURE.md` if the feature introduces new patterns
5. Implement the feature logic in `src/`
6. Run `npm run build` to verify no regressions
7. Suggest the user to use `/mergepush` when done
