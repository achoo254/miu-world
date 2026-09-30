---
title: Vertical slice MVP cooked in parallel sessions
date: 2026-09-30
summary: "10 phases of the vertical slice done on main in one day, alongside the SGK worktree session and a UI-restyle session"
---

# Vertical slice MVP cooked in parallel sessions

## What happened
- Cooked `plans/dattqh/260929-2141-vertical-slice-mvp/` phases 1, 4–10 (2 and 3 were already done) on `main`, about 40 commits. The full MVP loop now plays by touch on the iPad viewport. E2E `mvp-loop`: sign-in → creator → Home → forest ch1 → 3 Math challenges → 100 XP, Lv.2, chapter 2 unlocked → Lá thần in the backpack.
- Two other sessions were active at the same time: `miu-world-6c` (SGK content, worktree `../miu-world-sgk`) and `miu-world-f2` (restyle of the screens before the game, deploy). At the start, an untracked `ui/kit/ui-art.ts` turned out to belong to f2. We split phase 1 over messages: f2 took tokens, kit, account screens and the loading overlay; I took the bridge, `Game` stop/resume, context loss, Playwright/CI and icons.
- Owner rules that arrived mid-run: "Miu" is only the game's name, so text uses `{name}` and `content:check` blocks a literal "Miu"; content never repeats (feedback pools, `freshPicker`).
- Perf ran once: 12/12 combinations within budget (draw calls ≤ 108, 0.85 MB first area, simulated on M4). Earlier, adding interactables pushed the start view to 157 draw calls; brought back to 146 by limiting shadow casters.
- The whole-batch code review found 0 critical, 1 high (tap-to-select broken: the click bubbled to the drop zone), 3 medium (keys pressed while paused replayed on resume; early outfit pick lost while the preview loaded; reward screens vanished on `/play` without `?quest=`) and 10 low. All fixed, except one unreachable path (L8) and the dev switches kept on purpose (L6).

## What went wrong
- `cbfc64b` was committed after running only vitest and lint; `pnpm typecheck` was red (a TS2677 type predicate). The SGK session caught it. Rule: the full gate before every commit, typecheck included.
- A unit test for tap-to-select passed while the feature was broken, because it did not fire the click on the tile the way a browser does. Tests of input paths must replay the real event sequence.
- Server tests (`auth-routes`, `quest-routes`) flake under heavy load: 401/404/503, a different test each time, green when run alone. Pre-existing; the cause is not found yet.

## Decision
- Coordination protocol kept in memory (`parallel-sessions-workflow`): one worktree per plan, announce and split file ownership over SendMessage, "holding ports" / "perf done" messages, commit after each phase.
- Dev switches (`?spawnAt`, `?outfit`, `?stats`) stay in the production build for now: E2E needs them and the server still grades everything. Open question for the owner.

## Next steps
- People: DEVICE-01 on iPad Gen 10, teacher review of the ch1 learning content, designer review (#23), play-test with children (#24), legal review of consent draft-3.
- Push `main` and watch CI (never run for this batch).
- Investigate the load-dependent 401/404 in the server tests.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
