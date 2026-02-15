---
description: merge the current branch into main and push
---

1. Run verification checks: `npm run lint && npm run test`
2. Run build check: `npm run build`
3. If all pass, switch to main: `git checkout main`
4. Pull latest: `git pull origin main`
5. Merge the feature/fix branch: `git merge [branch-name]`
6. Push to main: `git push origin main`
7. Delete the local feature/fix branch
