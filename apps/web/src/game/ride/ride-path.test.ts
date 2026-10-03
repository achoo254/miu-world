import { describe, expect, it } from 'vitest';
import { CUT_FADE_S, RidePath, airHeight, hop, phaseAt, rideTimeline, tripAt } from './ride-path';
import { RIDE_PROFILES, rideKind } from './ride-kind';

describe('rideKind', () => {
  it('tells the vehicles of the maps apart by model, else by name', () => {
    expect(rideKind({ model: 'generated/box-props/tt-balloon-rainbow.glb', name: 'Khinh khí cầu tới Khu sống' })).toBe('balloon');
    expect(rideKind({ model: 'generated/box-props/ntu-cable-cabin.glb', name: 'Cáp treo tới Hồ băng' })).toBe('cable-car');
    expect(rideKind({ model: 'generated/box-props/dba-rowboat.glb', name: 'Thuyền tới Núi lửa' })).toBe('boat');
    expect(rideKind({ model: 'packs/kenney-nature-kit/2.1/canoe.glb', name: 'Đò về cổng' })).toBe('boat');
    expect(rideKind({ model: 'generated/props/railway-red.glb', name: 'Tàu rừng về bìa rừng' })).toBe('train');
    expect(rideKind({ model: 'generated/props/automobile.glb', name: 'Xe buýt về cổng' })).toBe('bus');
    expect(rideKind({ name: 'Đò tới bến' })).toBe('boat');
    expect(rideKind({ name: 'Đồi hoa' })).toBe('bus');
  });
});

describe('RidePath', () => {
  const path = new RidePath([
    [0, 10, 0],
    [0, 10, 30],
    [40, 14, 30],
  ]);

  it('measures along the ground and samples by distance', () => {
    expect(path.length).toBe(70);
    expect(path.sample(15)).toMatchObject({ x: 0, y: 10, z: 15 });
    const corner = path.sample(50);
    expect(corner.x).toBeCloseTo(20);
    expect(corner.y).toBeCloseTo(12);
    expect(corner.z).toBeCloseTo(30);
  });

  it('heads along the line (forward is sin yaw, cos yaw) and clamps past the ends', () => {
    expect(path.sample(5).yaw).toBeCloseTo(0);
    expect(path.sample(60).yaw).toBeCloseTo(Math.PI / 2);
    expect(path.sample(-5)).toMatchObject({ x: 0, z: 0 });
    expect(path.sample(500)).toMatchObject({ x: 40, z: 30 });
  });
});

describe('airHeight', () => {
  it('climbs from the stop, keeps the cruise height and comes down at the far stop', () => {
    expect(airHeight(0, 200, 13, 15, 40, 50)).toBeCloseTo(13);
    expect(airHeight(100, 200, 13, 15, 40, 50)).toBeCloseTo(40);
    expect(airHeight(200, 200, 13, 15, 40, 50)).toBeCloseTo(15);
    expect(airHeight(25, 200, 13, 15, 40, 50)).toBeGreaterThan(13);
    expect(airHeight(25, 200, 13, 15, 40, 50)).toBeLessThan(40);
  });

  it('a short line rises and comes down without a jump at its middle', () => {
    const a = airHeight(9.9, 20, 13, 13, 40, 50);
    const b = airHeight(10.1, 20, 13, 13, 40, 50);
    expect(Math.abs(a - b)).toBeLessThan(0.5);
  });
});

describe('rideTimeline / tripAt', () => {
  it('takes a few seconds whatever the length, longer trips a little longer', () => {
    const short = rideTimeline(110, RIDE_PROFILES.bus.maxSpeed, 1, 0.7);
    const long = rideTimeline(780, RIDE_PROFILES.bus.maxSpeed, 1, 0.7);
    expect(short.travel).toBeGreaterThanOrEqual(3.5);
    expect(long.travel).toBeLessThanOrEqual(5.5);
    expect(long.travel).toBeGreaterThan(short.travel);
    // Every ride ends within eight seconds of the tap (boarding and getting off included).
    expect(long.total).toBeLessThanOrEqual(8);
  });

  it('shows a short trip whole: from rest at the stop to rest at the far stop, moving forward all along', () => {
    const tl = rideTimeline(150, RIDE_PROFILES.bus.maxSpeed, 1, 0.7);
    expect(tl.cut).toBe(false);
    expect(tripAt(tl, 0).s).toBeCloseTo(0);
    expect(tripAt(tl, tl.travel).s).toBeCloseTo(150);
    let last = -1;
    for (let t = 0; t <= tl.travel; t += 0.05) {
      const { s, fade } = tripAt(tl, t);
      expect(s).toBeGreaterThanOrEqual(last - 1e-9);
      expect(fade).toBe(0);
      last = s;
    }
    expect(tripAt(tl, 0.01).speed).toBeLessThan(5);
    expect(tripAt(tl, tl.travel / 2).speed).toBeLessThanOrEqual(RIDE_PROFILES.bus.maxSpeed + 1e-6);
  });

  it('cuts the middle of a trip past top speed: the two ends at top speed at most, joined by a fade', () => {
    const tl = rideTimeline(780, RIDE_PROFILES.train.maxSpeed, 1.3, 0.7);
    expect(tl.cut).toBe(true);
    expect(tripAt(tl, tl.travel).s).toBeCloseTo(780);
    const before = tripAt(tl, tl.travel / 2 - 0.01);
    const after = tripAt(tl, tl.travel / 2 + 0.01);
    expect(before.s).toBeLessThan(tl.shown / 2 + 1);
    expect(after.s).toBeGreaterThan(780 - tl.shown / 2 - 1);
    // Dark at the jump, clear a fade's length either side of it.
    expect(before.fade).toBeGreaterThan(0.9);
    expect(tripAt(tl, tl.travel / 2 - CUT_FADE_S - 0.01).fade).toBe(0);
    for (let t = 0; t <= tl.travel; t += 0.05) expect(tripAt(tl, t).speed).toBeLessThanOrEqual(RIDE_PROFILES.train.maxSpeed + 1e-6);
  });

  it('names the part of the journey', () => {
    const tl = rideTimeline(200, 50, 1, 0.5);
    expect(phaseAt(tl, 0.5).phase).toBe('board');
    expect(phaseAt(tl, 1.5)).toEqual({ phase: 'travel', t: 0.5 });
    expect(phaseAt(tl, tl.board + tl.travel + 0.1).phase).toBe('alight');
    expect(phaseAt(tl, tl.total).phase).toBe('done');
  });
});

describe('hop', () => {
  it('leaves from a, lands on b and passes over both', () => {
    const a = [0, 10, 0] as [number, number, number];
    const b = [2, 11, 0] as [number, number, number];
    expect(hop(a, b, 0.8, 0)).toEqual(a);
    expect(hop(a, b, 0.8, 1)).toEqual(b);
    expect(hop(a, b, 0.8, 0.5)[1]).toBeGreaterThan(11);
  });
});
