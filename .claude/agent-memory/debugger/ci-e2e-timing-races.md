---
name: ci-e2e-timing-races
description: CI E2E shard runners vary ±40% in speed; UI timers (toast 3.2 s, quest card fold 12 s) race Playwright on slow shards — compare per-shard ratios and same-test traces before blaming a commit
metadata:
  type: project
---

Debugging CI E2E failures that "started after commit X" (07/10/2026, Olympic Math event): the commit was not the cause. GitHub runners for the same shard differed up to ±40% in speed between runs (shard 1 of one run was 37% faster). On slow runners the game page runs at about 3 frames/s, so every Playwright action takes 0.3–1 s. That pushes UI timers into races: a toast's stale timer clearing the next toast, and the quest card folding after 12 s mid-click.

**Why:** A pass/fail split of 2/2 against 0/2 looked causal but was runner variance plus latent timer races.

**How to apply:**
- Compute per-shard median duration ratios against a pre-change run, using `gh run view --log-failed`, which also lists the passing tests of failed jobs.
- Check whether DOM-only steps (sign-in tap, navigate) are slower too. If they are, the cause is the environment.
- Do a local A/B with `git archive <sha>` into the scratchpad, run `pnpm install --offline`, use SwiftShader args, and set CDP `Emulation.setCPUThrottlingRate`.
- Read the screencast frames in trace.zip to see what was actually on screen.

Related: [[e2e-shared-child-rules]]
