import { describe, expect, it } from 'vitest';
import type { WalkPlace } from '@miu/voxel/walk-cells';
import type { BrainSnapshot, HourMark, Trip } from './brain';
import { MAX_PLACES, type SavedLink, type SavedPlace } from './memory-graph';
import { EMPTY_TALLY, mergeMemories, tallyOf } from './memory-merge';
import { WalkMap } from './walk-store';

/** An open yard of 64 × 64 columns (4 × 4 squares: two bytes of them) with `places`. */
const yardWith = (places: WalkPlace[]): WalkMap => new WalkMap('yard', [64, 64], () => [{ feet: 1, clear: 7, ground: 1, edge: false }], places);
const map = yardWith(Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, kind: 'landmark', at: [8 + i * 8 + 0.5, 1, 8.5] })));

const place = (id: string, visits: number, q: number, firstSeenAt = 0): SavedPlace => ({ id, firstSeenAt, visits, q, lastReward: 0 });
const link = (a: string, b: string, cost: number, walks: number): SavedLink => ({
  a,
  b,
  points: [8, 1, 8, 16, 1, 8],
  length: 8,
  cost,
  walks,
  found: 'walked',
  firstS: cost,
  thirdS: null,
});
const trip = (at: number): Trip => ({ target: 'p1', first: false, seconds: 10, straight: 20, startedAt: at - 10_000, at });
const mark = (hour: number, at: number): HourMark => ({ hour, at, placesKnown: 3, linksKnown: 1, shortcuts: 0, areasVisited: 2, efficiency: 0.5, stuckSeconds: 0, skipped: 0, reward: 1 });

function snapshot(parts: { places: SavedPlace[]; links?: SavedLink[]; areas?: number[]; count?: number; trips?: Trip[]; history?: HourMark[]; explore?: number }): BrainSnapshot {
  const n = parts.count ?? 0;
  return {
    graph: { places: parts.places, links: parts.links ?? [], areas: parts.areas ?? [0, 0], shortcuts: n, seenWays: n },
    bandits: { explore: parts.explore ?? 0, meet: 0.6, rest: -0.1, ride: 0.2 },
    detour: 1.6,
    metrics: { trips: parts.trips ?? [], tripsTotal: n, stuck: n, stuckSeconds: n, resets: n, skipped: n, questsDone: n, stepsDone: n, meets: n, rewardThisHour: 0, rewardPerHour: 0, history: parts.history ?? [] },
  };
}

describe('the memories of one bot in several homes, merged', () => {
  it('joins places, keeps the quicker way, averages values by visits and adds up only what each learnt since', () => {
    // Both instances started from what was stored then: p0 visited twice, a way p0 > p1 walked once.
    const base = snapshot({ places: [place('p0', 2, 1), place('p1', 0, 0)], links: [link('p0', 'p1', 30, 1)], count: 5, trips: [trip(1_000)], history: [mark(1, 3_600_000)] });
    // The other instance wrote first: p0 visited once more (valued 2 now), p2 found, the way walked again.
    const stored = snapshot({
      places: [place('p0', 3, 2), place('p1', 0, 0), place('p2', 1, 0.5)],
      links: [link('p0', 'p1', 28, 2)],
      areas: [1, 0],
      count: 7,
      trips: [trip(1_000), trip(5_000)],
      history: [mark(1, 3_600_000), mark(2, 7_200_000)],
      explore: 0.4,
    });
    // This one: p0 visited three more times (valued 0.5), p3 found, the same way walked twice more and quicker, a new way.
    const mine = snapshot({
      places: [place('p0', 5, 0.5), place('p1', 1, 0.2), place('p3', 1, 0.3)],
      links: [link('p0', 'p1', 20, 3), link('p1', 'p3', 12, 1)],
      areas: [0, 4],
      count: 9,
      trips: [trip(1_000), trip(6_000)],
      history: [mark(1, 3_600_000), mark(2, 7_000_000)],
      explore: 0.8,
    });
    const merged = mergeMemories(stored, mine, tallyOf(base), map);

    expect(merged.graph.places.map((p) => p.id)).toEqual(['p0', 'p1', 'p2', 'p3']);
    const p0 = merged.graph.places[0];
    // Visits: the stored 3 and the 3 this one made since.
    expect(p0?.visits).toBe(6);
    // Its value: weighted by how often each went there.
    expect(p0?.q).toBeCloseTo((2 * 3 + 0.5 * 5) / 8, 10);
    const way = merged.graph.links.find((l) => l.a === 'p0' && l.b === 'p1');
    expect(way).toMatchObject({ cost: 20, walks: 2 + 2 });
    expect(merged.graph.links.some((l) => l.a === 'p1' && l.b === 'p3')).toBe(true);
    expect(merged.graph.areas).toEqual([1, 4]);
    // Counts: what was stored and what this one learnt since (9 - 5), never the base twice.
    expect(merged.metrics.stepsDone).toBe(7 + 4);
    expect(merged.graph.shortcuts).toBe(7 + 4);
    // Trips and hours: what was stored and this one's own since.
    expect(merged.metrics.trips.map((t) => t.at)).toEqual([1_000, 5_000, 6_000]);
    expect(merged.metrics.history.map((h) => h.at)).toEqual([3_600_000, 7_000_000, 7_200_000]);
    expect(merged.bandits.explore).toBeCloseTo(0.6, 10);
  });

  it('a memory written first, with nothing stored before, counts in full', () => {
    const mine = snapshot({ places: [place('p0', 2, 1)], count: 3 });
    const merged = mergeMemories(snapshot({ places: [] }), mine, EMPTY_TALLY, map);
    expect(merged.graph.places).toEqual([place('p0', 2, 1)]);
    expect(merged.metrics.stepsDone).toBe(3);
  });

  it('stays within a memory’s bounds: the most visited places stay, and the ways of the others go', () => {
    const many: WalkPlace[] = Array.from({ length: MAX_PLACES + 50 }, (_, i) => ({ id: `q${i}`, kind: 'object', at: [(i % 60) + 0.5, 1, Math.floor(i / 60) * 4 + 0.5] }));
    const big = yardWith(many);
    const stored = snapshot({ places: many.slice(0, 150).map((p, i) => place(p.id, i < 10 ? 0 : 5, 0)), links: [link('q0', 'q20', 10, 1)] });
    const mine = snapshot({ places: many.slice(150).map((p) => place(p.id, 3, 0)) });
    const merged = mergeMemories(stored, mine, EMPTY_TALLY, big);
    expect(merged.graph.places).toHaveLength(MAX_PLACES);
    // The ten never visited went first, and the way from one of them with it.
    for (let i = 0; i < 10; i++) expect(merged.graph.places.some((p) => p.id === `q${i}`)).toBe(false);
    expect(merged.graph.links).toEqual([]);
  });
});
