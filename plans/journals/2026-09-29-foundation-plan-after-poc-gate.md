---
title: Foundation plan after POC gate
date: 2026-09-29
summary: Brainstormed the owner's next-steps proposal and turned it into an 8-phase Foundation plan with Jev-decided validation
---

# Foundation plan after POC gate

## Context
The owner proposed next steps after the POC gate: close the open decisions, then build the monorepo and backend, with visual tuning running in parallel. Brainstorm report: `plans/dattqh/reports/brainstorm-260929-1905-next-steps-after-poc-gate.md`. Plan: `plans/dattqh/260929-1911-foundation-after-poc-gate/`.

## Decisions
- Vite + React SPA instead of Next.js. Jev picked it at confidence 0.54 and the owner confirmed it. Reason: the game runs client-side only, is served from static hosting, and uses a strict CSP.
- Drizzle ORM, with PGlite for local dev and tests (the dev machine has no Docker or psql). CI runs the same tests on real Postgres.
- Backend work comes before engine integration, as the owner proposed. The weakest assumption behind this order is that mobile GPUs can handle the engine, and it stays unmeasured until DEVICE-01.
- `packages/voxel` stays pure TypeScript. The Three.js runtime moves to `apps/web/src/game`. Quest progression and reward logic go in `packages/quest`, shared by the web app and the server.
- The owner delegated the 8 validation questions to Jev. A child profile stores only a display name, deleting a profile deletes all of its data, and the parent area is protected by a PIN.

## Lessons
- `docs/` and `.claude/rules/` had been scoped from the POC plan by mistake. The Master Plan is the source of truth, so the first phase of the new plan realigns them.
- Serving the review page over LAN on plain http breaks `Secure` cookies. Dev and review builds need a non-Secure cookie, and production must enforce `Secure`.
- The NPC label moves every frame, so its position cannot go through React state. React owns only the label's content and visibility.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
