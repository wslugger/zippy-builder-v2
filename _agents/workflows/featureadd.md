---
description: create a new feature branch and start development
---

1. Ask user for the feature name if not provided
// turbo
2. Switch to develop and pull latest: `git checkout develop && git pull origin develop`
// turbo
3. Create a new branch: `git checkout -b feature/[feature-name]`
4. Create a functional test file in `__tests__/features/[feature-name].test.tsx`
5. Update `ARCHITECTURE.md` if the feature introduces new patterns
6. Implement the feature logic in `src/`
// turbo
7. Run all checks: `npm run lint && npm run test`
// turbo
8. Run `npm run build` to verify no regressions
9. Suggest the user to use `/mergepush` when done
