---
title: "More quest characters, each in at most two quests, and lessons that keep the child moving"
date: 2026-10-01
summary: "224 new quest NPCs, every SGK lesson over at least 4 places with at most 2 steps in a row at one, enforced by content:check; released to staging and production with the music batch (9b5a824)"
---

# More quest characters and lessons that keep the child moving

## What happened
- The child complained about standing in one place for most of a lesson. Measured first: 71/71 quests kept the child at one place for 3+ steps in a row (a school lesson did all 17 at its giver), and 22 characters played in more than 2 quests.
- Decisions: the owner chose the cap for every role; Jev chose at most 2 steps in a row and 4 places per quest (0.77), existing looks plus chibi characters (1.0), one exempt guide per map (0.72), and keeping 192x192 maps unless crowded (0.99).
- `pnpm content:spread` measures it; content:check now enforces it. 24 chibi NPC looks from the character library (one draw call each). The placer keeps a quest's places 14, then 10, then 7 blocks apart, within 36 blocks of its first place.
- Eight sub-agents rewrote the 70 lessons in parallel (one batch file each, NPCs added through a locked helper): 224 new characters, fresh goTo and dialogue lines, textbook wording, step ids and answers unchanged.
- Merge fixes: 13 human-named NPCs drawn as the pack's robots, crash dummy, zombie or orc got human looks; 4 objects still named after a dropped owner were renamed.

## Problems found
- The chibi NPCs overrode each species' playable model and portraits (last entry won): `role: npc` in characters.json, a test that cats still play as miu-cat (79117a3). The music session caught it from a failing build.
- Two E2E specs named characters the rewrite moved (Sâu Xanh, Sư Tử Vàng as a resident); they now read the lesson's own data, and the school spec plays lesson 1 itself.
- The forest tutorial (forest-ch1) keeps its one stay of three at the beaver: hand-placed and played end to end by E2E, so it is exempt by name.
- The music session ended with 13 tracks uncommitted on the shared tree; they were verified and committed here before the release.

## Next steps
- Owner check on production: lessons now walk the child between new friends.
- One school lesson (toan2-cd1-b06, 9 places) has a place only 7 blocks from the others; grow the school only if more lessons crowd.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
