---
title: "Profile 'reset' on restart, and resuming where the child left off"
date: 2026-10-01
summary: "No storage bug: the dev DB had been deleted or a different worktree's DB was open; added a startup DB log line, stopped deleting .data/pglite, and saved each child's last spot per map (live on staging and production, fbd0cee)"
---

# Profile "reset" on restart, and resuming where the child left off

## What happened
- The owner asked why game profiles seemed to reset on every app restart. All child data already lives on the server; dev uses PGlite on disk at `<worktree>/.data/pglite`. A kill -9 / SIGTERM test against PGlite showed writes survive a hard stop, so restarting was not the cause.
- Real causes: `main` had no `.data/pglite` at all (plans and review reports told agents to delete it after each review), the SGK worktree has its own database, and E2E runs PGlite in memory. The player's position was also never saved, so every visit started at spawn.
- Delivered after "làm công việc như đề xuất": the review instructions now use `PGLITE_DIR=.data/pglite-review`; CLAUDE.md "Dễ vấp" explains the per-worktree databases; the server logs `database: …` at startup (PGlite path, "just created empty", counts; Postgres shows no URL); a new `player_positions` table with `GET`/`PUT /api/player-positions`, saved every 10 s, on page hide and on leaving `/play`, and restored only while the spot is still dry, open ground.
- Account export and account deletion include the new table. The privacy page lists it (no consent version bump), flagged to the owner as legal text.
- Committed fbd0cee and deployed to staging and production with the owner's explicit approval for this one time. Both run fbd0cee, the migration was applied after an automatic backup, and the table is empty.

## Problems found
- `account-routes.test.ts` requires every table to appear in the export and in the delete check. The peer session caught it; fixed by adding the table to both.
- First E2E run: everything after the new test fell back to the sign-in page. `freshChild` signs up inside the shared storageState, and register ends the current session (auth-routes.ts), which signed out the shared E2E parent. Specs that call `freshChild` need `test.use({ storageState: { cookies: [], origins: [] } })`.
- Second run: `home.spec` enters `/play` from the menu and came back next to a quest target that an earlier `spawnAt` spec had saved for the shared child. Runs with `spawnAt`, `autopilot` or `shot` now neither restore nor save, and `?spawnAt=spawn` starts at the map's spawn point.
- The React Compiler lint rejected a `useMemo` over a `find` result. It wasn't needed: the element of the once-set array is already stable.

## Next steps
- Owner check on production with a real Google account: walk a few steps, go Home, come back, and the character should be on the same spot.
- Owner review of the new privacy sentence.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
