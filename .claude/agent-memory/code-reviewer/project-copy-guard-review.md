---
name: project-copy-guard-review
description: Textbook-copy guard (shingle fingerprints) review findings — overlapping-shingle hash files are reconstructable; label-based exemptions and per-string scanning leak
metadata:
  type: project
---

2026-10-25 review of the original-learning-content plan, phase 1 (`tools/content/no-textbook-copy.ts`, `content/learning/textbook-fingerprints.bin`):

- Unkeyed hashes of overlapping 7-word shingles (40-bit, ~26k entries) let anyone rebuild the text: take a 6-word seed and try every vocabulary word for the 7th. A test rebuilt 66/66 words of an SGK passage. "Hashed so unreadable" claims are false unless the hashes are keyed (HMAC) or winnowed.
- Exemptions keyed on a self-declared label (`source.kind: folk`) skip the scan entirely, so the label alone bypasses the guard.
- Per-string scanning misses text split across short strings (sort tiles, dialogue lines ≤7 words).
- "Only shrinks" lists need a baseline check; otherwise adding ids is silent.
- Worksheets built from the inventory still print book text: check `worksheet.lessonId` as a textbook link.

**Why:** the plan's legal goal (stop publishing SGK text in a public repo) silently failed while every gate was green.
**How to apply:** for any "fingerprint/blocklist instead of the source" design, test reconstruction and bypass empirically with a scratch script before trusting it. Related: [[project-content-review-heuristics]], [[project-plan-review-heuristics]].
