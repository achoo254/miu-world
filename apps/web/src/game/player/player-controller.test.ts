import { describe, expect, it } from 'vitest';
import { PlayerController, type LiquidAt } from './player-controller';
import type { SolidAt } from '@miu/voxel/grid-collision';

// A stream like the forest's: the bed under one block of water for x < 5, then a bank two blocks
// higher (Miu stands at y = 1 in the water and y = 3 on the bank).
const BANK_X = 5;
const solid: SolidAt = (x, y) => (x < BANK_X ? y < 1 : y < 3);
const liquid: LiquidAt = (x, y) => x < BANK_X && y === 1;

/** Walks toward the bank for 1.5 s (holding Jump or not), then lets go and settles for a second. */
function walkToBank(jump: boolean): PlayerController {
  const player = new PlayerController(solid, [2.5, 1, 2.5], 90, liquid);
  for (let i = 0; i < 90; i++) player.update(1 / 60, { dirX: 1, dirZ: 0, run: false, jump });
  for (let i = 0; i < 60; i++) player.update(1 / 60, { dirX: 0, dirZ: 0, run: false, jump: false });
  return player;
}

describe('player controller in water', () => {
  it('knows when Miu is in water', () => {
    expect(new PlayerController(solid, [2.5, 1, 2.5], 0, liquid).inWater).toBe(true);
    expect(new PlayerController(solid, [7.5, 3, 2.5], 0, liquid).inWater).toBe(false);
  });

  it('cannot walk up a two-block bank, but swims up and climbs out holding Jump', () => {
    const walked = walkToBank(false);
    expect(walked.position.x).toBeLessThan(BANK_X);
    const swam = walkToBank(true);
    expect(swam.position.x).toBeGreaterThan(BANK_X);
    expect(swam.position.y).toBeCloseTo(3, 1);
    expect(swam.onGround).toBe(true);
  });

  it('sinks slowly when Jump is let go', () => {
    const player = new PlayerController(() => false, [2.5, 5, 2.5], 0, () => true);
    for (let i = 0; i < 60; i++) player.update(1 / 60, { dirX: 0, dirZ: 0, run: false, jump: false });
    // One second of free fall would be 13 blocks; sinking tops out at a couple of blocks a second.
    expect(5 - player.position.y).toBeLessThan(2.5);
  });

  it('teleports to a spot at rest', () => {
    const player = new PlayerController(solid, [2.5, 1, 2.5], 0, liquid);
    player.teleport([8.5, 3, 2.5]);
    expect(player.position.toArray()).toEqual([8.5, 3, 2.5]);
    player.update(1 / 60, { dirX: 0, dirZ: 0, run: false, jump: false });
    expect(player.onGround).toBe(true);
  });
});
