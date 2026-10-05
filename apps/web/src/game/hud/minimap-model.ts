// What the minimap and the full map show (owner's mock, panel 14; owner, 03/10/2026: "không hiển thị nhiệm vụ
// phụ và muốn click trên bản đồ sẽ di chuyển đến địa điểm"), worked out once per map from its data so the
// drawing stays a few canvas calls: the map from above (the top block of each horizon cell, shaded by height),
// the gates in their portal colours named by where they lead, the child's home, the ride stops, the named
// places, the characters who offer a minigame, the quest's place; each marker knows where a walk to it goes.
// Pure: no DOM, no three.js.
import { PORTAL_COLOURS, portalColourOf } from '@miu/voxel/portal-colours';
import type { Interactable, WorldEntities } from '@miu/voxel/world-entities';
import type { WalkGoal } from '../../game-bridge/game-store';

export type MarkerKind = 'player' | 'quest' | 'home' | 'gate' | 'story' | 'side' | 'stop' | 'place';
/** What a marked place is (the child herself is drawn apart). */
export type PlaceKind = Exclude<MarkerKind, 'player'>;

export interface MinimapMarker {
  /** Unique on the map: the target's or the named place's id. */
  id: string;
  kind: PlaceKind;
  x: number;
  z: number;
  /** Its colour on the map and in the legend. */
  colour: string;
  /** Its name, on the map once zoomed in enough and on its card. */
  label: string;
  /** A second line on its card: where a gate or a stop takes her, the games a character offers. */
  detail?: string;
  /** Where "Đi tới đây" walks her. */
  goal: WalkGoal;
}

/** Colours of the markers that are not a portal's. */
export const MARKER_COLOURS: Readonly<Record<Exclude<MarkerKind, 'gate'>, string>> = {
  home: '#f45d4c',
  quest: '#ffc93c',
  player: '#2f6ff0',
  side: '#d6336c',
  story: '#e8590c',
  stop: '#0b7285',
  place: '#7a5230',
};
/** A gate with no portal of its own colour standing in it. */
export const GATE_COLOUR = '#8c3ff5';
/** How near a portal's tunnel must stand to a gate to give it its colour (blocks). */
const PORTAL_REACH = 5;
/** Stops of one ride this near each other are one station on the map (blocks). */
const STATION_REACH = 16;
/**
 * How far past the core's edge the full map reaches (blocks): the bus hubs out to the land round the map stand
 * just outside it; the villages further out are not on the map's picture and are left off.
 */
export const MAP_MARGIN = 24;

/** The legend's groups, in the order the chips show them; each can be hidden from the map. */
export const MARKER_GROUPS: ReadonlyArray<{ kind: PlaceKind; label: string }> = [
  { kind: 'quest', label: 'Nhiệm vụ' },
  { kind: 'story', label: 'Chuyện' },
  { kind: 'side', label: 'Trò chơi' },
  { kind: 'home', label: 'Nhà' },
  { kind: 'gate', label: 'Cổng' },
  { kind: 'stop', label: 'Bến xe' },
  { kind: 'place', label: 'Địa điểm' },
];

const at = (t: { position: readonly number[] }): { x: number; z: number } => ({ x: t.position[0] ?? 0, z: t.position[2] ?? 0 });

/**
 * A ride's name split into the vehicle and where it goes ("Xe buýt tới Chợ rau hoa" → "Xe buýt", "Chợ rau
 * hoa"; "Xe buýt về cổng" → "Xe buýt", "cổng"; "Xe ra Xóm Cối Xay" → "Xe", "Xóm Cối Xay").
 */
export function rideOf(name: string): { vehicle: string; to: string | null } {
  const match = /^(.+?) (?:tới|về|ra) (.+)$/.exec(name);
  return match ? { vehicle: match[1] ?? name, to: match[2] ?? null } : { vehicle: name, to: null };
}

/**
 * One marker per station: the stops of one ride standing near each other (a hub with a stop for each
 * destination) are one "Bến …" (a train's is a "Ga …"), its card naming every place it goes; the walk goes to
 * its first stop.
 */
export function stationMarkers(interactables: readonly Interactable[]): MinimapMarker[] {
  const stations: Array<{ first: Interactable; vehicle: string; to: string[] }> = [];
  for (const stop of interactables) {
    if (!stop.ride) continue;
    const { vehicle, to } = rideOf(stop.name);
    const { x, z } = at(stop);
    const station = stations.find((s) => s.vehicle === vehicle && Math.hypot(at(s.first).x - x, at(s.first).z - z) <= STATION_REACH);
    if (station) {
      if (to && !station.to.includes(to)) station.to.push(to);
    } else stations.push({ first: stop, vehicle, to: to ? [to] : [] });
  }
  return stations.map(({ first, vehicle, to }) => ({
    id: first.id,
    kind: 'stop',
    ...at(first),
    colour: MARKER_COLOURS.stop,
    label: `${/^tàu/i.test(vehicle) ? 'Ga' : 'Bến'} ${vehicle.toLocaleLowerCase('vi')}`,
    ...(to.length ? { detail: `Đi tới: ${to.join(' · ')}` } : {}),
    goal: { targetId: first.id },
  }));
}

/**
 * The map's fixed markers: the child's home (on her home map, at the map's first landmark; elsewhere the gate
 * that leads there), every gate (in the colour of the portal it stands in, named by the region it leads to),
 * the ride stations, and the named places.
 */
export function minimapMarkers(
  entities: Pick<WorldEntities, 'interactables' | 'props' | 'landmarks'>,
  options: {
    regionName: (id: string) => string | undefined;
    homeName?: string;
    homeRegion?: string;
    fill?: (text: string) => string;
    /** The core's size (x, z): markers further than MAP_MARGIN past its edge are left out. */
    size?: readonly [number, number];
  },
): MinimapMarker[] {
  const fill = options.fill ?? ((text: string) => text);
  const portals = entities.props.flatMap((p) => {
    const colour = portalColourOf(p.model);
    return colour ? [{ x: p.position[0], z: p.position[2], colour: PORTAL_COLOURS[colour][0] }] : [];
  });
  const gates = entities.interactables
    .filter((t) => t.kind === 'gate' && t.travel)
    .map((t): MinimapMarker => {
      const { x, z } = at(t);
      const place = options.regionName(t.travel ?? '') ?? t.name;
      if (options.homeRegion !== undefined && t.travel === options.homeRegion) {
        return { id: t.id, kind: 'home', x, z, colour: MARKER_COLOURS.home, label: place, detail: 'Cổng về nhà', goal: { targetId: t.id } };
      }
      const portal = portals.filter((p) => Math.hypot(p.x - x, p.z - z) <= PORTAL_REACH).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
      return { id: t.id, kind: 'gate', x, z, colour: portal?.colour ?? GATE_COLOUR, label: place, detail: `Cổng sang ${place}`, goal: { targetId: t.id } };
    });
  const [first, ...rest] = entities.landmarks;
  const ownHome = options.homeName !== undefined && first !== undefined;
  const home: MinimapMarker[] = ownHome ? [{ id: first.id, kind: 'home', ...at(first), colour: MARKER_COLOURS.home, label: options.homeName ?? '', goal: { position: first.position } }] : [];
  const places = (ownHome ? rest : entities.landmarks).map(
    (l): MinimapMarker => ({ id: l.id, kind: 'place', ...at(l), colour: MARKER_COLOURS.place, label: fill(l.name), goal: { position: l.position } }),
  );
  const size = options.size;
  const onMap = (m: MinimapMarker): boolean => !size || (m.x >= -MAP_MARGIN && m.z >= -MAP_MARGIN && m.x <= size[0] + MAP_MARGIN && m.z <= size[1] + MAP_MARGIN);
  return [...home, ...gates, ...stationMarkers(entities.interactables), ...places].filter(onMap);
}

/** A character of this map who offers minigames (side-givers.ts), with the games' names. */
export interface SideGiver {
  targetId: string;
  games: readonly string[];
}

/** A character of this map who tells a story (story-tellers.ts): its targets and the chapter it offers next. */
export interface StoryTeller {
  targetIds: readonly string[];
  /** The next chapter's title; null once every chapter is finished (the story stays to replay). */
  next: string | null;
}

/**
 * The characters who offer a minigame or tell a story, where they stand on this map (one not on it is left out): a
 * storyteller is marked as one, with its next chapter and its games on the card.
 */
export function sideGiverMarkers(interactables: readonly Interactable[], givers: readonly SideGiver[], tellers: readonly StoryTeller[] = []): MinimapMarker[] {
  const gamesOf = new Map(givers.map((g) => [g.targetId, g.games]));
  const marked = new Set<string>();
  const story = tellers.flatMap((teller): MinimapMarker[] => {
    const target = interactables.find((t) => teller.targetIds.includes(t.id));
    if (!target) return [];
    marked.add(target.id);
    const games = gamesOf.get(target.id);
    const detail = [teller.next ? `Chuyện: ${teller.next}` : 'Chuyện đã kể hết, chơi lại tùy thích', ...(games ? [`Trò chơi: ${games.join(' · ')}`] : [])].join(' · ');
    return [{ id: target.id, kind: 'story', ...at(target), colour: MARKER_COLOURS.story, label: target.name, detail, goal: { targetId: target.id } }];
  });
  const side = givers.flatMap((giver): MinimapMarker[] => {
    const target = interactables.find((t) => t.id === giver.targetId);
    if (!target || marked.has(target.id)) return [];
    return [{ id: target.id, kind: 'side', ...at(target), colour: MARKER_COLOURS.side, label: target.name, detail: `Trò chơi: ${giver.games.join(' · ')}`, goal: { targetId: target.id } }];
  });
  return [...story, ...side];
}

/** The quest's place now (the target the quest card points at). */
export function questMarker(quest: { id: string; label: string; x: number; z: number }): MinimapMarker {
  return { id: quest.id, kind: 'quest', x: quest.x, z: quest.z, colour: MARKER_COLOURS.quest, label: quest.label, detail: 'Nơi làm nhiệm vụ', goal: { targetId: quest.id } };
}

export interface LegendGroup {
  kind: PlaceKind;
  label: string;
  colour: string;
  count: number;
}

/** The legend: a chip for each group the map has, with how many it holds. */
export function legendGroups(markers: readonly MinimapMarker[]): LegendGroup[] {
  return MARKER_GROUPS.flatMap(({ kind, label }) => {
    const count = markers.filter((m) => m.kind === kind).length;
    return count ? [{ kind, label, colour: kind === 'gate' ? GATE_COLOUR : MARKER_COLOURS[kind], count }] : [];
  });
}

/** A square window on the world (centre, half side in blocks) drawn onto a square of `size` pixels, north up. */
export interface MinimapView {
  x: number;
  z: number;
  half: number;
  size: number;
}

/** Pixel position of a world point in a view (x to the right, north, -z, up). */
export function toMinimap(view: MinimapView, x: number, z: number): [number, number] {
  const k = view.size / (2 * view.half);
  return [(x - view.x + view.half) * k, (z - view.z + view.half) * k];
}

/** Whether a point is on the disc of a round view (inside its circle, a margin in from the edge). */
export function onDisc(view: MinimapView, x: number, z: number, margin = 0): boolean {
  const [px, py] = toMinimap(view, x, z);
  return Math.hypot(px - view.size / 2, py - view.size / 2) <= view.size / 2 - margin;
}

/** The child's heading (player-controller.ts `facing`: 0 walks toward +z) as a canvas angle (0 points right). */
export function headingAngle(facing: number): number {
  return Math.atan2(Math.cos(facing), Math.sin(facing));
}

/**
 * The map from above as RGBA pixels, one per horizon cell: each cell's top block in its colour, lighter
 * where it stands higher (roofs, hilltops) and darker where it is low (water's bed), transparent where empty.
 */
export function minimapPixels(horizon: { cells: readonly [number, number]; heights: Uint8Array; tops: Uint8Array }, colourOf: (id: number) => readonly [number, number, number] | undefined, ground: number): Uint8ClampedArray<ArrayBuffer> {
  const [w, h] = horizon.cells;
  const out = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  for (let i = 0; i < w * h; i++) {
    const colour = colourOf(horizon.tops[i] ?? 0);
    if (!colour) continue;
    const lift = Math.max(-0.25, Math.min(0.3, ((horizon.heights[i] ?? 0) - ground) * 0.035));
    for (let c = 0; c < 3; c++) {
      const v = colour[c] ?? 0;
      out[i * 4 + c] = lift >= 0 ? v + (255 - v) * lift : v * (1 + lift);
    }
    out[i * 4 + 3] = 255;
  }
  return out;
}

/** The ground height most cells stand at (the map's level), to shade the rest against. */
export function commonHeight(heights: Uint8Array): number {
  const counts = new Map<number, number>();
  for (const h of heights) if (h > 0) counts.set(h, (counts.get(h) ?? 0) + 1);
  let best = 0;
  let most = -1;
  for (const [h, n] of counts) if (n > most) [best, most] = [h, n];
  return best;
}
