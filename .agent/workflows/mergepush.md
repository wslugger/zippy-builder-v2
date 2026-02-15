---
description: merge the current branch into main and push
---

1. Run all tests: `npm run test`
2. If tests pass, switch to main: `git checkout main`
3. Pull latest: `git pull origin main`
4. Merge the feature/fix branch: `git merge [branch-name]`
5. Push to main: `git push origin main`
6. Delete the local feature/fix branch
