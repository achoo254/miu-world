---
name: project-content-review-heuristics
description: Checks that found real bugs when reviewing quest/NPC-story JSON content (logic-step rendering, repetition, branch-dependent letters)
metadata:
  type: project
---

Quest content can be "correct" in JSON yet broken on screen; the 2026-10-19 batch-2a story review found these:

- Logic steps: UI (`logic-challenge.tsx`) renders `elements` ONLY for `logicType: pattern`, and always appends a trailing "?" cell. A `puzzle` whose clues live only in `elements` is unsolvable; a pattern with a mid-sequence gap or "the 9th item" question shows a misleading trailing "?".
- Maze cells always render S=🐱, G=⭐, #=🧱; prompts saying "ô chú cáo/khỉ" or "ô chữ S/G" don't match the screen.
- content:check only catches verbatim duplicate lines — grep for duplicate `grid`, identical number pairs, and repeated openers (wind blew things away, find-3-items) yourself.
- Letters (`content/npcs/*.json` arcs) often assume one `decision` branch; check each letter against all choices.
- Fear at ≥3 hearts / secret at 4: check whether a chapter *dramatizes* the profile fear earlier even without a confession.

**Why:** these all passed the author's gates and per-group reports. **How to apply:** run a quick script over `content/quests/yarn-*.json` for grids/numbers/elements-on-non-pattern before reading prose. Related: [[project-plan-review-heuristics]].
