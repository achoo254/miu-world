---
title: "Trees you walk through and that fade in the way, a camera that follows, perf on the bigger maps"
date: 2026-10-01
summary: "Perf re-measured on 192x192 maps (all 12 runs in budget); trunks passable; trees between camera and child fade; camera swings behind while walking; released with the accessory batch to staging and production (11b0e20)"
---

# Trees you walk through and that fade in the way, a camera that follows, perf on the bigger maps

## What happened
- Perf matrix on the 4x bigger maps (5d480ca): 12/12 runs at 59.9-60 FPS average, worst 5% 51.5-53.2, at most 108 draw calls and 83k triangles, first area 1.85 MB gzip (was 0.9), load 2.1-2.7 s. CPU throttled in Chromium on the Mac; GPU, heat and battery still need the iPad.
- Owner: the child still snagged on trees. Trunks were plain `log` blocks, the same as bridge decks and house trim, so two new blocks `tree-log` and `tree-birch-log` (same textures, `solid: false`) are used for ordinary trunks and the ancient tree's roots and branches; its 3x3 core stays solid (77836f7).
- Owner: turn the camera smoothly to where the child walks. It follows only while she walks forward (sideways or backward would make it chase her in circles), at half the autopilot's pace, and not within 1 s of her own drag (1a17309).
- Owner: fade the trees that hide her, keep quest things normal. A per-face flag from the mesher (what she walks through and is not water) and a tube around the camera-to-child line in the block shader drop pixels in a 4x4 ordered pattern: still opaque, no sorting, no extra draw call; quest things are their own meshes. Checked on screenshots in two dense woods, edge softened once (11b0e20).
- A parallel session added seven accessory slots (9828c3f). Ports and commits were handed over by message; the final gate ran on the combined HEAD, then staging and production were released with the owner's approval for this deploy.

## Problems found
- The first fade looked like a hard-edged column of dots; a wider, softer tube fixed it.
- Running tests or generators during the perf run would have skewed it: map regeneration waited until perf finished.

## Next steps
- Owner check on production: walk through trees, see the trunk in front fade, let the camera swing behind while walking.
- iPad Gen 10 measurement (DEVICE-01) on the bigger maps.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
