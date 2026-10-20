---
name: ci-maxfailures-hidden-tests
description: CI shard 4 always hits maxFailures=10 and skips its last 8 tests, so "passed before" may mean "never ran"; live-world UI makes every Playwright step ~0.8–5 s on CI
metadata:
  type: project
---

Since at least 05/10/2026, CI shard 4 has ended with `10 failed, 8 did not run` because `playwright.ci.config.ts` sets `maxFailures: 10`. Tests late in that shard (for example `pets:110`, `pets:128` and all of `bosses.spec`) never ran until a sharding shift moved them earlier. On 07/10/2026, the boss-duel commits made those tests run for the first time, so they looked like regressions.

CI renders with SwiftShader at 1–5 frames/s. Whenever the game is drawing (normal play, a boss fight staged in the world, the pet care board), each Playwright round trip waits for a frame. That makes evaluate/expect take about 0.8 s, click about 3.6 s with one page and about 5 s with two pages, `scrollIntoViewIfNeeded` about 3.3 s and `boundingBox` about 2 s. Modal screens that pause the game stay fast. Game-time scenes stretch about 4× on CI because `dt` is capped at 0.1 s per frame.

**Why:** "passed at commit X" may mean "did not run at X". Also, a UI change from a paused modal to the live world multiplies the test's wall time on CI without making the product any slower.

**How to apply:**
- Before calling a test a regression, grep each shard summary for `did not run` and check whether the test appears in the base run at all.
- To compare fps between tests, use `__miuStats.frames` across trace samples. Look at median step durations per action type in `test.trace`.
- Local throttling cannot reproduce CI's main-thread blocking well. `taskpolicy -b` is too slow; CDP throttle 30× still gives 200–350 ms evaluates. Use CI traces for per-step costs and local runs only for A/B.

Related: [[ci-e2e-timing-races]]
