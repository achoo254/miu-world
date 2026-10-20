---
name: project-plan-review-heuristics
description: Miu World plan red-team checks that found real defects (env wiped by deploy setup, OAuth drops deep links, HMAC token leaks ids, GA MP attribution)
metadata:
  type: project
---

Checks that paid off in the 2026-10-12 auto-marketing plan review (`plans/dattqh/261012-1116-auto-marketing/`):

- New server env var: `tools/deploy/production/deploy.sh setup` rewrites `/etc/miu/production.env` from scratch; any var added only via a separate subcommand (like `turn`) is wiped by the next `setup` unless `setup` also writes it.
- Any "after sign-in, continue to X" plan: Google OAuth callback always `res.redirect(303, '/')` and the login screen reads only `?error`; deep links / invite codes must survive the OAuth round trip + consent + `/create`.
- "Signed token not reversible without the key" is false for HMAC (signing ≠ encryption); there is no server signing secret in config today.
- GA4 Measurement Protocol without gtag: source/medium only inherit from an online session via `session_id`, so pure MP traffic source is "(not set)"; client-sent events need a separate allowlist from server-only ones.

**Why:** these were assumptions stated confidently in plan text that the code contradicted.
**How to apply:** grep these four spots first when reviewing plans touching deploy env, sign-in flow, share/invite links or analytics. See also [[project-review-worktree-moving-target]].
