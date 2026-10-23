---
name: online-switch-review
description: Miu per-player online/voice switches (0025) — where enforcement lives and the gaps to recheck (HTTP invites, TURN, no-PIN gate)
metadata:
  type: project
---

Per-player owner switches (`child_profiles.online_allowed`, `voice_chat_allowed`) are enforced only in the WS path: online ticket 403, hub connect close 4404, VoiceService.refuse/allowed(to). Reviewed 2026-10-23 (commit 0ed8b894).

**Why:** HTTP social routes (`POST /invites`, `/invites/:code/accept`, friend request answers) and `GET /voice/ice-servers` do not read the switches; and with no PIN set `requireParentGate` is always open, so a child can flip the switches herself (Settings → Quản lý tài khoản is always shown since 35441120).

**How to apply:** when a change claims "online off = plays alone / no friends", check every HTTP social route, not just the hub; for any parent-only control, ask what happens on an account with no PIN.
