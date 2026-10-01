---
title: SGK lessons live and E2E time budget
date: 2026-10-01
summary: 70 textbook lessons opened on data-driven maps; E2E held to a fixed time budget on one worker
---

# SGK lessons live and E2E time budget

## What happened
- SGK phases 9–10: quest targets placed from `content/world/targets.json` + `looks.json` by a shared placer; all 70 Tiếng Việt 2 / Toán 2 lessons are active; Trường học region opened.
- The owner asked for a test-time rule that holds as content grows, without more workers (their Mac froze from parallel test runs).

## Decision
- E2E: 45 s default timeout; tests over 30 s must declare a longer timeout; CI suite budget 480 s, enforced by `apps/web/e2e/time-budget-reporter.ts`.
- Content-scale checks stay in Node (`content:check`); E2E samples the first and last chapter per region; review footage only with `REVIEW_SHOTS=1`; 1 worker locally, shard only on CI.
- Result: 63 E2E tests in 221 s (was 361 s for 64).

## Next steps
- Two review map images on staging still served stale by Cloudflare's upper tier; expire within max-age 14400.
- Target-catalogue follow-ups: duplicate character placements, `tv2-t16-canh-cua-go` as object, stand-in looks.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
