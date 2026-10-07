// A companion bot's own map of the world, built only from what it met while walking: the places it noticed (a place
// is added the first time it comes into sight), the ways it walked between two of them in one go (each kept as a
// short polyline of columns it stood on, with how long the walk took), the shortcuts it found when walking a way
// again, and which coarse squares of the map it has set foot in. How far one place is from another is the cheapest
// chain of known ways (Dijkstra); without one it is a guess from the straight distance, dearer than a known way.
// Bounded: at most MAX_PLACES places, MAX_LINKS ways and MAX_POINTS polyline points (a few tens of KB), plain data
// that can be written out as it is.
import { canStep } from '@miu/voxel/traversal';
import { WALK_LEVELS, type WalkPlace } from '@miu/voxel/walk-cells';
import { lineColumns } from './local-path';
import { walksAlong } from './stepper';
import { clearOf, feetOf, type Spot, type WalkMap } from './walk-store';

export const MAX_PLACES = 200;
export const MAX_LINKS = 600;
export const MAX_POINTS = 6_000;
/** Points one way keeps at most (its first and last included). */
export const LINK_POINTS = 32;
/** Side of the coarse squares (blocks) whose visits it remembers: a 800 × 800 map is 50 × 50 of them. */
export const AREA_SIDE = 16;
/** A way's time is a moving average: each walk counts this much. */
const COST_ALPHA = 0.3;
/** A new walk of a known way at most this long (against the way kept) replaces it: a shortcut. */
export const SHORTCUT_RATIO = 0.9;
/** Without a known way, a trip is guessed this much longer than the straight line (it has to find its way). */
export const UNKNOWN_WAY = 1.6;
/** A straight piece of a way spans at most this many columns (any piece is then within every bot's sight). */
const PIECE_MAX = 12;

export interface PlaceMemory {
  readonly id: string;
  readonly kind: WalkPlace['kind'];
  readonly at: readonly [number, number, number];
  /** When it first saw the place (ms, its clock). */
  readonly firstSeenAt: number;
  visits: number;
  /** What going there has been worth (learner.ts). */
  q: number;
  lastReward: number;
}

export interface LinkMemory {
  readonly a: string;
  readonly b: string;
  /** Columns it stood on, x, feet, z per point, from near `a` to near `b`; each straight piece walkable as it is. */
  points: Int16Array;
  /** Length along the points (blocks). */
  length: number;
  /** How long walking it takes (s, moving average; a way only seen, never walked, is a guess). */
  cost: number;
  walks: number;
  found: 'walked' | 'shortcut';
  /** How long its first and its third walk took (s): what learning the way did. */
  firstS: number | null;
  thirdS: number | null;
}

/** A plain copy of a memory, for writing out and for measuring its size. */
export interface MemoryData {
  places: Array<Omit<PlaceMemory, 'at'> & { at: number[] }>;
  links: Array<Omit<LinkMemory, 'points'> & { points: number[] }>;
  areas: number[];
  areaSide: [number, number];
  shortcuts: number;
  seenWays: number;
}

/** What recording a walk did. */
export type WalkRecord = 'new' | 'walked' | 'shortcut' | 'rejected';

const linkKey = (a: string, b: string): string => `${a}>${b}`;

/** Length of a polyline of x, y, z points (horizontal blocks). */
function polylineLength(points: Int16Array): number {
  let sum = 0;
  for (let i = 3; i < points.length; i += 3) sum += Math.hypot((points[i] ?? 0) - (points[i - 3] ?? 0), (points[i + 2] ?? 0) - (points[i - 1] ?? 0));
  return sum;
}

/**
 * Whether walking straight from spot a's centre to spot b's crosses only columns with a spot each one steps onto
 * from the one before (traversal.ts `canStep`), ending at b's height.
 */
export function walksStraight(map: WalkMap, a: Spot, b: Spot): boolean {
  const start = map.standAt(a.x, a.y, a.z);
  if (start === 0 || map.standAt(b.x, b.y, b.z) === 0) return false;
  let feet = a.y;
  let clear = clearOf(start);
  const columns = lineColumns(a.x + 0.5, a.z + 0.5, b.x + 0.5, b.z + 0.5);
  for (let i = 1; i < columns.length; i++) {
    const [x, z] = columns[i] ?? [0, 0];
    let bestFeet = -1;
    let bestClear = 0;
    for (let level = 0; level < WALK_LEVELS; level++) {
      const spot = map.spot(x, z, level);
      if (spot === 0) break;
      const f = feetOf(spot);
      if (!canStep(feet, clear, f, clearOf(spot))) continue;
      if (bestFeet < 0 || Math.abs(f - feet) < Math.abs(bestFeet - feet)) {
        bestFeet = f;
        bestClear = clearOf(spot);
      }
    }
    if (bestFeet < 0) return false;
    feet = bestFeet;
    clear = bestClear;
  }
  return feet === b.y;
}

/** A walked run of columns as few points as straight walkable pieces allow, at most LINK_POINTS. */
export function simplify(map: WalkMap, cells: readonly Spot[]): Int16Array {
  const kept: Spot[] = [];
  let i = 0;
  while (i < cells.length) {
    const from = cells[i];
    if (!from) break;
    kept.push(from);
    if (i === cells.length - 1) break;
    let next = i + 1;
    for (let j = Math.min(cells.length - 1, i + PIECE_MAX); j > i + 1; j--) {
      const to = cells[j];
      if (to && walksStraight(map, from, to)) {
        next = j;
        break;
      }
    }
    i = next;
  }
  // Still too many: every other point inside goes (the pieces then follow the walk less closely).
  let points = kept;
  while (points.length > LINK_POINTS) points = points.filter((_, k) => k === 0 || k === points.length - 1 || k % 2 === 0);
  const out = new Int16Array(points.length * 3);
  points.forEach((p, k) => out.set([p.x, p.y, p.z], k * 3));
  return out;
}

/** The points of a polyline as spots. */
export function pointsOf(points: Int16Array): Spot[] {
  const out: Spot[] = [];
  for (let i = 0; i + 2 < points.length; i += 3) out.push({ x: points[i] ?? 0, y: points[i + 1] ?? 0, z: points[i + 2] ?? 0 });
  return out;
}

/** A cost to a place and the way that got there, from a Dijkstra over the known ways. */
export interface Reach {
  readonly cost: number;
  /** The way taken into this place (null: a start). */
  readonly link: LinkMemory | null;
}

export class MemoryGraph {
  readonly places = new Map<string, PlaceMemory>();
  readonly links = new Map<string, LinkMemory>();
  /** Ways leaving each place. */
  private readonly out = new Map<string, LinkMemory[]>();
  private readonly areaBits: Uint8Array;
  readonly areaSide: readonly [number, number];
  private pointCount = 0;
  areasVisited = 0;
  /** Walks that replaced a way it knew by one at least 10% shorter, and direct ways made to places it saw. */
  shortcuts = 0;
  seenWays = 0;
  /** Places it must not forget when space runs out (its home's, the one its quest needs). */
  private readonly keep: (id: string) => boolean;

  constructor(mapSize: { sx: number; sz: number }, keep: (id: string) => boolean = () => false) {
    this.areaSide = [Math.ceil(mapSize.sx / AREA_SIDE), Math.ceil(mapSize.sz / AREA_SIDE)];
    this.areaBits = new Uint8Array(Math.ceil((this.areaSide[0] * this.areaSide[1]) / 8));
    this.keep = keep;
  }

  get points(): number {
    return this.pointCount;
  }

  /** The coarse square of column (x, z), or -1 off the map. */
  areaOf(x: number, z: number): number {
    const ax = Math.floor(x / AREA_SIDE);
    const az = Math.floor(z / AREA_SIDE);
    if (ax < 0 || az < 0 || ax >= this.areaSide[0] || az >= this.areaSide[1]) return -1;
    return ax + az * this.areaSide[0];
  }

  visited(area: number): boolean {
    return area >= 0 && ((this.areaBits[area >> 3] ?? 0) & (1 << (area & 7))) !== 0;
  }

  /** Marks the square of (x, z) as walked; true when it is new. */
  visitArea(x: number, z: number): boolean {
    const area = this.areaOf(x, z);
    if (area < 0 || this.visited(area)) return false;
    this.areaBits[area >> 3] = (this.areaBits[area >> 3] ?? 0) | (1 << (area & 7));
    this.areasVisited += 1;
    return true;
  }

  /**
   * Notices a place it sees; true when it is new to it. Its memory full, it takes note only of a place that matters
   * now (`important`: its quest needs it), forgetting another for it, so it does not forget and find again in turn.
   */
  see(place: WalkPlace, now: number, important = false): boolean {
    if (this.places.has(place.id)) return false;
    if (this.places.size >= MAX_PLACES && (!important || !this.forgetOne())) return false;
    this.places.set(place.id, { id: place.id, kind: place.kind, at: [place.at[0], place.at[1], place.at[2]], firstSeenAt: now, visits: 0, q: 0, lastReward: 0 });
    return true;
  }

  /** Forgets the place least worth keeping (fewest visits, then lowest value) and its ways; false if none may go. */
  private forgetOne(): boolean {
    let worst: PlaceMemory | null = null;
    for (const place of this.places.values()) {
      if (this.keep(place.id)) continue;
      if (!worst || place.visits < worst.visits || (place.visits === worst.visits && place.q < worst.q)) worst = place;
    }
    if (!worst) return false;
    this.places.delete(worst.id);
    for (const link of [...this.links.values()]) if (link.a === worst.id || link.b === worst.id) this.dropLink(link);
    return true;
  }

  link(a: string, b: string): LinkMemory | undefined {
    return this.links.get(linkKey(a, b));
  }

  /** Ways leaving `a`. */
  linksFrom(a: string): readonly LinkMemory[] {
    return this.out.get(a) ?? [];
  }

  private dropLink(link: LinkMemory): void {
    this.links.delete(linkKey(link.a, link.b));
    const from = this.out.get(link.a);
    if (from) {
      const i = from.indexOf(link);
      if (i >= 0) from.splice(i, 1);
    }
    this.pointCount -= link.points.length / 3;
  }

  private addLink(link: LinkMemory): boolean {
    if (this.links.size >= MAX_LINKS) {
      // Space for a new way: the least walked one goes.
      let worst: LinkMemory | null = null;
      for (const l of this.links.values()) if (!worst || l.walks < worst.walks || (l.walks === worst.walks && l.cost > worst.cost)) worst = l;
      if (!worst) return false;
      this.dropLink(worst);
    }
    this.links.set(linkKey(link.a, link.b), link);
    const from = this.out.get(link.a);
    if (from) from.push(link);
    else this.out.set(link.a, [link]);
    this.pointCount += link.points.length / 3;
    this.fitPoints();
    return true;
  }

  private setPoints(link: LinkMemory, points: Int16Array): void {
    this.pointCount += (points.length - link.points.length) / 3;
    link.points = points;
    link.length = polylineLength(points);
    this.fitPoints();
  }

  /** Over MAX_POINTS: the longest polylines are thinned until it fits. */
  private fitPoints(): void {
    while (this.pointCount > MAX_POINTS) {
      let longest: LinkMemory | null = null;
      for (const l of this.links.values()) if (!longest || l.points.length > longest.points.length) longest = l;
      if (!longest || longest.points.length <= 6) return;
      const kept = pointsOf(longest.points).filter((_, k, all) => k === 0 || k === all.length - 1 || k % 2 === 0);
      const thinned = new Int16Array(kept.length * 3);
      kept.forEach((p, k) => thinned.set([p.x, p.y, p.z], k * 3));
      this.pointCount += (thinned.length - longest.points.length) / 3;
      longest.points = thinned;
    }
  }

  /**
   * It walked from place `a` to place `b` in one go over `cells` (every column it stood on, a step each from the one
   * before) in `seconds`. A new way is kept; a known one gets its time averaged in, and its polyline replaced when
   * this walk was clearly shorter (a shortcut).
   */
  recordWalk(map: WalkMap, a: string, b: string, cells: readonly Spot[], seconds: number): WalkRecord {
    if (a === b || cells.length < 2 || !this.places.has(a) || !this.places.has(b) || !walksAlong(map, cells)) return 'rejected';
    const points = simplify(map, cells);
    const known = this.link(a, b);
    if (!known) {
      const link: LinkMemory = { a, b, points, length: polylineLength(points), cost: seconds, walks: 1, found: 'walked', firstS: seconds, thirdS: null };
      return this.addLink(link) ? 'new' : 'rejected';
    }
    known.walks += 1;
    known.cost = known.walks === 1 ? seconds : known.cost + COST_ALPHA * (seconds - known.cost);
    if (known.walks === 1) known.firstS = seconds;
    if (known.walks === 3) known.thirdS = seconds;
    if (polylineLength(points) <= SHORTCUT_RATIO * known.length) {
      this.setPoints(known, points);
      this.shortcuts += 1;
      known.found = 'shortcut';
      return 'shortcut';
    }
    return 'walked';
  }

  /**
   * From place `a` it saw place `b` and found a way there over what it sees (`cells`, from a plan) where it knew
   * none: a direct way, its time guessed from its pace until it walks it.
   */
  recordSeenWay(map: WalkMap, a: string, b: string, cells: readonly Spot[], speed: number): boolean {
    if (a === b || this.link(a, b) || cells.length < 2 || !this.places.has(a) || !this.places.has(b) || !walksAlong(map, cells)) return false;
    const points = simplify(map, cells);
    const length = polylineLength(points);
    if (!this.addLink({ a, b, points, length, cost: length / speed, walks: 0, found: 'shortcut', firstS: null, thirdS: null })) return false;
    this.seenWays += 1;
    return true;
  }

  /**
   * Cheapest known way costs from `starts` (places with the cost of getting to each first) to every place reachable
   * over known ways (Dijkstra; ≤ 200 places, ≤ 600 ways).
   */
  reach(starts: ReadonlyArray<{ id: string; cost: number }>): Map<string, Reach> {
    const best = new Map<string, Reach>();
    const done = new Set<string>();
    const heap: Array<{ id: string; cost: number }> = [];
    const push = (id: string, cost: number): void => {
      heap.push({ id, cost });
      let i = heap.length - 1;
      while (i > 0) {
        const up = (i - 1) >> 1;
        const parent = heap[up];
        const item = heap[i];
        if (!parent || !item || parent.cost <= item.cost) break;
        heap[up] = item;
        heap[i] = parent;
        i = up;
      }
    };
    const pop = (): { id: string; cost: number } | undefined => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length > 0 && last) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let c = i;
          if ((heap[l]?.cost ?? Infinity) < (heap[c]?.cost ?? Infinity)) c = l;
          if ((heap[r]?.cost ?? Infinity) < (heap[c]?.cost ?? Infinity)) c = r;
          if (c === i) break;
          const a = heap[i];
          const b = heap[c];
          if (!a || !b) break;
          heap[i] = b;
          heap[c] = a;
          i = c;
        }
      }
      return top;
    };
    for (const start of starts) {
      if (!this.places.has(start.id)) continue;
      const known = best.get(start.id);
      if (known && known.cost <= start.cost) continue;
      best.set(start.id, { cost: start.cost, link: null });
      push(start.id, start.cost);
    }
    for (let item = pop(); item; item = pop()) {
      if (done.has(item.id)) continue;
      done.add(item.id);
      for (const link of this.linksFrom(item.id)) {
        const cost = item.cost + link.cost;
        const known = best.get(link.b);
        if (known && known.cost <= cost) continue;
        best.set(link.b, { cost, link });
        push(link.b, cost);
      }
    }
    return best;
  }

  /** The ways in order from a start to `to`, out of a `reach` result (empty: `to` is a start, or unreached). */
  route(reached: ReadonlyMap<string, Reach>, to: string): LinkMemory[] {
    const out: LinkMemory[] = [];
    for (let at = reached.get(to); at?.link; at = reached.get(at.link.a)) {
      out.push(at.link);
      if (out.length > MAX_LINKS) break;
    }
    return out.reverse();
  }

  /**
   * The size of what it knows, packed (the budget of ≤ 64 KB a bot is measured with): a place's id, position and
   * numbers ≈ 48 bytes, a way's ends and numbers ≈ 32 bytes and 6 a point, the squares one bit each.
   */
  get bytes(): number {
    return this.places.size * 48 + this.links.size * 32 + this.pointCount * 6 + this.areaBits.byteLength;
  }

  /** A plain copy (typed arrays as numbers), as it would be written out. */
  data(): MemoryData {
    return {
      places: [...this.places.values()].map((p) => ({ ...p, at: [...p.at] })),
      links: [...this.links.values()].map((l) => ({ ...l, points: Array.from(l.points) })),
      areas: Array.from(this.areaBits),
      areaSide: [this.areaSide[0], this.areaSide[1]],
      shortcuts: this.shortcuts,
      seenWays: this.seenWays,
    };
  }
}
