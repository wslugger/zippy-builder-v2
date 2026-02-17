---
description: merge the current branch into main and push
---

1. Run verification checks: `npm run lint && npm run test`
2. Run build check: `npm run build`
3. Determine merge target:
   - If on `feature/*` or `fix/*`, merge target is `develop`.
   - If on `develop`, merge target is `main`.
4. Switch to target branch and pull: `git checkout [target-branch] && git pull origin [target-branch]`
5. Merge the source branch: `git merge [source-branch]`
6. Push to origin: `git push origin [target-branch]`
7. If merged into `develop`, delete the local feature/fix branch.
8. If merged into `main`, do not delete `develop`.
