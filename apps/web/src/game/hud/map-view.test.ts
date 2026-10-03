import { describe, expect, it } from 'vitest';
import { MAX_SCALE, blendView, clampView, fitLabels, fitScale, hitTest, overview, panBy, pinch, scaleLimits, toScreen, toWorld, zoomAt } from './map-view';

const rect = { x0: 0, z0: 0, x1: 800, z1: 800 };
const phone = { width: 390, height: 844 };
const inset = { x: 16, y: 80 };

describe('map view', () => {
  it('fits the whole map inside the inset screen, in the middle', () => {
    expect(fitScale(rect, phone, inset)).toBeCloseTo(358 / 800);
    expect(overview(rect, phone, inset)).toEqual({ cx: 400, cz: 400, scale: 358 / 800 });
    // A small map may still be zoomed in four times past the whole of it.
    expect(scaleLimits({ x0: 0, z0: 0, x1: 128, z1: 128 }, { width: 1180, height: 820 }, inset).max).toBeCloseTo((660 / 128) * 4);
    expect(scaleLimits(rect, phone, inset).max).toBe(MAX_SCALE);
  });

  it('turns world points into screen points and back, north up', () => {
    const view = { cx: 100, cz: 200, scale: 2 };
    expect(toScreen(view, phone, 100, 200)).toEqual([195, 422]);
    expect(toScreen(view, phone, 110, 190)).toEqual([215, 402]);
    expect(toWorld(view, phone, 215, 402)).toEqual([110, 190]);
  });

  it('drags the map with the finger', () => {
    const view = { cx: 100, cz: 200, scale: 2 };
    const moved = panBy(view, 40, -20);
    expect(moved).toEqual({ cx: 80, cz: 210, scale: 2 });
    // What was under the finger is still under it.
    const [wx, wz] = toWorld(view, phone, 50, 60);
    expect(toScreen(moved, phone, wx, wz)).toEqual([90, 40]);
  });

  it('zooms round the point under the finger, within the limits', () => {
    const view = { cx: 400, cz: 400, scale: 1 };
    const limits = { min: 0.5, max: 4 };
    const [wx, wz] = toWorld(view, phone, 100, 300);
    const zoomed = zoomAt(view, phone, 2, 100, 300, limits);
    expect(zoomed.scale).toBe(2);
    const [sx, sy] = toScreen(zoomed, phone, wx, wz);
    expect(sx).toBeCloseTo(100);
    expect(sy).toBeCloseTo(300);
    expect(zoomAt(view, phone, 100, 0, 0, limits).scale).toBe(4);
    expect(zoomAt(view, phone, 0.01, 0, 0, limits).scale).toBe(0.5);
  });

  it('pinches: spreading two fingers zooms in round their middle, moving them pans', () => {
    const view = { cx: 400, cz: 400, scale: 1 };
    const limits = { min: 0.5, max: 8 };
    const spread = pinch(view, phone, [{ x: 150, y: 400 }, { x: 250, y: 400 }], [{ x: 100, y: 400 }, { x: 300, y: 400 }], limits);
    expect(spread.scale).toBeCloseTo(2);
    const [mx, my] = toScreen(spread, phone, ...toWorld(view, phone, 200, 400));
    expect(mx).toBeCloseTo(200);
    expect(my).toBeCloseTo(400);
    const moved = pinch(view, phone, [{ x: 150, y: 400 }, { x: 250, y: 400 }], [{ x: 160, y: 430 }, { x: 260, y: 430 }], limits);
    expect(moved).toEqual({ cx: 390, cz: 370, scale: 1 });
  });

  it('keeps the view on the map: never past the whole map, never panned off it', () => {
    const fit = fitScale(rect, phone, inset);
    // Zoomed out too far: back to the whole map, in the middle.
    expect(clampView({ cx: 0, cz: 0, scale: 0.1 }, rect, phone, inset)).toEqual({ cx: 400, cz: 400, scale: fit });
    // Zoomed in, dragged past the north-west corner: the corner comes in no further than the inset.
    const near = clampView({ cx: -500, cz: -500, scale: 4 }, rect, phone, inset);
    expect(near.scale).toBe(4);
    expect(toScreen(near, phone, 0, 0)).toEqual([16, 80]);
    const far = clampView({ cx: 5000, cz: 5000, scale: 4 }, rect, phone, inset);
    expect(toScreen(far, phone, 800, 800)).toEqual([390 - 16, 844 - 80]);
    // Within the map, the view stays as it is; too close comes back to the closest zoom.
    expect(clampView({ cx: 300, cz: 500, scale: 2 }, rect, phone, inset)).toEqual({ cx: 300, cz: 500, scale: 2 });
    expect(clampView({ cx: 300, cz: 500, scale: 99 }, rect, phone, inset).scale).toBe(MAX_SCALE);
  });

  it('blends two views: the centre straight across, the zoom evenly', () => {
    expect(blendView({ cx: 0, cz: 0, scale: 1 }, { cx: 100, cz: 50, scale: 4 }, 0.5)).toEqual({ cx: 50, cz: 25, scale: 2 });
  });
});

describe('map taps and labels', () => {
  const view = { cx: 100, cz: 100, scale: 2 };
  const items = [
    { id: 'a', x: 100, z: 100 },
    { id: 'b', x: 108, z: 100 },
    { id: 'c', x: 300, z: 300 },
  ];

  it('picks the nearest marker within reach of the tap, else nothing', () => {
    const [ax, ay] = toScreen(view, phone, 100, 100);
    expect(hitTest(items, view, phone, ax + 3, ay, 24)?.id).toBe('a');
    expect(hitTest(items, view, phone, ax + 12, ay, 24)?.id).toBe('b');
    expect(hitTest(items, view, phone, ax, ay + 60, 24)).toBeNull();
  });

  it('leaves out labels that would cover one kept before them', () => {
    const boxes = [
      { x: 0, y: 0, width: 50, height: 16 },
      { x: 40, y: 8, width: 50, height: 16 },
      { x: 60, y: 0, width: 50, height: 16 },
      { x: 0, y: 30, width: 50, height: 16 },
    ];
    expect(fitLabels(boxes)).toEqual([true, false, true, true]);
  });
});
