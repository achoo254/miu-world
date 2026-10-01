---
title: "School campus after the mocks, maps four times bigger"
date: 2026-10-01
summary: "School rebuilt from the owner's 3 mocks; both maps 192x48x192; column meshes keep the draw-call budget"
---

# School campus after the mocks, maps four times bigger

## What happened
- Owner sent three school mocks (campus, classroom block inside/out, main building) and, mid-batch, asked for maps several times bigger. Jev chose 96 first (I had overstated the perf risk), then 192x192 and 48 high, both maps now, once the facts were laid out (only chunks within view distance are drawn).
- Mocks cut into 20 frames in designs/truong-hoc/ with docs/design-truong-hoc.md.
- School: street, wall and gate, yard with beds and flagpole, two-storey main building with clock tower, galleries, a furnished classroom per floor, stairs; sports hall, court, playground, greenhouse, art yard, canteen, houses, river. Forest: chapter 1 corner kept, six meadows with wild families (61 ambients).

## Problems found
- Bigger view coverage pushed the forest to 167-180 draw calls: chunks now merge per column (one draw call per column).
- Live review shots lifted the view distance, the ambient director then hid everyone: live shots keep the quality distance.
- The placer took 21 s on the big map: cell lookups by hash, ~1 s now.
- Two things of one place 1.5 apart stole each other's prompt: member gap 2.5.
- The first stair step sat under the door lintel (no headroom): a landing before it; a walk test now proves both floors are reachable.

## Next steps
- Owner review on staging; iPad load time on the bigger maps (DEVICE-01).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
