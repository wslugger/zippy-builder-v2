---
description: create a bugfix branch and fix an issue
---

1. Ask user for a description of the bug
2. Switch to develop and pull latest: `git checkout develop && git pull origin develop`
3. Create a new branch: `git checkout -b fix/[bug-description]`
3. Create a reproduction test in `__tests__/bugs/[bug-description].test.tsx`
4. Run the test to confirm it fails: `npm run test`
5. Implement the fix in the codebase
6. Verify the test now passes: `npm run test`
7. Run comprehensive checks: `npm run lint && npm run build`
8. Suggest the user to use `/mergepush` when done
