// What the minimap shows (owner's mock, panel 14), worked out once per map from its data so the drawing
// stays a few canvas calls: the map from above (the top block of each horizon cell, shaded by height), the
// gates in their portal colours named by where they lead, the child's home on her own map, and the legend
// that names them. Pure: no DOM, no three.js.
import { PORTAL_COLOURS, portalColourOf } from '@miu/voxel/portal-colours';
import type { WorldEntities } from '@miu/voxel/world-entities';

export type MarkerKind = 'gate' | 'home' | 'quest' | 'player';

export interface MinimapMarker {
  kind: MarkerKind;
  x: number;
  z: number;
  /** Its colour on the map and in the legend. */
  colour: string;
  label: string;
}

/** Colours of the markers that are not a portal's. */
export const MARKER_COLOURS: Readonly<Record<Exclude<MarkerKind, 'gate'>, string>> = {
  home: '#f45d4c',
  quest: '#ffc93c',
  player: '#2f6ff0',
};
/** A gate with no portal of its own colour standing in it. */
const GATE_COLOUR = '#8c3ff5';
/** How near a portal's tunnel must stand to a gate to give it its colour (blocks). */
const PORTAL_REACH = 5;

/**
 * The map's fixed markers: every gate (in the colour of the portal it stands in, named by the region it leads
 * to) and, on the child's home map, the home itself at the map's first landmark (its zone's middle).
 */
export function minimapMarkers(entities: Pick<WorldEntities, 'interactables' | 'props' | 'landmarks'>, options: { regionName: (id: string) => string | undefined; homeName?: string }): MinimapMarker[] {
  const portals = entities.props.flatMap((p) => {
    const colour = portalColourOf(p.model);
    return colour ? [{ x: p.position[0], z: p.position[2], colour: PORTAL_COLOURS[colour][0] }] : [];
  });
  const gates = entities.interactables
    .filter((t) => t.kind === 'gate' && t.travel)
    .map((t): MinimapMarker => {
      const [x, , z] = t.position;
      const portal = portals.filter((p) => Math.hypot(p.x - x, p.z - z) <= PORTAL_REACH).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
      return { kind: 'gate', x, z, colour: portal?.colour ?? GATE_COLOUR, label: options.regionName(t.travel ?? '') ?? t.name };
    });
  const first = entities.landmarks[0];
  const home: MinimapMarker[] = options.homeName && first ? [{ kind: 'home', x: first.position[0], z: first.position[2], colour: MARKER_COLOURS.home, label: options.homeName }] : [];
  return [...home, ...gates];
}

export interface LegendEntry {
  kind: MarkerKind;
  colour: string;
  label: string;
}

/** The legend: the child, the quest's place when there is one, her home, then each gate's place (each once). */
export function minimapLegend(markers: readonly MinimapMarker[], quest: boolean): LegendEntry[] {
  const out: LegendEntry[] = [{ kind: 'player', colour: MARKER_COLOURS.player, label: 'Bạn đang ở đây' }];
  if (quest) out.push({ kind: 'quest', colour: MARKER_COLOURS.quest, label: 'Nơi làm nhiệm vụ' });
  const seen = new Set<string>();
  for (const m of markers) {
    if (seen.has(m.label)) continue;
    seen.add(m.label);
    out.push({ kind: m.kind, colour: m.colour, label: m.kind === 'gate' ? `Cổng sang ${m.label}` : m.label });
  }
  return out;
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
