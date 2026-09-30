---
name: project-review-worktree-moving-target
description: Miu World worktree reviews run while the implementing session keeps editing and running E2E; snapshot mtimes and re-check before citing
metadata:
  type: project
---

Reviews of Miu World feature worktrees (e.g. `../miu-world-life`) are requested while the implementing session is still editing files, regenerating `entities.json` and running E2E on the shared ports.

**Why:** during the 2026-09-30 forest-ambient-life review, entities.json, game.ts and review-shots.ts changed mid-review (character models swapped, new `solidAt` param), and `.data/life/review-shots/` was being rewritten by a live E2E run.

**How to apply:** record `ls --time-style` mtimes at start, re-read a file right before citing line numbers, say in the report which snapshot was reviewed. Review screenshots in `.data/<feature>/review-shots/` are useful evidence (they exposed a delayed-tap bug) — check them. Never run E2E yourself there. Scratch scripts: `.mts` + `pnpm exec tsx` from `apps/web` can import worktree TS modules for quick behavioural checks without editing the repo.
