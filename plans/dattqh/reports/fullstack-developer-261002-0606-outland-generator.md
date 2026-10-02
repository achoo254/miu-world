# Outland generator: plan, regions, life (phase 2 of maps-x50)

**Status:** done · **Plan:** `plans/dattqh/261002-0606-maps-x50-outland/plan.md` · **Tier:** L

## What was built

Pure TypeScript in `packages/voxel/src`, with no `three` and no `node:` imports in non-test files. `outland.ts` was not changed.

- **`outland-plan.ts`**, `planOutland(spec, size, waterLevel)`, lays out the outer land:
  - **Water:** a pond spreads from every run of three or more water columns on a core edge. Rivers start from the two widest runs and run out to the world's edge, and more rivers cross the land. Lakes are spread apart, and each theme sets the counts.
  - **Villages:** 34–38 per map, sited on level dry land. Each has a flat pad with houses (walls, a 2-wide door, glass windows, a gable roof in brick-red, roof-blue or wood-red), a well, and 0–3 stalls. Names are Vietnamese, unique within a map, and never contain "Miu".
  - **Roads:** a spanning tree over the villages plus a road from the middle of each core side, a few extra loops, gently bent.
  - **Fields and clearings:** fields per village (paddy, crop, orchard, pasture) and clearings (viewpoints, theme scenes, the ride-stop areas).
  - **The land:** a function of the column, built from these layers in order:
    1. Noise for rolling ground and hills (more hills for castle, fewer for farm), capped at ground 34.
    2. Valleys carved at slope 0.6 down to the water, with sand banks.
    3. Village pads levelled.
    4. A 48-block seam toward the core's edge heights. It uses a window average that widens with distance, so ponds at the edge round off instead of running straight out.
    5. Roads laid on a profile at the mean of the cut and fill Lipschitz envelopes (≤ 0.5 rise per block), with plank decks and log rails over water.
  - **Trees:** one possible tree per 6×6 cell, with density from noise and the theme. Trunks are log or birch-log, crowns are leaves, autumn or pink, and crown corners are trimmed by a hash, so every tree is identical from any region.
  - **Lookups:** `outlandGround` (the deck y on bridges) and `outlandSkyline` (the exact tallest block, sharing the drawing code with regions) use a 64-block spatial index.
- **`outland-region.ts`**, `fillOutlandRegion`, fills each region in a fixed order: columns, then buildings, then trees. Trunks overwrite, and leaves fill only air, so the first tree in global cell order wins any overlap. Core columns are left untouched. A region outside the bounds becomes air. The output does not depend on any earlier region or on what the reused buffer held.
- **`outland-life.ts`**, `outlandEntities`, produces:
  - **Rides:** 3–4 "Xe ra <village>" stops per core side to the farthest villages, and one "Xe về trung tâm" stop per village back to the nearest side.
  - **People:** 7–10 per village. About 60% work at theme trades and the rest at everyday ones. Names are unique within a village.
  - **Animals:** 8–12 per village, weighted by theme.
  - **Props:** yard props, pasture fences and scene props, using only models in `spec.models` at their scales.
  - **Scenes:** kites, picnic, fishers with boats, woodcutters, roadside tea, football, readers, lookouts.
  - **Landmarks:** viewpoints with a signpost, plus landmarks for villages and viewpoints.
  - **Spots:** every home and work spot is on open ground, off water and roads, at least 6 blocks from ride stops, and a straight walk from home.

## Measured (Node, dev Mac)

| | Budget | Measured |
|---|---|---|
| `planOutland` | ≤ 100 ms | 15–46 ms per theme; worst 45 ms over 7 seeds × 8 themes |
| `fillOutlandRegion` | ≤ 50 ms | 3.9–7.9 ms per region on average |
| `outlandSkyline` × 200k | "cheap" | 150–270 ms (forest is the slowest) |
| `outlandEntities` | ≤ 200 ms | 46–71 ms; worst 75 ms |

Counts per theme with the test spec (seed 1234):

| Theme | Villages | People | Animals | Props | Rides | Landmarks |
|---|---|---|---|---|---|---|
| river | 36 | 386 | 362 | 1161 | 52 | 45 |
| forest | 34 | 381 | 323 | 1023 | 50 | 44 |
| school | 36 | 394 | 357 | 988 | 52 | 46 |
| hamlet | 38 | 392 | 372 | 1254 | 54 | 48 |
| market | 38 | 390 | 374 | 1041 | 54 | 47 |
| farm | 34 | 351 | 332 | 1622 | 50 | 42 |
| library | 34 | 364 | 337 | 1225 | 50 | 44 |
| castle | 34 | 356 | 329 | 1359 | 50 | 48 |

I also ran a sweep outside the test suite: 7 seeds × 8 themes with varied ground, water level and edges.
- Minimums: 34 villages, 325 people, 322 animals.
- 0 seam violations (more than one block off the core edge, or water not continuing from the core's water).
- 0 road steps over one block.
- Every core side had a road to a village.

## Tests (20, each file under 5 s)

`pnpm vitest run packages/voxel/src/outland-{plan,region,life}.test.ts`: 6, 6 and 8 tests pass. They cover:
- **Determinism:** same layout and identical bytes from a separate plan and from a reused buffer.
- **Seam:** within one block on all four sides; water carries on outward.
- **Slopes:** steps over two blocks are under 0.2%; ground ≤ 34.
- **Roads:** every road column steps at most one block to a neighbouring road column; there is a road from each side to a village; side roads have two free blocks overhead; bridge decks are planks.
- **Buildings:** on pad ground, off roads and water.
- **Skyline:** equals the top block of every column in 6 regions, including the seam and village neighbours.
- **Borders:** trees crossing a 2×2 region border are complete on both sides.
- **Core and bounds:** core left untouched; outside-bounds regions are air; a wrong buffer shape throws.
- **Timing:** loose assertions at 2× budget.
- **Life:**
  - Per-theme counts are at least 25 villages, 300 people and 300 animals.
  - Ids are unique and start with `ngoai-`; only `spec.models` are used.
  - Rides go from each side to real village names, one per village back, and both ends are on ground.
  - Spots are off water and roads and at least 5 blocks from stops; in sampled filled regions there is a solid block under each spot and two air blocks above.

Gates run: `pnpm exec tsc --noEmit -p tsconfig.json` (root; covers `packages/**`) exit 0. `pnpm --filter @miu/web exec tsc --noEmit -p tsconfig.json` exit 0. `pnpm exec eslint packages/voxel/src/outland-*.ts --max-warnings=0` exit 0. The whole-repo `pnpm test` and E2E were not run, as instructed.

## Known limits and decisions to confirm

1. **The water convention differs from the brief's wording.** The core maps (`zone-map.ts`) fill water from the bed up to and including the level, so the outland's top water block is at **y = waterLevel**, not waterLevel − 1. This is stated in the code. On bridges, `outlandGround` returns the deck's y.
2. **Tree trunks are solid** `log`/`birch-log`, as the brief and `OUTLAND_BLOCK_NAMES` say. Core trees use the non-solid `tree-log` (the child walks through trees). For outland trees to behave the same, `tree-log`/`tree-birch-log` would need to be added to `OUTLAND_BLOCK_NAMES`. That is an export change, so I left it to you.
3. **Paddies have no standing water.** They are grass with dirt bunds, so "ground < waterLevel ⇔ water" holds everywhere.
4. **About 85% of wanted houses fit** (4–12 wanted per village; roads through the square take space). A village whose straight links all cross the core or a lake gets no road but keeps its rides; none appeared in the sweep.
5. **Extra exports** for integration: `sampleColumn` with its `WATER`/`ROAD`/`SHORE`/`RAIL` flags, `surfaceBlock`, `forEachTree`/`drawTree`, `drawStructure`/`structureExtent`, `coreDistance`, `roadDistance` and `fieldAt`.
6. **Single-threaded lookups.** They share module-level scratch values to stay allocation-free, which is correct for one thread (the worker or the tools).
7. **File size.** `outland-plan.ts` is 1650 lines (layout, column function, drawing, skyline). It can be split into land, shapes and layout files later if wanted.
