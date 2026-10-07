// One bot, many homes: on the home map every player's home has its own instance of each neighbour bot (and of the
// bot friends who visit), all learning the same map at once. They share one memory in the database: an instance
// writing out reads what is there, merges what it learnt since it last wrote (or since it read the memory) and
// writes that. Places are joined; of a way both know, the quicker one stays; values are averaged by how often each
// went there; counts add up what each learnt since (so nothing counts twice). Two instances writing at the same moment
// may lose a little of what one learnt, which is fine.
import { HISTORY_KEPT, TRIPS_KEPT, type BrainSnapshot } from './brain';
import { MemoryGraph, type SavedLink, type SavedPlace } from './memory-graph';
import type { WalkMap } from './walk-store';

const COUNTERS = ['tripsTotal', 'stuck', 'stuckSeconds', 'resets', 'skipped', 'questsDone', 'stepsDone', 'meets'] as const;
type Counter = (typeof COUNTERS)[number];

/** What an instance had already written (or read) of its counts: what it learnt since is the rest. */
export interface MemoryTally {
  readonly visits: ReadonlyMap<string, number>;
  readonly walks: ReadonlyMap<string, number>;
  readonly counters: Readonly<Record<Counter, number>>;
  readonly shortcuts: number;
  readonly seenWays: number;
  /** The last trip and the last hour's mark it had (ms; newer ones are its own since). */
  readonly tripAt: number;
  readonly markAt: number;
}

const linkKey = (link: { a: string; b: string }): string => `${link.a}>${link.b}`;

/** The counts of a snapshot, as written. */
export function tallyOf(snapshot: BrainSnapshot): MemoryTally {
  const { graph, metrics } = snapshot;
  return {
    visits: new Map(graph.places.map((p) => [p.id, p.visits])),
    walks: new Map(graph.links.map((l) => [linkKey(l), l.walks])),
    counters: Object.fromEntries(COUNTERS.map((c) => [c, metrics[c]])) as Record<Counter, number>,
    shortcuts: graph.shortcuts,
    seenWays: graph.seenWays,
    tripAt: metrics.trips.at(-1)?.at ?? Number.NEGATIVE_INFINITY,
    markAt: metrics.history.at(-1)?.at ?? Number.NEGATIVE_INFINITY,
  };
}

/** Nothing written yet: everything it knows is what it learnt since. */
export const EMPTY_TALLY: MemoryTally = tallyOf({
  graph: { places: [], links: [], areas: [], shortcuts: 0, seenWays: 0 },
  bandits: { explore: 0, meet: 0, rest: 0, ride: 0 },
  detour: 1,
  metrics: { trips: [], tripsTotal: 0, stuck: 0, stuckSeconds: 0, resets: 0, skipped: 0, questsDone: 0, stepsDone: 0, meets: 0, rewardThisHour: 0, rewardPerHour: 0, history: [] },
});

const gained = (now: number, before: number | undefined): number => Math.max(0, now - (before ?? 0));

/**
 * The memory `stored` in the database with what `mine` learnt since `since` merged in, within a memory's bounds on
 * `map` (memory-graph.ts decides what stays when there is too much).
 */
export function mergeMemories(stored: BrainSnapshot, mine: BrainSnapshot, since: MemoryTally, map: WalkMap): BrainSnapshot {
  const places = new Map<string, SavedPlace>(stored.graph.places.map((p) => [p.id, { ...p }]));
  for (const p of mine.graph.places) {
    const theirs = places.get(p.id);
    if (!theirs) {
      places.set(p.id, { ...p });
      continue;
    }
    const weight = theirs.visits + p.visits;
    places.set(p.id, {
      id: p.id,
      firstSeenAt: Math.min(theirs.firstSeenAt, p.firstSeenAt),
      visits: theirs.visits + gained(p.visits, since.visits.get(p.id)),
      q: weight > 0 ? (theirs.q * theirs.visits + p.q * p.visits) / weight : (theirs.q + p.q) / 2,
      lastReward: p.lastReward,
    });
  }
  const links = new Map<string, SavedLink>(stored.graph.links.map((l) => [linkKey(l), l]));
  for (const l of mine.graph.links) {
    const key = linkKey(l);
    const theirs = links.get(key);
    if (!theirs) {
      links.set(key, l);
      continue;
    }
    const quicker = l.cost < theirs.cost ? l : theirs;
    links.set(key, { ...quicker, walks: theirs.walks + gained(l.walks, since.walks.get(key)) });
  }
  const areas = stored.graph.areas.length === mine.graph.areas.length ? mine.graph.areas.map((byte, i) => byte | (stored.graph.areas[i] ?? 0)) : mine.graph.areas;

  // Within a memory's bounds, as the bot itself would keep it.
  const graph = new MemoryGraph(map);
  const onMap = new Map(map.places.map((p) => [p.id, p]));
  graph.restore(
    {
      places: [...places.values()],
      links: [...links.values()],
      areas,
      shortcuts: stored.graph.shortcuts + gained(mine.graph.shortcuts, since.shortcuts),
      seenWays: stored.graph.seenWays + gained(mine.graph.seenWays, since.seenWays),
    },
    (id) => onMap.get(id),
  );

  const counters = Object.fromEntries(COUNTERS.map((c) => [c, stored.metrics[c] + gained(mine.metrics[c], since.counters[c])])) as Record<Counter, number>;
  const trips = [...stored.metrics.trips, ...mine.metrics.trips.filter((t) => t.at > since.tripAt)].sort((a, b) => a.at - b.at).slice(-TRIPS_KEPT);
  const history = [...stored.metrics.history, ...mine.metrics.history.filter((h) => h.at > since.markAt)].sort((a, b) => a.at - b.at).slice(-HISTORY_KEPT);
  const mean = (a: number, b: number): number => (a + b) / 2;
  return {
    graph: graph.saved(),
    bandits: {
      explore: mean(stored.bandits.explore, mine.bandits.explore),
      meet: mean(stored.bandits.meet, mine.bandits.meet),
      rest: mean(stored.bandits.rest, mine.bandits.rest),
      ride: mean(stored.bandits.ride, mine.bandits.ride),
    },
    detour: mean(stored.detour, mine.detour),
    metrics: { ...counters, rewardThisHour: mine.metrics.rewardThisHour, rewardPerHour: mine.metrics.rewardPerHour, trips, history },
  };
}
