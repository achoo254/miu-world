import { afterEach, describe, expect, it } from 'vitest';
import type { PlayerPosition } from '@miu/schema/player-position';
import { rememberSpot, withSessionSpots } from './player-position';

afterEach(() => window.sessionStorage.clear());

const spot = (map: string, x: number): PlayerPosition => ({ map, position: [x, 13, 40], facing: 0 });

describe('spots of this session', () => {
  it('lay over the server spot of the same map and leave other maps alone', () => {
    rememberSpot(spot('khu-rung-bi-mat', 200));
    const merged = withSessionSpots([spot('khu-rung-bi-mat', 10), spot('truong-hoc', 50)]);
    expect(merged.find((p) => p.map === 'khu-rung-bi-mat')?.position[0]).toBe(200);
    expect(merged.find((p) => p.map === 'truong-hoc')?.position[0]).toBe(50);
    expect(merged).toHaveLength(2);
  });

  it('fall back to the server when there is nothing in the session or its content is not a spot', () => {
    expect(withSessionSpots([spot('truong-hoc', 50)])).toEqual([spot('truong-hoc', 50)]);
    window.sessionStorage.setItem('miu.spots', '{"x":{"map":1}}');
    expect(withSessionSpots([spot('truong-hoc', 50)])).toEqual([spot('truong-hoc', 50)]);
  });
});
