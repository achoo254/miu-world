// What a companion bot learnt on a map, in the compact form kept in the database between server runs (table
// `bot_world_memories`). In memory a full memory takes some 145–250 KB of heap and ~135 KB as plain JSON; stored, at
// most MEMORY_BYTES_MAX (~16 KB measured for a full one). Lists are kept column by column (no key repeated per
// item), numbers rounded to what matters, times as whole seconds after one base time, a way's polyline as its first
// point and then the steps from one point to the next (zigzag varints, all the ways in one base64 string), the
// squares walked as their bitset in base64; that JSON is then deflated (~34 KB of it for a full memory is ~12 KB)
// and stored as base64. Too large still, it is cut down as a full memory is (memory-graph.ts): the longest ways
// thinned first, then the least walked ways let go of, then the least visited places. Reading checks everything
// (Zod and the counts that must agree) and throws on anything broken: the bot then starts afresh, nothing of it is
// trusted. Nothing of a player is in it: places, ways, values and counts only.
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { z } from 'zod';
import type { BrainSnapshot, HourMark, Trip } from './brain';
import { LINK_POINTS, type SavedGraph, type SavedLink, type SavedPlace } from './memory-graph';

/** Bytes a bot's memory of one map takes stored at most (as compact JSON; the table refuses more than twice that). */
export const MEMORY_BYTES_MAX = 32 * 1024;
const FORMAT = 1;

const int = z.number().int();
const count = z.number().int().nonnegative();
const num = z.number().finite();
const base64 = z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/);
/** A place's id as the walk grids have them. */
const placeId = z.string().min(1).max(160);

const counters = z
  .object({
    tripsTotal: count,
    stuck: count,
    stuckSeconds: num.nonnegative(),
    resets: count,
    skipped: count,
    questsDone: count,
    stepsDone: count,
    meets: count,
    rewardThisHour: num,
    rewardPerHour: num,
  })
  .strict();

const columnsSchema = z
  .object({
    /** The base time (s): every time below is whole seconds after it. */
    t: int,
    p: z.object({ id: z.array(placeId), seen: z.array(count), n: z.array(count), q: z.array(num), r: z.array(num) }).strict(),
    l: z
      .object({
        /** Its ends, as indexes into `p.id`. */
        a: z.array(count),
        b: z.array(count),
        cost: z.array(num.nonnegative()),
        len: z.array(num.nonnegative()),
        w: z.array(count),
        /** One letter a way: `w` walked, `s` a shortcut. */
        f: z.string().regex(/^[ws]*$/),
        s1: z.array(num.nonnegative().nullable()),
        s3: z.array(num.nonnegative().nullable()),
        /** Points of each way. */
        n: z.array(z.number().int().min(2).max(LINK_POINTS)),
        pts: base64,
      })
      .strict(),
    areas: base64,
    sc: count,
    sw: count,
    /** Explore, meet, rest, ride. */
    b: z.tuple([num, num, num, num]),
    d: num.positive(),
    m: counters,
    trips: z.object({ to: z.array(placeId), first: z.string().regex(/^[01]*$/), s: z.array(num.nonnegative()), straight: z.array(num.nonnegative()), from: z.array(count), at: z.array(count) }).strict(),
    /** Each hour's mark: hour, at, places, ways, shortcuts, squares, efficiency, stuck seconds, skipped, reward. */
    h: z.array(z.tuple([count, count, count, count, count, count, num.nonnegative(), num.nonnegative(), count, num])),
  })
  .strict();

type Columns = z.infer<typeof columnsSchema>;

/** Inflated, the columns are at most this large (a broken or hostile row cannot make the server inflate more). */
const COLUMNS_BYTES_MAX = 1024 * 1024;

const storedSchema = z.object({ v: z.literal(FORMAT), z: base64.max(COLUMNS_BYTES_MAX) }).strict();

/** The stored form (what goes into the `memory` column): the format, and the columns deflated, in base64. */
export type StoredMemory = z.infer<typeof storedSchema>;

const round = (n: number, places: number): number => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/** Zigzag varints of whole numbers, appended to `out`. */
function putVarint(out: number[], n: number): void {
  let v = n >= 0 ? n * 2 : -n * 2 - 1;
  while (v >= 0x80) {
    out.push((v % 0x80) | 0x80);
    v = Math.floor(v / 0x80);
  }
  out.push(v);
}

/** Reads `count` zigzag varints from `bytes`; throws when they run out. */
function readVarints(bytes: Uint8Array, count: number): number[] {
  const out: number[] = [];
  let i = 0;
  while (out.length < count) {
    let v = 0;
    let scale = 1;
    for (;;) {
      if (i >= bytes.length) throw new RangeError('memory: the ways end too soon');
      const byte = bytes[i++] ?? 0;
      v += (byte & 0x7f) * scale;
      if (byte < 0x80) break;
      scale *= 0x80;
      if (scale > 2 ** 35) throw new RangeError('memory: a way has a number too large');
    }
    out.push(v % 2 === 0 ? v / 2 : -(v + 1) / 2);
  }
  if (i !== bytes.length) throw new RangeError('memory: the ways run on');
  return out;
}

const toBase64 = (bytes: ArrayLike<number>): string => Buffer.from(Uint8Array.from(bytes)).toString('base64');
const fromBase64 = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'base64'));

/** The stored form of a snapshot, as it is (no cutting down). */
function pack(snapshot: BrainSnapshot): StoredMemory {
  return { v: FORMAT, z: deflateRawSync(JSON.stringify(columnsOf(snapshot))).toString('base64') };
}

/** A snapshot's columns. */
function columnsOf(snapshot: BrainSnapshot): Columns {
  const { graph, bandits, metrics } = snapshot;
  const times = [...graph.places.map((p) => p.firstSeenAt), ...metrics.trips.flatMap((t) => [t.startedAt, t.at]), ...metrics.history.map((h) => h.at)];
  const t = times.length > 0 ? Math.round(Math.min(...times) / 1000) : 0;
  const secs = (ms: number): number => Math.max(0, Math.round(ms / 1000) - t);
  const index = new Map(graph.places.map((p, i) => [p.id, i]));
  const { links } = graph;
  if (links.some((l) => !index.has(l.a) || !index.has(l.b))) throw new RangeError('memory: a way ends at a place it does not know');
  const bytes: number[] = [];
  for (const link of links) {
    let [x, y, zz] = [0, 0, 0];
    for (let i = 0; i + 2 < link.points.length; i += 3) {
      const [px = 0, py = 0, pz = 0] = [link.points[i], link.points[i + 1], link.points[i + 2]];
      putVarint(bytes, px - x);
      putVarint(bytes, py - y);
      putVarint(bytes, pz - zz);
      [x, y, zz] = [px, py, pz];
    }
  }
  const { trips, history, ...rest } = metrics;
  return {
    t,
    p: {
      id: graph.places.map((p) => p.id),
      seen: graph.places.map((p) => secs(p.firstSeenAt)),
      n: graph.places.map((p) => p.visits),
      q: graph.places.map((p) => round(p.q, 4)),
      r: graph.places.map((p) => round(p.lastReward, 3)),
    },
    l: {
      a: links.map((l) => index.get(l.a) ?? 0),
      b: links.map((l) => index.get(l.b) ?? 0),
      cost: links.map((l) => round(l.cost, 1)),
      len: links.map((l) => round(l.length, 1)),
      w: links.map((l) => l.walks),
      f: links.map((l) => (l.found === 'shortcut' ? 's' : 'w')).join(''),
      s1: links.map((l) => (l.firstS === null ? null : round(l.firstS, 1))),
      s3: links.map((l) => (l.thirdS === null ? null : round(l.thirdS, 1))),
      n: links.map((l) => l.points.length / 3),
      pts: toBase64(bytes),
    },
    areas: toBase64(graph.areas),
    sc: graph.shortcuts,
    sw: graph.seenWays,
    b: [round(bandits.explore, 4), round(bandits.meet, 4), round(bandits.rest, 4), round(bandits.ride, 4)],
    d: round(snapshot.detour, 4),
    m: {
      ...rest,
      stuckSeconds: round(rest.stuckSeconds, 1),
      rewardThisHour: round(rest.rewardThisHour, 3),
      rewardPerHour: round(rest.rewardPerHour, 3),
    },
    trips: {
      to: trips.map((x) => x.target),
      first: trips.map((x) => (x.first ? '1' : '0')).join(''),
      s: trips.map((x) => round(x.seconds, 1)),
      straight: trips.map((x) => round(x.straight, 1)),
      from: trips.map((x) => secs(x.startedAt)),
      at: trips.map((x) => secs(x.at)),
    },
    h: history.map((m) => [m.hour, secs(m.at), m.placesKnown, m.linksKnown, m.shortcuts, m.areasVisited, round(m.efficiency, 3), round(m.stuckSeconds, 0), m.skipped, round(m.reward, 2)]),
  };
}

/** Bytes of the stored form as compact JSON. */
export const storedBytes = (stored: StoredMemory): number => Buffer.byteLength(JSON.stringify(stored));

/** Every other point inside a polyline goes (its first and last stay). */
function thinned(points: readonly number[]): number[] {
  const out: number[] = [];
  const n = points.length / 3;
  for (let k = 0; k < n; k++) if (k === 0 || k === n - 1 || k % 2 === 0) out.push(points[k * 3] ?? 0, points[k * 3 + 1] ?? 0, points[k * 3 + 2] ?? 0);
  return out;
}

/** Ways with more points than this are thinned before any way is let go of. */
const THIN_TO = 4;

/**
 * A smaller copy, cut as a full memory is (a tenth at a time): the longest ways thinned while any has more than
 * THIN_TO points, then the least walked ways let go of, then the least visited places (and their ways); null when
 * nothing is left to cut.
 */
function cutDown(snapshot: BrainSnapshot): BrainSnapshot | null {
  const { graph } = snapshot;
  const step = (n: number): number => Math.max(1, Math.ceil(n / 10));
  const long = graph.links.filter((l) => l.points.length / 3 > THIN_TO);
  if (long.length > 0) {
    const longest = new Set([...long].sort((a, b) => b.points.length - a.points.length).slice(0, step(long.length)));
    return { ...snapshot, graph: { ...graph, links: graph.links.map((l) => (longest.has(l) ? { ...l, points: thinned(l.points) } : l)) } };
  }
  if (graph.links.length > 0) {
    const least = new Set([...graph.links].sort((a, b) => a.walks - b.walks || b.cost - a.cost).slice(0, step(graph.links.length)));
    return { ...snapshot, graph: { ...graph, links: graph.links.filter((l) => !least.has(l)) } };
  }
  if (graph.places.length > 0) {
    const least = new Set([...graph.places].sort((a, b) => a.visits - b.visits || a.q - b.q).slice(0, step(graph.places.length)).map((p) => p.id));
    return { ...snapshot, graph: { ...graph, places: graph.places.filter((p) => !least.has(p.id)) } };
  }
  return null;
}

/** The stored form of what a bot learnt, cut down until it fits in `maxBytes`. */
export function encodeMemory(snapshot: BrainSnapshot, maxBytes = MEMORY_BYTES_MAX): StoredMemory {
  let current = snapshot;
  let stored = pack(current);
  while (storedBytes(stored) > maxBytes) {
    const smaller = cutDown(current);
    if (!smaller) break;
    current = smaller;
    stored = pack(current);
  }
  return stored;
}

/** What a bot learnt, read back from its stored form; throws on anything malformed or inconsistent. */
export function decodeMemory(raw: unknown): BrainSnapshot {
  const stored = storedSchema.parse(raw);
  const s = columnsSchema.parse(JSON.parse(inflateRawSync(Buffer.from(stored.z, 'base64'), { maxOutputLength: COLUMNS_BYTES_MAX }).toString('utf8')));
  const at = (secs: number): number => (s.t + secs) * 1000;
  const places = s.p.id.length;
  if (new Set(s.p.id).size !== places || [s.p.seen, s.p.n, s.p.q, s.p.r].some((list) => list.length !== places)) throw new RangeError('memory: the places do not agree');
  const nLinks = s.l.a.length;
  if ([s.l.b, s.l.cost, s.l.len, s.l.w, s.l.s1, s.l.s3, s.l.n].some((list) => list.length !== nLinks) || s.l.f.length !== nLinks) throw new RangeError('memory: the ways do not agree');
  const nTrips = s.trips.to.length;
  if ([s.trips.s, s.trips.straight, s.trips.from, s.trips.at].some((list) => list.length !== nTrips) || s.trips.first.length !== nTrips) throw new RangeError('memory: the trips do not agree');

  const placeList: SavedPlace[] = s.p.id.map((id, i) => ({ id, firstSeenAt: at(s.p.seen[i] ?? 0), visits: s.p.n[i] ?? 0, q: s.p.q[i] ?? 0, lastReward: s.p.r[i] ?? 0 }));
  const values = readVarints(fromBase64(s.l.pts), s.l.n.reduce((sum, n) => sum + n * 3, 0));
  let offset = 0;
  const links: SavedLink[] = [];
  for (let i = 0; i < nLinks; i++) {
    const a = s.p.id[s.l.a[i] ?? -1];
    const b = s.p.id[s.l.b[i] ?? -1];
    if (a === undefined || b === undefined || a === b) throw new RangeError('memory: a way ends at a place it does not know');
    const points: number[] = [];
    let [x, y, zz] = [0, 0, 0];
    for (let k = 0; k < (s.l.n[i] ?? 0); k++) {
      x += values[offset++] ?? 0;
      y += values[offset++] ?? 0;
      zz += values[offset++] ?? 0;
      if (Math.max(Math.abs(x), Math.abs(y), Math.abs(zz)) > 32_767) throw new RangeError('memory: a way leaves the map');
      points.push(x, y, zz);
    }
    links.push({
      a,
      b,
      points,
      length: s.l.len[i] ?? 0,
      cost: s.l.cost[i] ?? 0,
      walks: s.l.w[i] ?? 0,
      found: s.l.f[i] === 's' ? 'shortcut' : 'walked',
      firstS: s.l.s1[i] ?? null,
      thirdS: s.l.s3[i] ?? null,
    });
  }
  const graph: SavedGraph = { places: placeList, links, areas: Array.from(fromBase64(s.areas)), shortcuts: s.sc, seenWays: s.sw };
  const trips: Trip[] = s.trips.to.map((target, i) => ({
    target,
    first: s.trips.first[i] === '1',
    seconds: s.trips.s[i] ?? 0,
    straight: s.trips.straight[i] ?? 0,
    startedAt: at(s.trips.from[i] ?? 0),
    at: at(s.trips.at[i] ?? 0),
  }));
  const history: HourMark[] = s.h.map(([hour, secs, placesKnown, linksKnown, shortcuts, areasVisited, efficiency, stuckSeconds, skipped, reward]) => ({
    hour,
    at: at(secs),
    placesKnown,
    linksKnown,
    shortcuts,
    areasVisited,
    efficiency,
    stuckSeconds,
    skipped,
    reward,
  }));
  const [explore, meet, rest, ride] = s.b;
  return { graph, bandits: { explore, meet, rest, ride }, detour: s.d, metrics: { ...s.m, trips, history } };
}
