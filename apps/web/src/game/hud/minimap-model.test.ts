import { describe, expect, it } from 'vitest';
import { PORTAL_COLOURS } from '@miu/voxel/portal-colours';
import type { WorldEntities } from '@miu/voxel/world-entities';
import { GATE_COLOUR, MARKER_COLOURS, commonHeight, headingAngle, legendGroups, minimapMarkers, minimapPixels, onDisc, questMarker, rideOf, sideGiverMarkers, stationMarkers, toMinimap } from './minimap-model';
import { sideGiversOf } from './side-givers';
import type { QuestListResponse } from '@miu/schema/game';

type Target = WorldEntities['interactables'][number];
const gate = (id: string, travel: string, x: number, z: number): Target => ({ id, kind: 'gate', name: `Cổng ${id}`, label: 'Đi qua cổng', position: [x, 13, z], yaw: 0, radius: 3, travel });
const stop = (id: string, name: string, x: number, z: number): Target => ({ id, kind: 'object', name, label: 'Lên xe', position: [x, 13, z], yaw: 0, radius: 2, ride: [0, 13, 0] });
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
    landmarks: [
      { id: 'nha-va-vuon', name: 'Ngôi nhà và khu vườn', position: [81.5, 13, 80.5] as [number, number, number] },
      { id: 'goc-hoc', name: 'Góc học của {name}', position: [90, 13, 70] as [number, number, number] },
    ],
  };

  it('names each gate by where it leads, in the colour of the portal it stands in (a plain gate in violet), and walks to it', () => {
    const markers = minimapMarkers(entities, { regionName }).filter((m) => m.kind === 'gate');
    expect(markers).toEqual([
      { id: 'cong-nong-trai', kind: 'gate', x: 100, z: 50, colour: PORTAL_COLOURS.lime[0], label: 'Nông trại', detail: 'Cổng sang Nông trại', goal: { targetId: 'cong-nong-trai' } },
      { id: 'cong-cho-phien', kind: 'gate', x: 20, z: 30, colour: GATE_COLOUR, label: 'Chợ phiên', detail: 'Cổng sang Chợ phiên', goal: { targetId: 'cong-cho-phien' } },
    ]);
  });

  it("marks the child's home on her own map at its first landmark, the other landmarks as named places", () => {
    const markers = minimapMarkers(entities, { regionName, homeName: 'Nhà của Mochi', fill: (t) => t.replace('{name}', 'Mochi') });
    expect(markers[0]).toEqual({ id: 'nha-va-vuon', kind: 'home', x: 81.5, z: 80.5, colour: MARKER_COLOURS.home, label: 'Nhà của Mochi', goal: { position: [81.5, 13, 80.5] } });
    expect(markers.filter((m) => m.kind === 'place')).toEqual([{ id: 'goc-hoc', kind: 'place', x: 90, z: 70, colour: MARKER_COLOURS.place, label: 'Góc học của Mochi', goal: { position: [90, 13, 70] } }]);
    // Away from home every landmark is a place.
    expect(minimapMarkers(entities, { regionName }).filter((m) => m.kind === 'place').map((m) => m.id)).toEqual(['nha-va-vuon', 'goc-hoc']);
  });

  it('marks the gate that leads home as her home', () => {
    const home = minimapMarkers({ ...entities, interactables: [gate('cong-nha', 'nha-cua-be', 5, 6)] }, { regionName, homeRegion: 'nha-cua-be' })[0];
    expect(home).toEqual({ id: 'cong-nha', kind: 'home', x: 5, z: 6, colour: MARKER_COLOURS.home, label: 'Nhà của Mochi', detail: 'Cổng về nhà', goal: { targetId: 'cong-nha' } });
  });

  it('makes one station of the stops of a ride standing together, naming every place it goes', () => {
    expect(rideOf('Xe buýt tới Chợ rau hoa')).toEqual({ vehicle: 'Xe buýt', to: 'Chợ rau hoa' });
    expect(rideOf('Xe buýt về cổng')).toEqual({ vehicle: 'Xe buýt', to: 'cổng' });
    expect(rideOf('Xe ra Xóm Cối Xay')).toEqual({ vehicle: 'Xe', to: 'Xóm Cối Xay' });
    expect(rideOf('Cáp treo')).toEqual({ vehicle: 'Cáp treo', to: null });
    const stations = stationMarkers([
      stop('ben-1', 'Xe buýt tới Chợ rau hoa', 210, 250),
      stop('ben-2', 'Xe buýt về cổng', 206, 250),
      stop('ben-3', 'Xe buýt tới Quảng trường', 595, 430),
      stop('ga-1', 'Tàu rừng tới Hồ', 212, 252),
    ]);
    expect(stations.map((s) => [s.id, s.label, s.detail ?? null, s.goal])).toEqual([
      ['ben-1', 'Bến xe buýt', 'Đi tới: Chợ rau hoa · cổng', { targetId: 'ben-1' }],
      ['ben-3', 'Bến xe buýt', 'Đi tới: Quảng trường', { targetId: 'ben-3' }],
      ['ga-1', 'Ga tàu rừng', 'Đi tới: Hồ', { targetId: 'ga-1' }],
    ]);
  });

  it('keeps to the core and the bus hubs just past its edge, not the villages further out', () => {
    const wide = {
      ...entities,
      interactables: [stop('edge-1', 'Xe ra Xóm Cối Xay', 407, -6), stop('edge-2', 'Xe ra Xóm Đồng Mía', 407, -14), stop('far', 'Xe tới Bến', 2000, 300)],
      landmarks: [...entities.landmarks, { id: 'lang-xa', name: 'Làng xa', position: [-900, 13, 400] as [number, number, number] }],
    };
    const markers = minimapMarkers(wide, { regionName, size: [800, 800] });
    expect(markers.map((m) => [m.id, m.label, m.detail ?? null])).toEqual([
      ['edge-1', 'Bến xe', 'Đi tới: Xóm Cối Xay · Xóm Đồng Mía'],
      ['nha-va-vuon', 'Ngôi nhà và khu vườn', null],
      ['goc-hoc', 'Góc học của {name}', null],
    ]);
  });

  it('marks the characters who offer minigames, with their games, only when they stand on this map', () => {
    const parrot: Target = { id: 'vet', kind: 'npc', name: 'Vẹt', label: 'Nói chuyện', position: [7, 13, 8], yaw: 0, radius: 2 };
    const markers = sideGiverMarkers([parrot], [
      { targetId: 'vet', games: ['Bắn cung có gió', 'Ghép hình'] },
      { targetId: 'far-away', games: ['Đua thuyền'] },
    ]);
    expect(markers).toEqual([{ id: 'vet', kind: 'side', x: 7, z: 8, colour: MARKER_COLOURS.side, label: 'Vẹt', detail: 'Trò chơi: Bắn cung có gió · Ghép hình', goal: { targetId: 'vet' } }]);
  });

  it('marks a storyteller as one, with its next chapter and its games, in place of its minigame marker', () => {
    const bird: Target = { id: 'hoa-mi', kind: 'npc', name: 'Họa Mi', label: 'Nói chuyện', position: [3, 13, 4], yaw: 0, radius: 2 };
    const markers = sideGiverMarkers([bird], [{ targetId: 'hoa-mi', games: ['Hợp xướng'] }], [{ targetIds: ['hoa-mi'], next: 'Chương 2: Tiếng vọng' }]);
    expect(markers).toEqual([{ id: 'hoa-mi', kind: 'story', x: 3, z: 4, colour: MARKER_COLOURS.story, label: 'Họa Mi', detail: 'Chuyện: Chương 2: Tiếng vọng · Trò chơi: Hợp xướng', goal: { targetId: 'hoa-mi' } }]);
  });

  it("marks the quest's place, walked to by its target", () => {
    expect(questMarker({ id: 'parrot-guide', label: 'Vẹt', x: 1, z: 2 })).toEqual({ id: 'parrot-guide', kind: 'quest', x: 1, z: 2, colour: MARKER_COLOURS.quest, label: 'Vẹt', detail: 'Nơi làm nhiệm vụ', goal: { targetId: 'parrot-guide' } });
  });

  it('gives the legend a chip for each group the map has, in order, with its count', () => {
    const markers = [...minimapMarkers(entities, { regionName, homeName: 'Nhà của Mochi' }), questMarker({ id: 'q', label: 'Q', x: 0, z: 0 })];
    expect(legendGroups(markers).map((g) => [g.kind, g.label, g.count])).toEqual([
      ['quest', 'Nhiệm vụ', 1],
      ['home', 'Nhà', 1],
      ['gate', 'Cổng', 2],
      ['place', 'Địa điểm', 1],
    ]);
    expect(legendGroups([])).toEqual([]);
  });
});

describe('side quest givers', () => {
  const step = (s: Record<string, unknown>) => s as never;
  const quest = (id: string, giver: string, game: string, status: 'active' | 'stub' = 'active') =>
    ({
      quest:
        status === 'stub'
          ? { id, region: 'lau-dai', chapter: 1, title: id, status }
          : {
              id,
              region: 'lau-dai',
              chapter: 1,
              title: id,
              status,
              summary: '',
              category: 'side',
              texts: {},
              steps: [step({ id: 'ask', title: 'Lời mời', kind: 'dialogue', target: giver, lines: [] }), step({ id: 'play', title: game, kind: 'challenge', mechanic: 'minigame', game: 'x' })],
              reward: { xp: 1, coins: 1 },
            },
      state: 'open',
      progress: {},
    }) as unknown as QuestListResponse['quests'][number];

  it('reads who offers which games from the list, each giver once', () => {
    const list = { quests: [quest('a', 'cao', 'Bắn cung có gió'), quest('b', 'vet', 'Ghép hình của {name}'), quest('c', 'cao', 'Đua thuyền'), quest('d', 'cao', 'x', 'stub')] };
    expect(sideGiversOf(list, (t) => t.replace('{name}', 'Mochi'))).toEqual([
      { targetId: 'cao', games: ['Bắn cung có gió', 'Đua thuyền'] },
      { targetId: 'vet', games: ['Ghép hình của Mochi'] },
    ]);
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
