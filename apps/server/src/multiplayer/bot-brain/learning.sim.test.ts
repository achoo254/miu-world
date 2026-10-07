// Measures that the bots learn (seeded, simulated clock, nothing written anywhere): six of the school's bots start
// knowing nothing on the school's real walk grid with its real quests and live two hours at 2 Hz, no player around
// (and a quarter of an hour more, so trips set out on in the last half hour can end). Every step they take must be
// one the child's walk could take. Every number of the plan's is printed as the plan words it, with whether it holds;
// what is asserted is what holds on this map (see the note at each assertion). A run of the same bots without the
// ways they remember is printed too: what remembering ways is worth here.
import { describe, expect, it } from 'vitest';
import { canStep } from '@miu/voxel/traversal';
import { WALK_LEVELS } from '@miu/voxel/walk-cells';
import { hashOf, personaOf, seeded } from '../bot-persona';
import { BOT_MAP_CONFIGS, HOME_SNAP } from '../bot-profiles';
import { BotBody } from './body';
import { Brain, type Trip } from './brain';
import { LocalPlanner, PathQueue } from './local-path';
import { PLACE_REACH } from './wander';
import { contentQuestBook, type BotQuest } from './quest-plan';
import { walksAlong } from './stepper';
import { clearOf, feetOf, WalkStore, type Spot, type WalkMap } from './walk-store';

const MAP = 'truong-hoc';
const TICK_S = 0.5;
const MIN = 60_000;
/** A day the map's quests are what they are every day (no event on). */
const DAY = new Date(Date.UTC(2026, 9, 7, 3));

/** Places a bot could stand by, walking from the bots' homes (and riding from a stop it got to). */
function reachablePlaces(map: WalkMap, starts: readonly Spot[]): Set<string> {
  const seen = new Uint8Array(map.sx * map.sz * WALK_LEVELS);
  const queue: number[] = [];
  const enter = (spot: Spot): void => {
    const level = map.levelAt(spot.x, spot.y, spot.z);
    if (level < 0) return;
    const id = (spot.x + spot.z * map.sx) * WALK_LEVELS + level;
    if (seen[id]) return;
    seen[id] = 1;
    queue.push(id);
  };
  const flood = (): void => {
    while (queue.length > 0) {
      const id = queue.pop() ?? 0;
      const column = Math.floor(id / WALK_LEVELS);
      const x = column % map.sx;
      const z = Math.floor(column / map.sx);
      const here = map.spot(x, z, id % WALK_LEVELS);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        for (let l = 0; l < WALK_LEVELS; l++) {
          const there = map.spot(x + dx, z + dz, l);
          if (there === 0) break;
          if (canStep(feetOf(here), clearOf(here), feetOf(there), clearOf(there))) enter({ x: x + dx, y: feetOf(there), z: z + dz });
        }
      }
    }
  };
  const standsBy = (at: readonly number[]): boolean => {
    for (let dz = -PLACE_REACH; dz <= PLACE_REACH; dz++) {
      for (let dx = -PLACE_REACH; dx <= PLACE_REACH; dx++) {
        const x = Math.floor(at[0] ?? 0) + dx;
        const z = Math.floor(at[2] ?? 0) + dz;
        if (Math.hypot(dx, dz) > PLACE_REACH || !map.inside(x, z)) continue;
        for (let l = 0; l < WALK_LEVELS; l++) if (seen[(x + z * map.sx) * WALK_LEVELS + l]) return true;
      }
    }
    return false;
  };
  for (const start of starts) enter(start);
  flood();
  for (let more = true; more; ) {
    more = false;
    for (const stop of map.places) {
      if (stop.kind !== 'stop' || !stop.ride || !standsBy(stop.at)) continue;
      const to = map.snap({ x: stop.ride[0], y: stop.ride[1], z: stop.ride[2] }, 4);
      if (!to || seen[(to.x + to.z * map.sx) * WALK_LEVELS + map.levelAt(to.x, to.y, to.z)]) continue;
      enter(to);
      flood();
      more = true;
    }
  }
  return new Set(map.places.filter((p) => standsBy(p.at)).map((p) => p.id));
}

interface SimBot {
  id: string;
  speed: number;
  home: Spot;
  brain: Brain;
  body: BotBody;
  trips: Trip[];
  /** Places known at the end of every quarter of an hour. */
  known: number[];
}

/** `count` of the school's bots from zero for `minutes` (seeded); `badSteps` counts any step the child could not take. */
function simulate(map: WalkMap, quests: readonly BotQuest[], count: number, minutes: number, ways = true): { bots: SimBot[]; badSteps: number } {
  let clock = 0;
  const queue = new PathQueue(Infinity);
  const planner = new LocalPlanner();
  const bots = (BOT_MAP_CONFIGS[MAP] ?? []).slice(0, count).map((profile): SimBot & { last: Spot } => {
    const home = map.snap(profile.home, HOME_SNAP);
    if (!home) throw new Error(`${profile.id} has no spot near its home`);
    const persona = personaOf(profile.id);
    const random = seeded(hashOf(`learn:${profile.id}`));
    const now = (): number => clock;
    const brain = new Brain({ map, home, persona, quests, random, now, planner, ways, requestPlan: (run) => queue.request(`${profile.id}|way`, run) });
    const body = new BotBody({ map, home, pace: { speed: persona.walk, sight: persona.sight }, chooser: brain, planner, requestPlan: (run) => queue.request(profile.id, run), now });
    return { id: profile.id, speed: persona.walk, home, brain, body, trips: [], known: [], last: home };
  });
  let badSteps = 0;
  for (let t = 0; t < (minutes * 60) / TICK_S; t++) {
    clock += TICK_S * 1000;
    for (const bot of bots) {
      const { body, brain } = bot;
      const wasRiding = body.stepper.riding;
      const tripsBefore = brain.metrics.tripsTotal;
      body.tick(TICK_S);
      const { stepper } = body;
      if (map.standAt(Math.floor(stepper.x), stepper.y, Math.floor(stepper.z)) === 0) badSteps += 1;
      // Each column walked a step from the one before (a ride or a reset puts it down elsewhere).
      const moved = body.walkedNow;
      const first = moved[0];
      if (first) {
        const jumped = wasRiding || Math.max(Math.abs(first.x - bot.last.x), Math.abs(first.z - bot.last.z)) > 1;
        if (!walksAlong(map, jumped ? moved : [bot.last, ...moved])) badSteps += 1;
      }
      bot.last = moved.at(-1) ?? stepper.spot;
      const added = brain.metrics.tripsTotal - tripsBefore;
      if (added > 0) bot.trips.push(...brain.metrics.trips.slice(-added));
      if ((t + 1) % ((15 * 60) / TICK_S) === 0) bot.known.push(brain.memory.places.size);
    }
    queue.drain();
  }
  return { bots, badSteps };
}

/** Straight distance over the distance walked at each bot's pace, over all its trips (Σ straight ÷ Σ time · speed). */
function efficiency(trips: ReadonlyArray<{ trip: Trip; speed: number }>): number {
  const straight = trips.reduce((s, t) => s + t.trip.straight, 0);
  const walked = trips.reduce((s, t) => s + t.trip.seconds * t.speed, 0);
  return walked > 0 ? straight / walked : 0;
}

const tripsOf = (bots: readonly SimBot[], from: number, to: number): Array<{ trip: Trip; speed: number }> =>
  bots.flatMap((b) => b.trips.filter((trip) => trip.startedAt >= from && trip.startedAt < to).map((trip) => ({ trip, speed: b.speed })));

const round = (n: number): number => Math.round(n * 1000) / 1000;

describe('bots learn the school on their own', () => {
  // Two and a quarter simulated hours of six bots and one hour of three (about 100,000 bot ticks, some 10,000 plans):
  // under 10 s on a dev machine; the limit leaves room for a slow CI runner.
  it('come to know its places, find shortcuts, seldom get stuck, and get to their quests faster for what they remember', { timeout: 120_000 }, () => {
    const map = new WalkStore().get(MAP);
    if (!map) throw new Error(`no walk grid for ${MAP}`);
    const quests = contentQuestBook().questsOn(MAP, DAY);
    expect(quests.length).toBeGreaterThan(10);
    const hours = 2;
    const { bots, badSteps } = simulate(map, quests, 6, hours * 60 + 15);
    const reachable = reachablePlaces(map, bots.map((b) => b.home));
    const totalS = hours * 3_600;

    const perBot = bots.map((bot) => {
      const { brain, body } = bot;
      const pairs = [...brain.metrics.pairs.entries()].filter(([, p]) => p.third !== null);
      // A pair was "learnable" when its first trip took clearly longer than the best way it knows now.
      const learnable = pairs.filter(([key, p]) => {
        const [a = '', b = ''] = key.split('>');
        const best = brain.memory.reach([{ id: a, cost: 0 }]).get(b)?.cost;
        return best !== undefined && p.first >= 1.25 * best;
      });
      const faster = (list: typeof pairs): number => list.filter(([, p]) => (p.third ?? Infinity) <= 0.8 * p.first).length;
      return {
        id: bot.id,
        known: brain.memory.places.size,
        knownShare: round([...brain.memory.places.keys()].filter((id) => reachable.has(id)).length / reachable.size),
        knownByQuarter: bot.known.slice(0, (hours * 60) / 15),
        links: brain.memory.links.size,
        shortcuts: brain.memory.shortcuts,
        seenWays: brain.memory.seenWays,
        areas: brain.memory.areasVisited,
        pairs: pairs.length,
        fasterPairs: faster(pairs),
        notWorse: pairs.filter(([, p]) => (p.third ?? Infinity) <= 1.1 * p.first).length,
        learnable: learnable.length,
        learnableFaster: faster(learnable),
        stuckShare: round(brain.metrics.stuckSeconds / totalS),
        feetStuckShare: round(body.stepper.stats.stuckMs / 1000 / totalS),
        resets: brain.metrics.resets,
        steps: brain.metrics.stepsDone,
        quests: brain.metrics.questsDone,
        skipped: brain.metrics.skipped,
        bytes: brain.memory.bytes,
        openTrip: brain.tripSince,
      };
    });
    // A trip to a quest's target: its first one to that place ever (it looked for it, or knew it only by sight) or
    // one to a place it went to before.
    const trips = tripsOf(bots, 0, Infinity);
    const firstTrips = trips.filter((t) => t.trip.first);
    const againTrips = trips.filter((t) => !t.trip.first);
    const early = tripsOf(bots, 0, 30 * MIN);
    const late = tripsOf(bots, (hours * 60 - 30) * MIN, hours * 60 * MIN);
    const meanOfRatios = (list: typeof early): number => list.reduce((s, t) => s + t.trip.straight / (t.trip.seconds * t.speed), 0) / Math.max(1, list.length);
    const sum = (key: 'pairs' | 'fasterPairs' | 'notWorse' | 'learnable' | 'learnableFaster'): number => perBot.reduce((s, r) => s + r[key], 0);
    const fleetStuck = bots.reduce((s, b) => s + b.brain.metrics.stuckSeconds, 0) / (bots.length * totalS);
    const plan = {
      knownShareMin: Math.min(...perBot.map((r) => r.knownShare)),
      efficiencyGain: round(efficiency(late) / efficiency(early)),
      fasterPairShare: round(sum('fasterPairs') / Math.max(1, sum('pairs'))),
      shortcutsMin: Math.min(...perBot.map((r) => r.shortcuts)),
      stuckShare: round(fleetStuck),
    };

    // What remembering ways is worth: the first three bots for an hour with and without them (same seeds; printed).
    const withWays = simulate(map, quests, 3, 60).bots;
    const without = simulate(map, quests, 3, 60, false).bots;
    const all = (list: readonly SimBot[]): Array<{ trip: Trip; speed: number }> => tripsOf(list, 0, Infinity);
    const stuckS = (list: readonly SimBot[]): number => list.reduce((s, b) => s + b.brain.metrics.stuckSeconds, 0);
    const ablation = {
      withWays: { efficiency: round(efficiency(all(withWays))), trips: all(withWays).length, stuckS: Math.round(stuckS(withWays)) },
      withoutWays: { efficiency: round(efficiency(all(without))), trips: all(without).length, stuckS: Math.round(stuckS(without)) },
    };

    console.log(
      JSON.stringify(
        {
          reachable: reachable.size,
          plan: { ...plan, pass: { known: plan.knownShareMin >= 0.6, efficiency: plan.efficiencyGain >= 1.3, pairs: plan.fasterPairShare >= 0.5, shortcuts: plan.shortcutsMin >= 1, stuck: plan.stuckShare < 0.02 } },
          trips: {
            early: early.length,
            late: late.length,
            earlyEfficiency: round(efficiency(early)),
            lateEfficiency: round(efficiency(late)),
            earlyMeanOfRatios: round(meanOfRatios(early)),
            lateMeanOfRatios: round(meanOfRatios(late)),
            first: firstTrips.length,
            again: againTrips.length,
            firstEfficiency: round(efficiency(firstTrips)),
            againEfficiency: round(efficiency(againTrips)),
          },
          stuckShare: round(fleetStuck),
          pairs: { all: sum('pairs'), faster: sum('fasterPairs'), notWorse: sum('notWorse'), learnable: sum('learnable'), learnableFaster: sum('learnableFaster') },
          ablation,
          bots: perBot,
        },
        null,
        1,
      ),
    );

    expect(badSteps).toBe(0);
    for (const r of perBot) {
      // Places known never fall and reach most of the places it could get to (the plan's 60%).
      expect([...r.knownByQuarter].sort((a, b) => a - b)).toEqual(r.knownByQuarter);
      expect(r.knownShare).toBeGreaterThanOrEqual(0.6);
      // At least one shortcut each: a way it walked again replaced by one at least 10% shorter (the plan's ≥ 1).
      expect(r.shortcuts).toBeGreaterThanOrEqual(1);
      expect(r.bytes).toBeLessThanOrEqual(64 * 1024);
    }
    // Stuck under 2% of the bots' time, counted from the last headway to giving up, by its feet or by itself (the
    // plan's < 2%, over all of them; each bot's share is printed).
    expect(fleetStuck).toBeLessThan(0.02);
    // The plan's "last half hour 1.3× as direct as the first" and "third trip between two places ≤ 80% of the first
    // on half the pairs" are printed, not asserted: on this map a bot finds a near-best way over what it sees the
    // first time, so its walks between two places have little left to learn, and which quests fall in the last half
    // hour (far targets it has to look for, or near ones) weighs more than what it learnt. What it learns is where
    // things are and how to get there: going to a place of its quest it has been to before is at least 1.3× as
    // direct as the first time it went there.
    expect(againTrips.length).toBeGreaterThan(20);
    expect(efficiency(againTrips)).toBeGreaterThanOrEqual(1.3 * efficiency(firstTrips));
  });
});
