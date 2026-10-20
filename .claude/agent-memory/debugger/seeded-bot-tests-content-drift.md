---
name: seeded-bot-tests-content-drift
description: Server bot tests with a fixed seed break on content-only commits when the scenario is a rare softmax draw (bots on a quest almost never choose meet)
metadata:
  type: project
---

Fixed-seed bot tests (BotRunner + real walk grid) can turn red on content-only commits: a regenerated map's `places` in `content/world/walk/<map>.json` shifts how the RNG is consumed even when the `.bin` grid is unchanged. In bot-flow.test.ts (fixed 2026-10-19), seed 2 passed by luck; only about 1 in 12 seeds passed on both the old and new grid, because a bot chasing its quest gets +2 (GOAL_BONUS/SEEK_BONUS) against meet 0.6.

**Why:** content work regenerates maps often, so a test built on a lucky draw keeps breaking CI.

**How to apply:** when such a test fails, first sweep seeds on both the old grid (`git archive <old> content/world/walk/<map>.*` into the scratchpad, pass the dir to `new WalkStore(dir)`) and the new grid. If most seeds fail on both, the scenario is rare by design: remove the competing goal in the test; do not hunt for a new seed. Related: [[ci-e2e-timing-races]].
