import { describe, expect, it } from 'vitest';
import { parseDrivenCamera, parseViewShot } from './review-shots';

describe('view shots', () => {
  it('reads any camera from the shot name: eye, target and field of view', () => {
    const view = parseViewShot('view:14,17,12:40,13.5,44:55');
    expect(view?.eye.toArray()).toEqual([14, 17, 12]);
    expect(view?.target.toArray()).toEqual([40, 13.5, 44]);
    expect(view?.fov).toBe(55);
  });

  it('refuses a malformed view instead of guessing a camera', () => {
    for (const name of ['view:14,17:40,13,44:55', 'view:14,17,12:40,13,44', 'view:a,b,c:1,2,3:50', 'view:1,2,3:4,5,6:0', 'top']) {
      expect(parseViewShot(name), name).toBeNull();
    }
  });
});

describe('driven shots', () => {
  it('start from the camera in the shot name, like a view', () => {
    expect(parseViewShot('drive:1,2,3:4,5,6:60')?.eye.toArray()).toEqual([1, 2, 3]);
  });

  it('read the camera a tool leaves on the page', () => {
    const camera = parseDrivenCamera({ eye: [10, 20, 30], target: [11, 12, 13], fov: 62 });
    expect(camera?.eye.toArray()).toEqual([10, 20, 30]);
    expect(camera?.target.toArray()).toEqual([11, 12, 13]);
    expect(camera?.fov).toBe(62);
  });

  it('ignore a missing or malformed camera instead of moving to a guessed one', () => {
    for (const value of [undefined, null, 'x', { eye: [1, 2], target: [1, 2, 3], fov: 50 }, { eye: [1, 2, 3], target: [1, 2, 3], fov: 0 }, { eye: [1, 2, 'a'], target: [1, 2, 3], fov: 50 }, { eye: [1, 2, 3], target: [1, 2, 3] }]) {
      expect(parseDrivenCamera(value), JSON.stringify(value)).toBeNull();
    }
  });
});
