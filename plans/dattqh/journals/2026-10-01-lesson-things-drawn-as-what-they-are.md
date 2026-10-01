---
title: Lesson things drawn as what they are
date: 2026-10-01
summary: "Emoji-built block props, 263 looks, characters in one place, shared-model bug fixed"
---

# Lesson things drawn as what they are

## What happened
- Jev picked "world variety" (confidence 1.0) over KTX2, a sticker album and an empty library region.
- Measured: 312 quest things drawn with 95 looks (47 on one letter shape; red/yellow/blue envelopes identical); 19 lesson views showed one character twice.
- Found while checking shots: the loader shares one scene per model, so several targets with one model in a view showed only the last one (three calves → one).

## Decision
- Block props built from Fluent Emoji (MIT) by `tools/assets/build-emoji-props.ts` (16-cell grid, 2 deep, vertex colours, deterministic), colour variants via `colorize`; `tint` on looks for pack models. Props turn to face the camera.
- `character` in targets.json; `castHidden` shows one entry per character, where the current step points.
- content:check: ≤ 6 different things per look, no two differently named things of a lesson alike, no character twice in a view.
- Each interactable clones its model (`SkeletonUtils.clone`).

## Next steps
- Sticker album: Jev said not to queue it yet.
- Auto-trigger steps send no hint, so a character stays at the last pointed place until the next step.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
