import { describe, expect, it } from 'vitest';
import { parseViewShot } from './review-shots';

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
