import { describe, expect, it } from 'vitest';
import { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { SideQuestTable } from '../content/side-quest-table';
import { sideFolk, sideSpots, spawnNetwork, type SideGround } from './side-givers';

const [GRASS, PATH, WALL] = [1, 2, 3];
const GROUND = 4;

/** 64 × 32 × 64 blocks of grass, a path along z = 10, and whatever `build` adds. */
function world(build: (w: VoxelWorld) => void = () => undefined): VoxelWorld {
  const w = new VoxelWorld([4, 2, 4]);
  for (let x = 0; x < 64; x++) for (let z = 0; z < 64; z++) for (let y = 0; y <= GROUND; y++) w.set(x, y, z, z === 10 && y === GROUND ? PATH : GRASS);
  build(w);
  return w;
}

const ground = (w: VoxelWorld): SideGround => ({
  world: w,
  wayIds: new Set([PATH]),
  spawn: [5, 10],
  groundY: () => GROUND,
  canStand: (x, z) => w.get(x, GROUND, z) === GRASS && w.get(x, GROUND + 1, z) === 0,
  landmark: (name) => (name === 'Ao làng' ? [40, 40] : undefined),
});

describe('side quest givers', () => {
  it('stand beside the way nearest their place', () => {
    const spot = sideSpots(ground(world()));
    expect(spot({ place: 'Ao làng' }, [])).toEqual([40, 12]);
    expect(spot({ at: [20, 3] }, [])).toEqual([20, 8]);
  });

  it('keep their distance from what is placed already', () => {
    const [x, z] = sideSpots(ground(world()))({ at: [40, 40] }, [[40, 12]]);
    expect(Math.hypot(x - 40, z - 12)).toBeGreaterThanOrEqual(6);
    expect([11, 12]).toContain(z);
  });

  it("stand by the spawn's ways: a path that does not join them does not count", () => {
    const w = world((v) => {
      for (let x = 30; x < 60; x++) v.set(x, GROUND, 40, PATH);
    });
    const [, z] = sideSpots(ground(w))({ at: [45, 44] }, []);
    expect(z).toBeLessThanOrEqual(12);
  });

  it('read a path under an arch as one way, and a wall across it as its end', () => {
    const arch = world((v) => v.set(20, GROUND + 3, 10, WALL));
    expect(spawnNetwork(arch, new Set([PATH]), [5, 10]).has(40 + 10 * 64)).toBe(true);
    const wall = world((v) => v.set(30, GROUND + 1, 10, WALL));
    const net = spawnNetwork(wall, new Set([PATH]), [5, 10]);
    expect(net.has(29 + 10 * 64)).toBe(true);
    expect(net.has(40 + 10 * 64)).toBe(false);
  });

  it('fail loudly when a place is not on the map', () => {
    expect(() => sideSpots(ground(world()))({ place: 'Không có' }, [])).toThrow(/no landmark "Không có"/);
  });

  it('bring their company and the residents, as everyday life of their own', () => {
    const w = world();
    const g = ground(w);
    const table: SideQuestTable = {
      region: 'thu',
      givers: [{ id: 'cho-thu', name: 'Chó Thử', look: 'animal-dog', where: 'Bên đường làng', at: [40, 12], company: [{ routine: 'pupil', name: 'Bạn nhỏ xem', model: 'person-a' }], games: [] }],
      residents: [{ routine: 'dog', name: 'Chó Ao Làng', model: 'animal-dog', place: 'Ao làng' }],
      hosts: [],
      guardians: [],
    };
    const folk = sideFolk({
      table,
      givers: new Map([['cho-thu', [40, 12] as const]]),
      spots: sideSpots(g),
      life: {
        world: w,
        surface: () => GROUND,
        standY: () => GROUND + 1,
        onPath: (_x, z) => z === 10,
        inWater: () => false,
        questSpots: [[40, 12]],
        scaleOf: () => 1,
        isWay: (_x, z) => z === 10,
        spawn: [5, 10],
      },
      seed: 7,
    });
    expect(folk.map((a) => [a.id, a.name])).toEqual([
      ['folk-pupil-1', 'Bạn nhỏ xem'],
      ['folk-dog-1', 'Chó Ao Làng'],
    ]);
    for (const a of folk) expect(Math.hypot(a.position[0] - 40, a.position[2] - 12)).toBeGreaterThanOrEqual(5);
  });
});
