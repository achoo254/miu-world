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

  it('climbs a two-block bank on its own, and also swims up and climbs out holding Jump', () => {
    const walked = walkToBank(false);
    expect(walked.position.x).toBeGreaterThan(BANK_X);
    expect(walked.position.y).toBeCloseTo(3, 1);
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

describe('player controller at ledges', () => {
  /** Flat ground, a ledge `height` blocks high from x = 5, and optional blocks overhead. */
  function walkInto(height: number, overhead: SolidAt = () => false): PlayerController {
    const ground: SolidAt = (x, y, z) => (x >= 5 ? y < 1 + height : y < 1) || overhead(x, y, z);
    const player = new PlayerController(ground, [2.5, 1, 2.5], 90);
    for (let i = 0; i < 120; i++) player.update(1 / 60, { dirX: 1, dirZ: 0, run: false, jump: false });
    return player;
  }

  it('steps onto one block and climbs two blocks without a jump', () => {
    expect(walkInto(1).position.y).toBeCloseTo(2, 2);
    const climbed = walkInto(2);
    expect(climbed.position.y).toBeCloseTo(3, 2);
    expect(climbed.position.x).toBeGreaterThan(6);
    expect(climbed.onGround).toBe(true);
  });

  it('keeps a three-block face a wall, and needs room overhead to climb', () => {
    expect(walkInto(3).position.x).toBeLessThan(5);
    const roofed = walkInto(2, (x, y) => x < 5 && y === 4);
    expect(roofed.position.x).toBeLessThan(5);
  });

  it('shows the climb as a short hop, not a jump to the top', () => {
    const ground: SolidAt = (x, y) => (x >= 5 ? y < 3 : y < 1);
    const player = new PlayerController(ground, [4.7, 1, 2.5], 90);
    player.update(1 / 60, { dirX: 1, dirZ: 0, run: false, jump: false });
    player.update(1 / 60, { dirX: 1, dirZ: 0, run: false, jump: false });
    expect(player.climbing).toBe(true);
    expect(player.onGround).toBe(false);
    expect(player.position.y).toBeLessThan(3);
  });
});
