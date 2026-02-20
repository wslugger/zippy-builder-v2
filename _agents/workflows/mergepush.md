---
description: merge the current branch into main and push
---

// turbo
1. Run verification checks: `npm run lint && npm run test`
// turbo
2. Run build check: `npm run build`
3. Determine merge target:
   - If current branch is `feature/*` or `fix/*`, merge target is `develop`.
   - If current branch is `develop`, merge target is `main`.
// turbo
4. Switch to target branch and pull: `git checkout [target-branch] && git pull origin [target-branch]`
// turbo
5. Merge the source branch: `git merge [source-branch]`
// turbo
6. Push to origin: `git push origin [target-branch]`
7. If merged into `develop`:
   // turbo
   - Delete the local feature/fix branch: `git branch -d [source-branch]`
8. If merged into `main`, do not delete `develop`.
