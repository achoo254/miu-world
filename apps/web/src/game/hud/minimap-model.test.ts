import { describe, expect, it } from 'vitest';
import { PORTAL_COLOURS } from '@miu/voxel/portal-colours';
import type { WorldEntities } from '@miu/voxel/world-entities';
import { MARKER_COLOURS, commonHeight, headingAngle, minimapLegend, minimapMarkers, minimapPixels, onDisc, toMinimap } from './minimap-model';

const gate = (id: string, travel: string, x: number, z: number): WorldEntities['interactables'][number] => ({ id, kind: 'gate', name: `Cổng ${id}`, label: 'Đi qua cổng', position: [x, 13, z], yaw: 0, radius: 3, travel });
const names: Record<string, string> = { 'nong-trai': 'Nông trại', 'cho-phien': 'Chợ phiên', 'nha-cua-be': 'Nhà của Mochi' };
const regionName = (id: string): string | undefined => names[id];

describe('minimap markers', () => {
  const entities = {
    interactables: [gate('cong-nong-trai', 'nong-trai', 100, 50), gate('cong-cho-phien', 'cho-phien', 20, 30), { ...gate('npc', 'x', 0, 0), kind: 'npc' as const, travel: undefined }],
    props: [
      { model: 'generated/box-props/tt-portal-lime.glb', position: [101, 13, 52] as [number, number, number], yaw: 0, scale: 1 },
      { model: 'generated/box-props/tt-portal-pink.glb', position: [140, 13, 52] as [number, number, number], yaw: 0, scale: 1 },
      { model: 'generated/box-props/street-lantern.glb', position: [20, 13, 31] as [number, number, number], yaw: 0, scale: 1 },
    ],
    landmarks: [{ id: 'nha-va-vuon', name: 'Ngôi nhà và khu vườn', position: [81.5, 13, 80.5] as [number, number, number] }],
  };

  it('names each gate by where it leads, in the colour of the portal it stands in (a plain gate in violet)', () => {
    const markers = minimapMarkers(entities, { regionName });
    expect(markers).toEqual([
      { kind: 'gate', x: 100, z: 50, colour: PORTAL_COLOURS.lime[0], label: 'Nông trại' },
      { kind: 'gate', x: 20, z: 30, colour: '#8c3ff5', label: 'Chợ phiên' },
    ]);
  });

  it("marks the child's home on her own map, at its first landmark", () => {
    const [home] = minimapMarkers(entities, { regionName, homeName: 'Nhà của Mochi' });
    expect(home).toEqual({ kind: 'home', x: 81.5, z: 80.5, colour: MARKER_COLOURS.home, label: 'Nhà của Mochi' });
  });

  it('lists the child, the quest when there is one, the home, then each gate once in the legend', () => {
    const markers = [...minimapMarkers(entities, { regionName, homeName: 'Nhà của Mochi' }), { kind: 'gate' as const, x: 1, z: 1, colour: '#000000', label: 'Nông trại' }];
    expect(minimapLegend(markers, true).map((e) => e.label)).toEqual(['Bạn đang ở đây', 'Nơi làm nhiệm vụ', 'Nhà của Mochi', 'Cổng sang Nông trại', 'Cổng sang Chợ phiên']);
    expect(minimapLegend([], false).map((e) => e.kind)).toEqual(['player']);
  });
});

describe('minimap view', () => {
  const view = { x: 50, z: 50, half: 20, size: 200 };

  it('puts the centre in the middle, east to the right and north up', () => {
    expect(toMinimap(view, 50, 50)).toEqual([100, 100]);
    expect(toMinimap(view, 70, 50)).toEqual([200, 100]);
    expect(toMinimap(view, 50, 30)).toEqual([100, 0]);
  });

  it('keeps markers inside the disc', () => {
    expect(onDisc(view, 60, 60)).toBe(true);
    expect(onDisc(view, 69, 69)).toBe(false);
    expect(onDisc(view, 69, 50)).toBe(true);
    expect(onDisc(view, 69.6, 50, 5)).toBe(false);
  });

  it('points the arrow the way the child walks (facing 0 walks south, down the map)', () => {
    expect(headingAngle(0)).toBeCloseTo(Math.PI / 2);
    expect(headingAngle(Math.PI / 2)).toBeCloseTo(0);
    expect(Math.abs(headingAngle(Math.PI))).toBeCloseTo(Math.PI / 2);
  });
});

describe('minimap pixels', () => {
  it('colours each cell by its top block, lighter higher up, empty cells clear', () => {
    const horizon = { cells: [3, 1] as const, heights: new Uint8Array([13, 23, 0]), tops: new Uint8Array([1, 15, 0]) };
    const colours = new Map<number, [number, number, number]>([
      [1, [100, 200, 100]],
      [15, [200, 80, 60]],
    ]);
    const px = minimapPixels(horizon, (id) => colours.get(id), commonHeight(new Uint8Array([13, 13, 23])));
    expect([...px.slice(0, 4)]).toEqual([100, 200, 100, 255]);
    expect(px[4]).toBeGreaterThan(200);
    expect(px[7]).toBe(255);
    expect([...px.slice(8, 12)]).toEqual([0, 0, 0, 0]);
  });
});
