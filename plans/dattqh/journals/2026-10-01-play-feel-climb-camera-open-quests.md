---
title: "Play feel: climbing ledges, a calmer camera, leaves you walk through, and every quest open in the map"
date: 2026-10-01
summary: "Owner feedback from watching their child play: backpack close button, camera tilt, auto-climb, walk through canopies, change character, open quests; live on staging and production (d82ffbc)"
---

# Play feel: climbing ledges, a calmer camera, and every quest open in the map

## What happened
- The owner watched their child play and sent six notes in a row: the backpack had no close button, the camera kept tipping toward the ground, the child had to jump at every ledge, canopies kept snagging her, she wanted to change character without losing progress, and every quest of a map should be takeable with no unlocking.
- Measured before changing anything: the 1-block step-up already worked; a jump peaks about 1.4 blocks, so the 2-block ledges the child jumped at (1,292 next to walkable ground in the forest, 621 in the school) could never be passed. The 2-block climb is now automatic (a 0.35 s hop); 3 blocks stay a wall.
- Leaves (3 block kinds) no longer collide, for the player and the camera.
- Camera: tilt band 0.12 to 0.75 rad (was -0.15 to 1.1), sideways swipes only turn, and the tilt drifts back to the default while walking.
- Changing character already kept everything (progress is per profile); it was only hard to find. Now in the pause menu too, and the species step says progress is kept. A server test proves it.
- No quest had prerequisites. The lock was that /play shows one quest's chapter and "Nhiệm vụ" left the game. Jev chose an in-game quest board (0.99) over drawing every quest's characters at once (draw-call budget). Picking a quest rebuilds the game where the child stands.
- Committed in five commits, pushed, released to staging and production with the owner's approval for this one deploy.

## Problems found
- The school wall and the houses' bank were 2 blocks on purpose ("the child steps up one block at most"); with the climb they would open 9,580 bank spots. Both are 3 blocks now, and the walk test proves nobody stands on the bank.
- The off-campus check first flagged 1,424 spots: those are the river and sidewalk, reachable before too with a 1-block step, so the test now guards the bank only.
- The React Compiler lint refused writing to a ref passed as a prop; a callback prop hands the spot reader up instead.
- A flaky `google-auth-routes.test.ts` (401 expected, 403 seen) showed once earlier today and never again in 8 runs.

## Next steps
- Owner check on production: climb a terrace in the forest, walk through a canopy, switch quests from "Nhiệm vụ", change animal from the pause menu.
- Re-shoot the school review pairs (the wall is one block taller).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
