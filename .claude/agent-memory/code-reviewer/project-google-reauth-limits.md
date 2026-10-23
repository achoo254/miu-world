---
name: project-google-reauth-limits
description: Google cannot force re-auth (no prompt=login/max_age); auth_time needs claims param + "Session age claims" setting; fake upstreams always emit auth_time
metadata:
  type: project
---

Google's OIDC docs (checked 2026-10-23) list only prompt=none|consent|select_account and say "Google does not support Google Account reauth requests". `auth_time` is only in the ID token when the request sends `claims={"id_token":{"auth_time":{"essential":true}}}` AND "Session age claims" is enabled in Google Auth Platform → Settings → Advanced (app must be In production + Verified). Unsupported prompt values get "Error 400 invalid_request, Invalid prompt: …" at Google.

auth-next's fake Google (`src/__tests__/helpers/fake-upstreams.ts`) always emits `auth_time`, so its fresh-login tests pass while real Google fails.

**Why:** the 2026-10-23 Miu/auth-next PIN re-auth fix relied on Google honouring prompt=login + max_age=0; that also hit the account portal's `recentLogin` actions (delete account, link/unlink) and Chat's reauth (prompt=login max_age=600).
**How to apply:** any "force fresh sign-in via Google" claim → demand an empirical prod check; check every client that sends prompt=login/max_age, not just the new one. See [[project-plan-review-heuristics]].
