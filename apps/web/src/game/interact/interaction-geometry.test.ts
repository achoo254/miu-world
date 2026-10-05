import { describe, expect, it } from 'vitest';
import {
  HIPS_ABOVE_FEET,
  STAND_UP_DISTANCE,
  SWING_AMPLITUDE,
  lieBody,
  seatBody,
  standUpSpot,
  stateKey,
  swingAngle,
  swingBody,
  toWorld,
  watchSpot,
  worldFacing,
} from './interaction-geometry';
import { PLAYER_SCALE } from '../entities/player-character';
import { SEAT_ABOVE_FEET } from '../player/vehicle-ride';
import { SWING_PERIOD } from './player-actions';

const at = (yaw: number, scale = 1) => ({ position: [10, 5, 20] as const, yaw, scale });

describe('where she goes on an object', () => {
  it('turns and scales a point of the model as the prop field places it', () => {
    expect(toWorld(at(0, 2), [1, 0.5, 0])).toEqual([12, 6, 20]);
    const turned = toWorld(at(90), [0, 0, 1]);
    expect(turned[0]).toBeCloseTo(11);
    expect(turned[2]).toBeCloseTo(20);
    expect(worldFacing(at(90), 0)).toBeCloseTo(Math.PI / 2);
  });

  it('rests the seated clip on the seat top and stands her up in front of it', () => {
    expect(HIPS_ABOVE_FEET).toBeCloseTo(SEAT_ABOVE_FEET * PLAYER_SCALE, 6);
    const body = seatBody(at(180), { at: [0, 0.5, 0.1] }, 180);
    expect(body.position[1]).toBeCloseTo(5.5 - HIPS_ABOVE_FEET);
    expect(Math.cos(body.facing)).toBeCloseTo(1);
    const up = standUpSpot(at(180), body);
    expect(up[2] - body.position[2]).toBeCloseTo(STAND_UP_DISTANCE);
    expect(up[1]).toBe(5);
  });

  it('lays her along the mattress with her feet toward its foot, above its top', () => {
    const body = lieBody(at(0), { at: [0, 0.7, 0.3], feet: 180 });
    expect(body.position[1]).toBeGreaterThan(5.7);
    expect(body.position[2]).toBeLessThan(20.3);
    expect(Math.cos(body.facing)).toBeCloseTo(-1);
  });

  it('puts the spot to watch a screen in front of it, facing it', () => {
    const { spot, facing } = watchSpot(at(90), { height: 1, front: 0, screen: { at: [0, 0.3, 0], size: [0.4, 0.3] } }, undefined);
    expect(spot[0]).toBeGreaterThan(11);
    expect(spot[1]).toBe(5);
    expect(Math.sin(facing)).toBeCloseTo(-1);
  });

  it('swings the seat about the bar keeping its rope length, tipping her with it, and holds still for less motion', () => {
    expect(swingAngle(SWING_PERIOD / 4 + 3 * SWING_PERIOD, false)).toBeCloseTo(SWING_AMPLITUDE);
    expect(swingAngle(5, true)).toBe(0);
    const rest = seatBody(at(0), { at: [-1.2, 0.62, 0] }, 0);
    const pivot = toWorld(at(0), [-1.2, 2.97, 0]);
    const swung = swingBody(rest, pivot, 0, SWING_AMPLITUDE);
    const length = (p: readonly number[]): number => Math.hypot((p[0] ?? 0) - pivot[0], (p[1] ?? 0) - pivot[1], (p[2] ?? 0) - pivot[2]);
    expect(length(swung.position)).toBeCloseTo(length(rest.position));
    expect(swung.position[0]).toBeCloseTo(rest.position[0]);
    expect(swung.position[2]).toBeLessThan(rest.position[2]);
    expect(swung.pitch).toBeCloseTo(SWING_AMPLITUDE);
    // Facing the swing's back she tips the other way.
    expect(swingBody({ ...rest, facing: Math.PI }, pivot, 0, SWING_AMPLITUDE).pitch).toBeCloseTo(-SWING_AMPLITUDE);
  });

  it('keys an object by its decor spot, or by where it stands', () => {
    expect(stateKey('lamp-toggle', [1, 2, 3], { slot: 'lamp', index: 2 })).toBe('lamp-toggle@lamp#2');
    expect(stateKey('tv-watch', [77.08, 13.64, 61.37], null)).toBe('tv-watch@77,14,61');
  });
});
