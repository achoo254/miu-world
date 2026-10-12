import { describe, expect, it } from 'vitest';
import { FLIGHT, FLIGHT_REACH, cameraAt, chooseFlight, hiddenness, type FlightPlan, type SolidAt, type Vec3 } from './flight-path';

const center = [100, 13, 200] as const;
const plan: FlightPlan = { center, startAngle: 0, direction: 1 };
const open: SolidAt = async () => false;
const horizontal = (eye: Vec3): number => Math.hypot(eye[0] - center[0], eye[2] - center[2]);

describe('the camera flight', () => {
  it('starts high and wide and ends low and close, always looking at the centre', () => {
    const start = cameraAt(plan, 0);
    const end = cameraAt(plan, 1);
    expect(horizontal(start.eye)).toBeCloseTo(FLIGHT.startRadius);
    expect(start.eye[1] - center[1]).toBeCloseTo(FLIGHT.startHeight);
    expect(horizontal(end.eye)).toBeCloseTo(FLIGHT.endRadius);
    expect(end.eye[1] - center[1]).toBeCloseTo(FLIGHT.endHeight);
    expect(start.target).toEqual([100, 13 + FLIGHT.lookHeight, 200]);
    expect(end.target).toEqual(start.target);
  });

  it('turns round the centre by the sweep, the way the plan says', () => {
    const angleOf = (t: number, p: FlightPlan): number => {
      const { eye } = cameraAt(p, t);
      return (Math.atan2(eye[0] - center[0], eye[2] - center[2]) * 180) / Math.PI;
    };
    expect(angleOf(1, plan) - angleOf(0, plan)).toBeCloseTo(FLIGHT.sweepDegrees);
    expect(angleOf(1, { ...plan, direction: -1 }) - angleOf(0, { ...plan, direction: -1 })).toBeCloseTo(-FLIGHT.sweepDegrees);
  });

  it('eases in and out: the first steps are smaller than the middle ones, and a time outside 0..1 is held at the end', () => {
    const at = (t: number): number => cameraAt(plan, t).eye[1];
    expect(Math.abs(at(0.05) - at(0))).toBeLessThan(Math.abs(at(0.55) - at(0.5)));
    expect(cameraAt(plan, 2)).toEqual(cameraAt(plan, 1));
    expect(cameraAt(plan, -1)).toEqual(cameraAt(plan, 0));
  });

  it('stays within the reach the page loads the map for', () => {
    for (let i = 0; i <= 20; i++) expect(horizontal(cameraAt(plan, i / 20).eye)).toBeLessThanOrEqual(FLIGHT_REACH);
  });
});

describe('choosing a flight', () => {
  it('scores an open view 0 and takes the first direction', async () => {
    expect(await hiddenness(plan, open)).toBe(0);
    expect(await chooseFlight(center, open)).toEqual({ center, startAngle: 225, direction: 1 });
  });

  it('counts the camera inside a block heavily and a block on the line of sight lightly', async () => {
    const inside: SolidAt = async (x, y, z) => x === Math.floor(cameraAt(plan, 0).eye[0]) && y === Math.floor(cameraAt(plan, 0).eye[1]) && z === Math.floor(cameraAt(plan, 0).eye[2]);
    expect(await hiddenness(plan, inside)).toBe(5);
    const wall: SolidAt = async (_x, y) => y === 20;
    expect(await hiddenness(plan, wall)).toBeGreaterThan(0);
  });

  it('counts a tree or roof close under the camera in the close part of the flight, not at the wide start', async () => {
    const closeEye = cameraAt(plan, 1).eye;
    const under: SolidAt = async (x, y, z) => x === Math.floor(closeEye[0]) && y === Math.floor(closeEye[1]) - 4 && z === Math.floor(closeEye[2]);
    expect(await hiddenness(plan, under)).toBeGreaterThan(0);
    const farEye = cameraAt(plan, 0).eye;
    const wideStart: SolidAt = async (x, y, z) => x === Math.floor(farEye[0]) && y === Math.floor(farEye[1]) - 4 && z === Math.floor(farEye[2]);
    expect(await hiddenness({ ...plan, startAngle: 0 }, wideStart)).toBe(0);
  });

  it('turns away from a wall that hides one side of the centre', async () => {
    // A tall wall just east of the centre hides every view from the east.
    const wall: SolidAt = async (x, _y, z) => x >= center[0] + 4 && x <= center[0] + 6 && Math.abs(z - center[2]) < 30;
    const chosen = await chooseFlight(center, wall);
    const best = await hiddenness(chosen, wall);
    for (const startAngle of [0, 45, 90, 135, 180, 225, 270, 315]) {
      for (const direction of [1, -1] as const) expect(best).toBeLessThanOrEqual(await hiddenness({ center, startAngle, direction }, wall));
    }
  });
});
