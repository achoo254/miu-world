---
name: project-test-strategy-smoke-audits-screens
description: 07/10/2026 Jev chose smoke E2E (~10 flows, blocks deploy) + Node quest-target prompt audit + pre-deploy phone/iPad screenshots reviewed by AI vision
metadata:
  type: project
---

Testing strategy changed 07/10/2026: owner said E2E caught nothing while he kept finding bugs by playing; Jev picked `smoke-plus-audits-and-screens` (plans/dattqh/reports/jev-261007-2135-test-strategy-*.json). Plan: plans/dattqh/261007-2135-test-strategy-smoke-audits-screens/.

**Why:** CI on main was red for 60 runs (E2E ~22-26 permanent failures, and the `check` job's vitest also red from timing: outland-plan budget, map-generation beforeAll 120 s, minigame draw 5 s), so red meant nothing.

**How to apply:** new E2E only when it is one of the core flows; anything that scales with content goes to Node (content:check / quest-target audit); layout problems go to the screens review (docs/screen-review.md once written), not new E2E. Check the plan's status before assuming these files exist.
