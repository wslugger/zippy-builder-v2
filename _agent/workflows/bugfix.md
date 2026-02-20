---
description: create a bugfix branch and fix an issue
---

1. Ask user for a description of the bug
// turbo
2. Switch to develop and pull latest: `git checkout develop && git pull origin develop`
// turbo
3. Create a new branch: `git checkout -b fix/[bug-description]`
4. Create a reproduction test in `__tests__/bugs/[bug-description].test.tsx`
// turbo
5. Run the test to confirm it fails: `npm run test`
6. Implement the fix in the codebase
// turbo
7. Verify the test now passes: `npm run test`
// turbo
8. Run comprehensive checks: `npm run lint && npm run build`
9. Suggest the user to use `/mergepush` when done
