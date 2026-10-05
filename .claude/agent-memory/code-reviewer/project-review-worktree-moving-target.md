---
name: project-review-worktree-moving-target
description: Miu World worktree reviews run while the implementing session keeps editing and running E2E; snapshot mtimes and re-check before citing
metadata:
  type: project
---

Reviews of Miu World feature worktrees (e.g. `../miu-world-life`) are requested while the implementing session is still editing files, regenerating `entities.json` and running E2E on the shared ports.

**Why:** during the 2026-09-30 forest-ambient-life review, entities.json, game.ts and review-shots.ts changed mid-review (character models swapped, new `solidAt` param), and `.data/life/review-shots/` was being rewritten by a live E2E run.

Same on `main`: during the 2026-10-05 skills/journey/achievements review, HEAD gained docs + test commits mid-review; also tests run on PGlite (single connection), so "racing" tests do not prove real Postgres concurrency (prod uses node-postgres pool) — reason about locks instead. 2026-10-06 pets review: HEAD again gained a docs commit (501f92cf) mid-review; review the given commit range, not HEAD. 2026-10-06 bosses review: HEAD gained a feat(web) fix + review shots (e7cffba0, ef9ee4fc) mid-review — check `git log <range-end>..HEAD` before reporting, a finding may already be fixed.

Recurring defect class: a new quest `category` gets excluded in web helpers but not in server `regionQuests` (apps/server/src/progression/player-facts.ts), which buckets every non-story/non-coop quest as a lesson; grep every `category ===` exclusion list when a category is added.

A scout-block hook denies any Bash/Read path containing `node_modules` (e.g. checking drizzle driver internals): reason from existing repo usage instead (e.g. `date()` columns already exported as strings).

**How to apply:** record `ls --time-style` mtimes at start, re-read a file right before citing line numbers, say in the report which snapshot was reviewed. Review screenshots in `.data/<feature>/review-shots/` are useful evidence (they exposed a delayed-tap bug) — check them. Never run E2E yourself there. Scratch scripts: `.mts` + `pnpm exec tsx` from `apps/web` can import worktree TS modules for quick behavioural checks without editing the repo.
