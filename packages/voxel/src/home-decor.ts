// The child's home in the styles she picked (content/home/decor.json): what the map generator wrote for every
// style of every slot (world-entities.ts `decorAnchors`, `decorModels`, `decorBlocks`) turned into the props
// the game places and the block colours it paints, without building the map again. A slot left at its
// default (or a pick the map has no style for) keeps the props the map was built with.
import type { WorldEntities } from './world-entities';

/** Slot id → picked option id. */
export type DecorPicks = Readonly<Record<string, string>>;

type Prop = WorldEntities['props'][number];

/** A block colour to paint: `from` becomes `to` inside each box (x0, y0, z0, x1, y1, z1, inclusive). */
export interface Recolour {
  from: number;
  to: number;
  boxes: ReadonlyArray<readonly [number, number, number, number, number, number]>;
}

/** The props a picked style stands at its slot's spots (empty when the map has no such style). */
function styleProps(entities: WorldEntities, slot: string, option: string): Prop[] {
  const models = (entities.decorModels ?? []).filter((m) => m.slot === slot && m.option === option);
  if (models.length === 0) return [];
  const anchors = (entities.decorAnchors ?? []).filter((a) => a.slot === slot);
  return anchors.map((anchor, i) => {
    const m = models[i % models.length] ?? models[0];
    if (!m) throw new Error(`decor ${slot}/${option}: no model`);
    const yaw = anchor.yaw + m.turn;
    const t = (yaw * Math.PI) / 180;
    const [ox, oz] = m.offset;
    const [x, y, z] = anchor.position;
    // `+ 0` keeps -0 out, as the generator writes its props.
    return { model: m.model, position: [x + ox * Math.cos(t) + oz * Math.sin(t), y, z - ox * Math.sin(t) + oz * Math.cos(t)], yaw: yaw + 0, scale: m.scale, slot };
  });
}

/** Whether the map has a style `option` for `slot` other than the one it was built with. */
function restyled(entities: WorldEntities, slot: string, option: string | undefined): option is string {
  return option !== undefined && ((entities.decorModels ?? []).some((m) => m.slot === slot && m.option === option) || (entities.decorBlocks ?? []).some((b) => b.slot === slot && b.option === option));
}

/** The map's props with each picked style in place of its slot's default pieces. */
export function decoratedProps(entities: WorldEntities, picks: DecorPicks): Prop[] {
  const slots = new Set((entities.decorAnchors ?? []).map((a) => a.slot));
  const swapped = [...slots].filter((slot) => restyled(entities, slot, picks[slot]) && (entities.decorModels ?? []).some((m) => m.slot === slot));
  const kept = entities.props.filter((p) => p.slot === undefined || !swapped.includes(p.slot));
  return [...kept, ...swapped.flatMap((slot) => styleProps(entities, slot, picks[slot] ?? ''))];
}

/** The block colours the picks paint (none for a slot at its default). */
export function decorRecolours(entities: WorldEntities, picks: DecorPicks): Recolour[] {
  return (entities.decorBlocks ?? []).filter((b) => picks[b.slot] === b.option).map(({ from, to, boxes }) => ({ from, to, boxes }));
}

/** The map as the child's picks make it: the props replaced; `recolours` for the blocks the world loads. */
export function decorated(entities: WorldEntities, picks: DecorPicks): { entities: WorldEntities; recolours: Recolour[] } {
  if (!entities.decorAnchors && !entities.decorBlocks) return { entities, recolours: [] };
  return { entities: { ...entities, props: decoratedProps(entities, picks) }, recolours: decorRecolours(entities, picks) };
}

/**
 * Every style of every slot at once (the defaults and all the others): what the map's checks walk round, so
 * no pick can block a doorway or fill a room more than the checks allow.
 */
export function everyDecorProp(entities: WorldEntities): Prop[] {
  const options = new Map<string, Set<string>>();
  for (const m of entities.decorModels ?? []) options.set(m.slot, (options.get(m.slot) ?? new Set()).add(m.option));
  return [...entities.props, ...[...options].flatMap(([slot, set]) => [...set].flatMap((option) => styleProps(entities, slot, option)))];
}

/**
 * Paints a loaded block area (its corner at `origin`, `size` blocks) with the recolours that reach into it.
 * Every cell is read as the map built it before any is painted, so one style's colour is never painted over
 * again by another part's (a roof turned to the ridge's wood stays roof). Returns the cells painted.
 */
export function recolourArea(
  area: { get(x: number, y: number, z: number): number; set(x: number, y: number, z: number, id: number): void },
  origin: readonly [number, number, number],
  size: readonly [number, number, number],
  recolours: readonly Recolour[],
): number {
  const paint = new Map<string, { at: readonly [number, number, number]; to: number }>();
  for (const { from, to, boxes } of recolours) {
    for (const [x0, y0, z0, x1, y1, z1] of boxes) {
      const lo = [Math.max(x0, origin[0]), Math.max(y0, origin[1]), Math.max(z0, origin[2])] as const;
      const hi = [Math.min(x1, origin[0] + size[0] - 1), Math.min(y1, origin[1] + size[1] - 1), Math.min(z1, origin[2] + size[2] - 1)] as const;
      for (let x = lo[0]; x <= hi[0]; x++) {
        for (let y = lo[1]; y <= hi[1]; y++) {
          for (let z = lo[2]; z <= hi[2]; z++) {
            const at = [x - origin[0], y - origin[1], z - origin[2]] as const;
            if (area.get(at[0], at[1], at[2]) === from) paint.set(at.join(','), { at, to });
          }
        }
      }
    }
  }
  for (const { at, to } of paint.values()) area.set(at[0], at[1], at[2], to);
  return paint.size;
}

/**
 * Paints the coarse horizon (region-format.ts: the top block of each cell of columns) as the picks paint the
 * blocks, so the house far off and on the minimap wears the picked colours too.
 */
export function recolourHorizon(horizon: { cell: number; cells: readonly [number, number]; heights: Uint8Array; tops: Uint8Array }, recolours: readonly Recolour[]): void {
  const [cx, cz] = horizon.cells;
  const paint: Array<[number, number]> = [];
  for (const { from, to, boxes } of recolours) {
    for (const [x0, y0, z0, x1, y1, z1] of boxes) {
      for (let j = Math.max(0, Math.floor(z0 / horizon.cell)); j <= Math.min(cz - 1, Math.floor(z1 / horizon.cell)); j++) {
        for (let i = Math.max(0, Math.floor(x0 / horizon.cell)); i <= Math.min(cx - 1, Math.floor(x1 / horizon.cell)); i++) {
          const k = i + cx * j;
          const top = (horizon.heights[k] ?? 0) - 1;
          if (horizon.tops[k] === from && top >= y0 && top <= y1) paint.push([k, to]);
        }
      }
    }
  }
  for (const [k, to] of paint) horizon.tops[k] = to;
}
