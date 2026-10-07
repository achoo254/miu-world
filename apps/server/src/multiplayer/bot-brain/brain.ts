// A companion bot's mind on one map. It knows only what it has met (memory-graph.ts): places it saw, ways it walked,
// squares it set foot in. Each time it stands free it weighs its options: going to a place it knows (what going
// there has been worth, more for its quest's target and a little for places near its home, less the longer the way),
// exploring squares it has not walked (outwards from its home), going to meet a player it sees, riding from a stop it
// stands at, or resting; and picks one by a softmax as curious as it is (learner.ts). By a way it does not know it
// first looks for one over what it sees, and remembers the walls it met (a fence is one for every place behind it). When the choice ends it is paid (a quest
// step done, something done at a person or a thing, a player met, new places and squares found, less the walking
// and getting stuck) and learns from it. It plays the map's quests on its own (quest-plan.ts): it looks for a step's
// target until it finds it, then goes straight there the next time, along the ways it remembers and the shortcuts
// it found. A player it meets is never followed: it walks over once, stays a moment, and goes back to its own plans.
import type { WalkPlace } from '@miu/voxel/walk-cells';
import type { LocalPlanner, PathGoal } from './local-path';
import {
  banditUpdate,
  faded,
  GOAL_BONUS,
  HOME_BONUS,
  HOME_RADIUS,
  LAMBDA,
  MEET_FORGET_MS,
  meetReward,
  REWARD,
  workReward,
  SEEK_BONUS,
  softmaxPick,
  startValues,
  tdUpdate,
  temperature,
  type Bandits,
} from './learner';
import { Avoidance } from './avoidance';
import { pickArea } from './explore-areas';
import { AREA_SIDE, MemoryGraph, pointsOf, UNKNOWN_WAY, walksStraight, type Reach } from './memory-graph';
import { QuestPlan, type BotQuest } from './quest-plan';
import { seePlaces } from './sight';
import { PLACE_REACH, type BotView, type Choice, type GoalChooser, type Outcome } from './wander';
import type { Spot, WalkMap } from './walk-store';

/** It looks around this often (s): the places and squares it notices, the place it stands at. */
const PERCEIVE_S = 0.5;
/** A way walked in one go is kept up to this many columns (longer: it was lost, nothing worth keeping). */
const CHAIN_MAX = 1_500;
/** Exploring ends after this long, the square it was heading for then counted as one it cannot get to for a while. */
const EXPLORE_MAX_S = 120;
/** Exploring, it looks around this long while it finds a way (at most EXPLORE_LOOK_MAX_S)… */
const EXPLORE_LOOK_S = 0.3;
const EXPLORE_LOOK_MAX_S = 3;
/** …one that gets it at least this much nearer the square it explores towards. */
const EXPLORE_MIN_GAIN = 4;
/**
 * Heading somewhere by a way it does not know and not a block nearer for this long: it is stuck (a wall it walks
 * along), gives up and remembers the wall. Three plans' time, as its feet count stuck (stepper.ts), but nearer to
 * where it heads rather than to the end of its last plan, so it notices walking along a wall too.
 */
const GIVE_UP_MS = 6_000;
/** Going to a place it saw a way to: the way may wind away from it first, so it waits this long before giving up. */
const SEEN_WAY_PATIENCE_MS = 10_000;
/** Not moving 2 blocks for this long while it means to walk: put back at the nearest place it knows. */
const STALL_RESET_S = 20;
const STALL_MOVE = 2;
/** A step whose target it has not found after this long is given up. */
const SEEK_GIVE_UP_MS = 20 * 60_000;
/** Its guess of the detour a way it does not know takes moves this much towards each one it makes, within 1…4. */
const DETOUR_ALPHA = 0.2;
const DETOUR_MAX = 4;
/** Trips to a quest target shorter than this (blocks, straight) say nothing of how well it knows the way. */
const TRIP_MIN = 12;
const TRIPS_KEPT = 50;
const PAIRS_KEPT = 200;
const HISTORY_KEPT = 72;
/** A place it sees this far off, with no way to it known, gets a way planned over what it sees… */
const SEEN_WAY_MIN = 6;
/** …while fewer ways than this leave the place it stands at (the ways it walks come first). */
const SEEN_WAYS_FROM = 4;
/** It meets a player by walking up to this close. */
const MEET_REACH = 4;

export interface SeenPlayer {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type Gesture = 'wave' | 'jump' | 'cheer';

export interface BrainEvents {
  /** The quest it is busy with changed (null: none). */
  doing(quest: string | null): void;
  /** What it does shows: a wave at a person, a jump at a thing, a cheer when a question or a quest is done. */
  gesture(emote: Gesture): void;
}

export interface BrainOptions {
  map: WalkMap;
  home: Spot;
  persona: { readonly sight: number; readonly walk: number; readonly curious: number };
  quests: readonly BotQuest[];
  random: () => number;
  /** Milliseconds. */
  now: () => number;
  planner: LocalPlanner;
  /** Queues a plan of its own (a way to a place it sees); the server's queue keeps the time budget. */
  requestPlan(run: () => void): void;
  /** The players it sees from `at`. */
  players?: (at: Spot, sight: number) => readonly SeenPlayer[];
  events?: Partial<BrainEvents>;
  /** Whether it goes along the ways it remembers (default true; false only to measure what they are worth). */
  ways?: boolean;
}

/** A trip to a quest target: how long it took and how far it was in a straight line. */
export interface Trip {
  readonly target: string;
  /** Its first trip to that place ever (it looked for it, or knew of it only by sight). */
  readonly first: boolean;
  readonly seconds: number;
  readonly straight: number;
  /** When it set out (ms). */
  readonly startedAt: number;
  /** When it ended (ms). */
  readonly at: number;
}

/** Its numbers at the end of an hour. */
export interface HourMark {
  readonly hour: number;
  readonly placesKnown: number;
  readonly linksKnown: number;
  readonly shortcuts: number;
  readonly areasVisited: number;
  /** Straight distance over walked distance of the hour's trips (0: none). */
  readonly efficiency: number;
  readonly stuckSeconds: number;
  readonly skipped: number;
  readonly reward: number;
}

/**
 * Trips between two places out of each other's sight, from the first one made by a way it did not know: how long
 * that first one and the third one took (s), and whether the third went along a way it knew.
 */
export interface PairTimes {
  walks: number;
  first: number;
  third: number | null;
  thirdRouted: boolean;
}

export interface BrainMetrics {
  trips: Trip[];
  tripsTotal: number;
  /** By `<from>><to>`, at most PAIRS_KEPT (the oldest go). */
  pairs: Map<string, PairTimes>;
  stuck: number;
  stuckSeconds: number;
  resets: number;
  skipped: number;
  questsDone: number;
  stepsDone: number;
  meets: number;
  rewardThisHour: number;
  rewardPerHour: number;
  history: HourMark[];
}

type Option = 'place' | 'explore' | 'meet' | 'rest' | 'ride' | 'here';

/** What it is doing now, and what it earned so far. */
interface Current {
  option: Option;
  /** `plan`: looking for a way to explore by before it sets off. */
  phase: 'go' | 'work' | 'meet' | 'look' | 'rest' | 'plan';
  place: PlaceRef | null;
  /** The quest step's target it works at (paid as a step). */
  forStep: boolean;
  question: boolean;
  area: number;
  /** Exploring to find its quest's target, or going to it: time walking counts towards the quest's trip. */
  pursues?: boolean;
  /** The place it set out from, and how far its goal was then (a trip between two places). */
  from?: { id: string; straight: number };
  /** Going along a way it knows. */
  routed?: boolean;
  /** How far its goal was when it set out (blocks, straight). */
  straight?: number;
  /** Where it heads by a way it does not know, the nearest it got so far and when (to tell when it is stuck). */
  heading?: { x: number; z: number; bestLeft: number; bestAt: number; patienceMs: number };
  player: string | null;
  startedAt: number;
  walkS: number;
  reward: number;
}

interface PlaceRef {
  readonly id: string;
  readonly place: WalkPlace;
}

const between = (random: () => number, min: number, max: number): number => min + (max - min) * random();

export class Brain implements GoalChooser {
  readonly memory: MemoryGraph;
  readonly bandits: Bandits;
  readonly quests: QuestPlan;
  readonly metrics: BrainMetrics = {
    trips: [],
    tripsTotal: 0,
    pairs: new Map(),
    stuck: 0,
    stuckSeconds: 0,
    resets: 0,
    skipped: 0,
    questsDone: 0,
    stepsDone: 0,
    meets: 0,
    rewardThisHour: 0,
    rewardPerHour: 0,
    history: [],
  };
  private readonly options: BrainOptions;
  private readonly placeById: ReadonlyMap<string, WalkPlace>;
  private readonly tau: number;
  private current: Current | null = null;
  /** The place it last stood at, and what it walked since (a way between two places, once it reaches the next). */
  private lastPlace: string | null = null;
  private chain: Spot[] = [];
  private chainS = 0;
  private sinceLook = 0;
  /** Where it last made headway while meaning to walk, and how long ago. */
  private anchor: Spot;
  private stalledS = 0;
  private resetDue = false;
  private gaveUp = false;
  /** Since when it has had nowhere to go (null: it has). */
  private trappedSince: number | null = null;
  /** Where the way it looked for before setting off ends (null: none found; undefined: still looking). */
  private scouted: { end: Spot; reaches: boolean } | null | undefined = undefined;
  /** How near it got to each square it explores towards (it gives one up when a stretch gets it no nearer). */
  private readonly exploreBest = new Map<number, number>();
  /** Places and squares it could not get to lately, and the walls it met. */
  private readonly avoid: Avoidance;
  /** When it last did something at each person or thing. */
  private readonly workedAt = new Map<string, number>();
  /** Players met lately (public id → times met and when last): only counts, never kept beyond a few minutes. */
  private readonly met = new Map<string, { times: number; at: number }>();
  /** The trip towards its step's targets: from where it first set out for them, and its time walking for them. */
  private trip: { from: Spot | null; seconds: number; since: number } = { from: null, seconds: 0, since: 0 };
  private stepSince: number;
  private nextHourAt: number;
  private hour = 0;
  private lastFadeAt: number;
  /**
   * How much longer than the straight line a way it does not know takes it, learnt from its own trips (it starts
   * from UNKNOWN_WAY): where finding its way over what it sees goes well, it seldom takes the long way it knows.
   */
  detour = UNKNOWN_WAY;

  constructor(options: BrainOptions) {
    this.options = options;
    this.placeById = new Map(options.map.places.map((p) => [p.id, p]));
    const known = new Set(this.placeById.keys());
    // Steps of quests whose target is not on the map at all could never be found.
    const quests = options.quests.map((q) => ({ ...q, steps: q.steps.filter((s) => s.targets.every((t) => known.has(t))) }));
    this.quests = new QuestPlan(quests, options.random);
    this.memory = new MemoryGraph(options.map, (id) => this.keeps(id));
    this.avoid = new Avoidance(this.memory.areaSide);
    this.bandits = startValues(options.persona.curious);
    this.tau = temperature(options.persona.curious);
    const now = options.now();
    this.anchor = options.home;
    this.stepSince = now;
    this.nextHourAt = now + 3_600_000;
    this.lastFadeAt = now;
  }

  /** The quest it is busy with (null: none). */
  get questId(): string | null {
    return this.quests.quest?.id ?? null;
  }

  private keeps(id: string): boolean {
    if (this.quests.remaining.includes(id)) return true;
    const place = this.memory.places.get(id);
    const { home } = this.options;
    return place !== undefined && Math.hypot(place.at[0] - home.x, place.at[2] - home.z) <= PLACE_REACH * 4;
  }

  private emit<K extends keyof BrainEvents>(kind: K, ...args: Parameters<BrainEvents[K]>): void {
    const handler = this.options.events?.[kind] as ((...a: Parameters<BrainEvents[K]>) => void) | undefined;
    handler?.(...args);
  }

  next(view: BotView, last: Outcome): Choice {
    const now = this.options.now();
    switch (last.kind) {
      case 'start':
        this.emit('doing', this.questId);
        return this.rest(between(this.options.random, 0.5, 3));
      case 'arrived':
        return this.arrived(view, now);
      case 'rested':
        return this.rested(view, now);
      case 'stuck':
        return this.stuck(view, now, last.seconds ?? 0);
      case 'rode':
        // Off at the other end: it looks around before deciding (the ride is paid what it finds).
        this.lastPlace = null;
        this.chain = [view.at];
        this.chainS = 0;
        if (this.current) this.current.phase = 'look';
        return { kind: 'rest', seconds: between(this.options.random, 1, 3) };
      case 'enough':
        if (this.resetDue) return this.reset(view);
        if (this.gaveUp) return this.stuck(view, now, 0);
        this.finish();
        return this.decide(view, now);
    }
  }

  /** Stuck on its way (its feet found no headway, or it gave up first): it keeps away from there a while. */
  private stuck(view: BotView, now: number, feetSeconds: number): Choice {
    this.gaveUp = false;
    this.metrics.stuck += 1;
    const current = this.current;
    const heading = current?.heading;
    this.metrics.stuckSeconds += Math.max(feetSeconds, heading ? (now - heading.bestAt) / 1000 : 0);
    if (current) {
      const { option, area, place, routed } = current;
      current.reward += REWARD.stuck;
      if (option === 'explore' && area >= 0) {
        this.avoid.shunAround(area, now);
        const middle = this.avoid.areaMiddle(area);
        this.avoid.addWall(view.at, middle.x, middle.z, now);
      }
      if (option === 'place' && place) {
        this.avoid.strikePlace(place.id, now, routed);
        if (!routed) this.avoid.addWall(view.at, place.place.at[0], place.place.at[2], now);
      }
    }
    this.finish();
    return this.decide(view, now);
  }

  private rest(seconds: number): Choice {
    this.current = { option: 'rest', phase: 'rest', place: null, forStep: false, question: false, area: -1, player: null, startedAt: this.options.now(), walkS: 0, reward: -LAMBDA * seconds };
    return { kind: 'rest', seconds };
  }

  private arrived(view: BotView, now: number): Choice {
    const current = this.current;
    if (!current) return this.decide(view, now);
    if (current.option === 'meet' && current.phase === 'go') {
      current.phase = 'meet';
      return { kind: 'rest', seconds: between(this.options.random, 5, 15) };
    }
    if (current.option === 'explore') this.explored(current.area, view.at, now);
    if (current.option !== 'place' || !current.place) {
      this.finish();
      return this.decide(view, now);
    }
    const { id, place } = current.place;
    const memory = this.memory.places.get(id);
    const firstVisit = (memory?.visits ?? 0) === 0;
    if (memory) memory.visits += 1;
    if (current.from && current.from.straight > this.options.persona.sight) this.pairWalked(`${current.from.id}>${id}`, current.walkS, current.routed === true);
    const straight = current.straight ?? 0;
    if (!current.routed && straight >= TRIP_MIN && current.walkS > 0) {
      // How much longer than the straight line a way it did not know took: its guess for the next one.
      const took = Math.min(DETOUR_MAX, Math.max(1, (current.walkS * this.options.persona.walk) / straight));
      this.detour += DETOUR_ALPHA * (took - this.detour);
    }
    const random = this.options.random;
    if (this.quests.remaining.includes(id)) {
      this.endTrip(place, firstVisit, now);
      current.phase = 'work';
      current.forStep = true;
      current.question = this.quests.step?.question ?? false;
      if (current.question) return { kind: 'work', seconds: between(random, 6, 12) };
      return this.workAt(place);
    }
    if (place.kind === 'npc' || place.kind === 'object') {
      current.phase = 'work';
      return this.workAt(place);
    }
    this.finish();
    return this.decide(view, now);
  }

  private pairWalked(key: string, seconds: number, routed: boolean): void {
    const { pairs } = this.metrics;
    const known = pairs.get(key);
    if (!known) {
      // Counted from a trip made without a known way: one along a way it knew had nothing left to learn.
      if (routed) return;
      if (pairs.size >= PAIRS_KEPT) pairs.delete(pairs.keys().next().value ?? '');
      pairs.set(key, { walks: 1, first: seconds, third: null, thirdRouted: false });
      return;
    }
    known.walks += 1;
    if (known.walks !== 3) return;
    known.third = seconds;
    known.thirdRouted = routed;
  }

  /** Whether it knows where place `id` is and has not got stuck going there lately. */
  private goable(id: string, now: number): boolean {
    return this.memory.places.has(id) && !this.avoid.avoidsPlace(id, now);
  }

  /** A stretch towards square `area` ended at `at`: no nearer than the stretches before, it gives the square up a while. */
  private explored(area: number, at: Spot, now: number): void {
    if (this.memory.visited(area)) return;
    const [ax] = this.memory.areaSide;
    const away = Math.hypot(((area % ax) + 0.5) * AREA_SIDE - (at.x + 0.5), (Math.floor(area / ax) + 0.5) * AREA_SIDE - (at.z + 0.5));
    const best = this.exploreBest.get(area) ?? Infinity;
    if (away > best - EXPLORE_MIN_GAIN / 2) {
      this.exploreBest.delete(area);
      this.avoid.shunAround(area, now);
      return;
    }
    if (this.exploreBest.size >= 64) this.exploreBest.clear();
    this.exploreBest.set(area, away);
  }

  /** The known place it stands at (within reach), if any. */
  private placeAt(at: Spot): string | null {
    for (const place of seePlaces(this.options.map, at, PLACE_REACH)) {
      if (this.memory.places.has(place.id) && Math.hypot(place.at[0] - (at.x + 0.5), place.at[2] - (at.z + 0.5)) <= PLACE_REACH) return place.id;
    }
    return null;
  }

  /** Busy at a person (a wave, then a while) or a thing (a while, now and then a jump). */
  private workAt(place: WalkPlace): Choice {
    const random = this.options.random;
    if (place.kind === 'npc') {
      this.emit('gesture', 'wave');
      return { kind: 'work', seconds: 1.5 + between(random, 3, 6) };
    }
    if (random() < 0.3) this.emit('gesture', 'jump');
    return { kind: 'work', seconds: between(random, 2, 4) };
  }

  private rested(view: BotView, now: number): Choice {
    const current = this.current;
    if (current?.phase === 'plan') return this.scoutedOn(view, current, now);
    if (current?.phase === 'work') {
      if (current.forStep || current.option === 'here') {
        current.reward += REWARD.step;
        this.stepDone(current.option === 'here' ? null : (current.place?.id ?? null), current.question, now);
      } else if (current.place) {
        const id = current.place.id;
        current.reward += workReward(now - (this.workedAt.get(id) ?? Number.NEGATIVE_INFINITY));
        this.workedAt.set(id, now);
      }
    } else if (current?.phase === 'meet' && current.player) {
      const seen = this.met.get(current.player);
      current.reward += meetReward(seen && now - seen.at < MEET_FORGET_MS ? seen.times : 0);
      this.met.set(current.player, { times: (seen && now - seen.at < MEET_FORGET_MS ? seen.times : 0) + 1, at: now });
      this.metrics.meets += 1;
      if (this.met.size > 64) for (const [player, m] of this.met) if (now - m.at >= MEET_FORGET_MS) this.met.delete(player);
    }
    this.finish();
    return this.decide(view, now);
  }

  private stepDone(target: string | null, question: boolean, now: number): void {
    if (!this.quests.did(target)) return;
    this.metrics.stepsDone += 1;
    if (question) this.emit('gesture', 'cheer');
    this.stepSince = now;
    this.trip = { from: null, seconds: 0, since: 0 };
    if (this.quests.questChanged) {
      this.metrics.questsDone += 1;
      if (!question) this.emit('gesture', 'cheer');
      this.emit('doing', this.questId);
    }
  }

  /** It sets out for its step's targets (once per target). */
  private setOut(at: Spot, now: number): void {
    if (this.trip.from) return;
    this.trip = { from: at, seconds: 0, since: now };
  }

  /** When it set out for its step's targets, on a trip not ended yet (null: none). */
  get tripSince(): number | null {
    return this.trip.from ? this.trip.since : null;
  }

  private endTrip(place: WalkPlace, first: boolean, now: number): void {
    const { from, seconds, since } = this.trip;
    this.trip = { from: null, seconds: 0, since: 0 };
    if (!from || seconds <= 0) return;
    const straight = Math.hypot(place.at[0] - (from.x + 0.5), place.at[2] - (from.z + 0.5));
    if (straight < TRIP_MIN) return;
    this.metrics.trips.push({ target: place.id, first, seconds, straight, startedAt: since, at: now });
    if (this.metrics.trips.length > TRIPS_KEPT) this.metrics.trips.shift();
    this.metrics.tripsTotal += 1;
  }

  /** The choice ended: it is paid what it earned less its walking, and learns. */
  private finish(): void {
    const current = this.current;
    this.current = null;
    if (!current) return;
    const reward = current.reward - LAMBDA * current.walkS;
    this.metrics.rewardThisHour += reward;
    switch (current.option) {
      case 'place': {
        const place = current.place ? this.memory.places.get(current.place.id) : undefined;
        if (!place) return;
        let next = 0;
        for (const link of this.memory.linksFrom(place.id)) next = Math.max(next, this.memory.places.get(link.b)?.q ?? 0);
        place.q = tdUpdate(place.q, reward, next);
        place.lastReward = reward;
        return;
      }
      case 'explore':
        this.bandits.explore = banditUpdate(this.bandits.explore, reward);
        return;
      case 'meet':
        this.bandits.meet = banditUpdate(this.bandits.meet, reward);
        return;
      case 'rest':
        this.bandits.rest = banditUpdate(this.bandits.rest, reward);
        return;
      case 'ride':
        this.bandits.ride = banditUpdate(this.bandits.ride, reward);
        return;
      case 'here':
        return;
    }
  }

  /** Stuck for good: back at the nearest place it knows (or its home). */
  private reset(view: BotView): Choice {
    this.resetDue = false;
    this.metrics.resets += 1;
    this.metrics.stuckSeconds += this.stalledS;
    this.stalledS = 0;
    if (this.current) this.current.reward += REWARD.stuck;
    this.finish();
    const { map, home } = this.options;
    let best: Spot | null = null;
    let bestAway = Infinity;
    for (const place of this.memory.places.values()) {
      const away = Math.hypot(place.at[0] - view.at.x, place.at[2] - view.at.z);
      if (away <= PLACE_REACH + 2 || away >= bestAway) continue;
      const spot = map.snap({ x: place.at[0], y: place.at[1], z: place.at[2] }, PLACE_REACH);
      if (!spot) continue;
      best = spot;
      bestAway = away;
    }
    const to = best ?? home;
    this.anchor = to;
    this.lastPlace = null;
    this.chain = [to];
    this.chainS = 0;
    return { kind: 'reset', to };
  }

  /** What it does next: its options weighed and one picked. */
  private decide(view: BotView, now: number): Choice {
    const { map, persona, random } = this.options;
    const at = view.at;
    // Its step to do where it stands (no target), or a step whose target it never found.
    const step = this.quests.step;
    if (step && step.targets.length === 0) {
      this.current = { option: 'here', phase: 'work', place: null, forStep: true, question: step.question, area: -1, player: null, startedAt: now, walkS: 0, reward: 0 };
      return { kind: 'work', seconds: step.question ? between(random, 6, 12) : between(random, 2, 4) };
    }
    const remaining = this.quests.remaining;
    const seeking = remaining.length > 0 && !remaining.some((t) => this.goable(t, now));
    if (seeking && now - this.stepSince > SEEK_GIVE_UP_MS) {
      this.quests.skip();
      this.metrics.skipped += 1;
      this.stepSince = now;
      this.trip = { from: null, seconds: 0, since: 0 };
      if (this.quests.questChanged) this.emit('doing', this.questId);
      return this.decide(view, now);
    }

    const utilities: number[] = [];
    const makers: Array<() => Choice> = [];
    const offer = (u: number, make: () => Choice): void => {
      utilities.push(u);
      makers.push(make);
    };

    // Places it knows: by the ways it knows from the places around it, or a guess.
    const speed = persona.walk;
    const starts: Array<{ id: string; cost: number }> = [];
    for (const place of seePlaces(map, at, persona.sight)) {
      if (!this.memory.places.has(place.id)) continue;
      // A way it knows starts at a place it can walk straight to from here (one it sees may be past a fence).
      const spot = map.snap({ x: place.at[0], y: place.at[1], z: place.at[2] }, PLACE_REACH);
      if (spot && (place.id === this.placeAt(at) || walksStraight(map, at, spot))) starts.push({ id: place.id, cost: Math.hypot(place.at[0] - at.x, place.at[2] - at.z) / speed });
    }
    const reached = this.options.ways === false ? new Map<string, Reach>() : this.memory.reach(starts);
    const { home } = this.options;
    for (const place of this.memory.places.values()) {
      const straight = Math.hypot(place.at[0] - (at.x + 0.5), place.at[2] - (at.z + 0.5));
      if (straight <= PLACE_REACH + 1) continue;
      // A way it knows when that is quicker than finding one over what it sees (its own guess, learnt as it goes).
      const known = reached.get(place.id);
      const guess = (this.detour * straight) / speed;
      // A place it got stuck going to, or one past a wall it met: only along a way it knows, for a while.
      const direct = !this.avoid.avoidsPlace(place.id, now) && !this.avoid.walled(at, place.at[0], place.at[2], now);
      const routed = known?.link && (!direct || known.cost < guess) && !this.avoid.avoidsPlace(place.id, now, true) ? known : null;
      if (!routed && !direct) continue;
      const cost = routed ? routed.cost : guess;
      const goal = remaining.includes(place.id) ? GOAL_BONUS : 0;
      const nearHome = Math.hypot(place.at[0] - home.x, place.at[2] - home.z) <= HOME_RADIUS ? HOME_BONUS : 0;
      // Its value counts what doing something there pays; done there lately, that is spent for a while.
      const worked = this.workedAt.get(place.id);
      const spent = worked === undefined ? 0 : REWARD.work - workReward(now - worked);
      offer(place.q + goal + nearHome - spent - LAMBDA * cost, () => this.goPlace(place.id, routed ? reached : null, at, now));
    }

    const { avoid } = this;
    const area = pickArea({ map, memory: this.memory, at, home, random, avoids: (i) => avoid.avoidsArea(i, now), walled: (x, z) => avoid.walled(at, x, z, now) });
    if (area >= 0) offer(this.bandits.explore + (seeking ? SEEK_BONUS : 0), () => this.explore(area, seeking, at, now));

    for (const player of this.options.players?.(at, persona.sight) ?? []) {
      const seen = this.met.get(player.id);
      const times = seen && now - seen.at < MEET_FORGET_MS ? seen.times : 0;
      if (Math.hypot(player.x - at.x, player.z - at.z) <= MEET_REACH + 1) continue;
      offer(this.bandits.meet / (1 + times), () => this.meet(player, now));
    }

    const stop = seePlaces(map, at, PLACE_REACH).find((p) => p.kind === 'stop' && p.ride);
    const arrival = stop?.ride ? map.snap({ x: stop.ride[0], y: stop.ride[1], z: stop.ride[2] }, 4) : null;
    if (stop && arrival) offer(this.bandits.ride, () => this.ride(stop, arrival, now));

    // Nowhere it may go (every way it knows of walled off, every square near it given up): stuck where it stands.
    if (utilities.length === 0) {
      this.trappedSince ??= now;
      if (now - this.trappedSince >= STALL_RESET_S * 1000) {
        this.stalledS = (now - this.trappedSince) / 1000;
        this.trappedSince = null;
        return this.reset(view);
      }
    } else this.trappedSince = null;
    offer(this.bandits.rest, () => this.rest(between(random, 2, 6)));
    const picked = softmaxPick(utilities, this.tau, random);
    return (makers[picked] ?? (() => this.rest(2)))();
  }

  private goPlace(id: string, reached: ReadonlyMap<string, Reach> | null, at: Spot, now: number): Choice {
    const place = this.placeById.get(id);
    if (!place) return { kind: 'rest', seconds: 1 };
    const via = reached ? this.memory.route(reached, id).flatMap((link) => pointsOf(link.points)) : [];
    const pursues = this.quests.remaining.includes(id);
    if (pursues) this.setOut(at, now);
    const straight = Math.hypot(place.at[0] - (at.x + 0.5), place.at[2] - (at.z + 0.5));
    const from = this.placeAt(at);
    const routed = via.length > 0;
    this.current = {
      option: 'place',
      phase: routed ? 'go' : 'plan',
      place: { id, place },
      forStep: false,
      question: false,
      area: -1,
      pursues,
      routed,
      straight,
      ...(from ? { from: { id: from, straight } } : {}),
      player: null,
      startedAt: now,
      walkS: 0,
      reward: 0,
    };
    const goal: PathGoal = { x: place.at[0], y: place.at[1], z: place.at[2], reach: PLACE_REACH };
    // By a way it does not know: it first looks for one over what it sees.
    if (!routed) return this.scout(goal, at);
    return { kind: 'go', goal, place, via };
  }

  /**
   * Explores towards square `area` a stretch at a time. It first looks for a way that gets it nearer over what it sees
   * (a plan in the server's queue, while it stands looking around a moment), then walks to where that way ends,
   * deciding again there. No such way: the square is one it cannot get to from here for a while.
   */
  private explore(area: number, seeking: boolean, at: Spot, now: number): Choice {
    const [ax] = this.memory.areaSide;
    const cx = ((area % ax) + 0.5) * AREA_SIDE;
    const cz = (Math.floor(area / ax) + 0.5) * AREA_SIDE;
    if (seeking) this.setOut(at, now);
    this.current = { option: 'explore', phase: 'plan', place: null, forStep: false, question: false, area, pursues: seeking, player: null, startedAt: now, walkS: 0, reward: 0 };
    // Within this of the square's middle is inside it.
    return this.scout({ x: cx, y: null, z: cz, reach: AREA_SIDE / 2 - 1 }, at);
  }

  /**
   * Before setting off by a way it does not know, it looks for one over what it sees (a plan in the server's queue,
   * while it stands looking around a moment): one that gets there, or at least EXPLORE_MIN_GAIN nearer.
   */
  private scout(goal: PathGoal, at: Spot): Choice {
    const { map, persona, planner } = this.options;
    const current = this.current;
    this.scouted = undefined;
    this.options.requestPlan(() => {
      if (this.current !== current) return;
      const plan = planner.plan(map, at, goal, persona.sight);
      const end = plan?.cells.at(-1);
      const left = (s: Spot): number => Math.hypot(goal.x - (s.x + 0.5), goal.z - (s.z + 0.5));
      this.scouted = end && (plan?.reachesGoal === true || left(at) - left(end) >= EXPLORE_MIN_GAIN) ? { end, reaches: plan?.reachesGoal === true } : null;
    });
    return { kind: 'rest', seconds: EXPLORE_LOOK_S };
  }

  /** It looked for a way: it sets off, or keeps away from there a while (no walking into a fence to find out). */
  private scoutedOn(view: BotView, current: Current, now: number): Choice {
    const scouted = this.scouted;
    if (scouted === undefined && now - current.startedAt < EXPLORE_LOOK_MAX_S * 1000) return { kind: 'rest', seconds: EXPLORE_LOOK_S };
    const place = current.place?.place;
    if (!scouted) {
      // Only that square (it walked into nothing to find out; its neighbours may well have a way).
      if (current.option === 'explore') this.avoid.strikeArea(current.area, now);
      if (place && current.place) {
        this.avoid.strikePlace(current.place.id, now);
        this.avoid.addWall(view.at, place.at[0], place.at[2], now);
      }
      this.finish();
      return this.decide(view, now);
    }
    current.phase = 'go';
    if (place) {
      // A place beyond what it sees: it finds the rest of the way as it goes and gives up at a wall; one it saw a way
      // to gets longer before it counts as stuck (the way may wind away from it first).
      current.heading = { x: place.at[0], z: place.at[2], bestLeft: Infinity, bestAt: now, patienceMs: scouted.reaches ? SEEN_WAY_PATIENCE_MS : GIVE_UP_MS };
      return { kind: 'go', goal: { x: place.at[0], y: place.at[1], z: place.at[2], reach: PLACE_REACH }, place };
    }
    // Exploring: to where the way it saw ends (its feet tell if that fails), deciding again there.
    const { end } = scouted;
    return { kind: 'go', goal: { x: end.x + 0.5, y: end.y, z: end.z + 0.5, reach: 1.5 }, place: null };
  }

  private meet(player: SeenPlayer, now: number): Choice {
    this.current = { option: 'meet', phase: 'go', place: null, forStep: false, question: false, area: -1, player: player.id, startedAt: now, walkS: 0, reward: 0 };
    return { kind: 'go', goal: { x: player.x, y: null, z: player.z, reach: MEET_REACH }, place: null };
  }

  private ride(stop: WalkPlace, to: Spot, now: number): Choice {
    this.current = { option: 'ride', phase: 'go', place: null, forStep: false, question: false, area: -1, player: null, startedAt: now, walkS: 0, reward: 0 };
    return { kind: 'ride', stop, to };
  }

  sense(view: BotView, walked: readonly Spot[], dt: number, walking: boolean): boolean {
    const now = this.options.now();
    const at = view.at;
    if (walking && this.current) {
      this.current.walkS += dt;
      if (this.current.pursues) this.trip.seconds += dt;
    }
    if (walking) this.chainS += dt;
    for (const cell of walked) this.chain.push(cell);
    if (this.chain.length > CHAIN_MAX) {
      // Lost for so long the way is worth nothing: it starts a new one here.
      this.lastPlace = null;
      this.chain = [at];
      this.chainS = 0;
    }
    if (walking && Math.hypot(at.x - this.anchor.x, at.z - this.anchor.z) < STALL_MOVE) {
      this.stalledS += dt;
    } else {
      this.anchor = at;
      this.stalledS = 0;
    }
    this.sinceLook += dt;
    if (this.sinceLook >= PERCEIVE_S) {
      this.sinceLook = 0;
      this.look(view, now);
    }
    if (now >= this.nextHourAt) this.markHour(now);
    if (now - this.lastFadeAt >= 60_000) {
      const hours = (now - this.lastFadeAt) / 3_600_000;
      for (const place of this.memory.places.values()) place.q = faded(place.q, hours);
      this.lastFadeAt = now;
    }
    if (walking && this.stalledS >= STALL_RESET_S) {
      this.resetDue = true;
      return true;
    }
    const current = this.current;
    if (!current || current.phase !== 'go') return false;
    const heading = current.heading;
    if (heading && walking) {
      const left = Math.hypot(heading.x - (at.x + 0.5), heading.z - (at.z + 0.5));
      if (left <= heading.bestLeft - 1) {
        heading.bestLeft = left;
        heading.bestAt = now;
      } else if (now - heading.bestAt >= heading.patienceMs) {
        this.gaveUp = true;
        return true;
      }
    }
    if (current.option === 'explore') {
      if (this.memory.areaOf(at.x, at.z) === current.area) return true;
      // The target its quest needs came into sight while it looked for it: it goes there instead.
      if (current.pursues && this.quests.remaining.some((t) => this.goable(t, now))) return true;
      if ((now - current.startedAt) / 1000 > EXPLORE_MAX_S) {
        this.avoid.shunAround(current.area, now);
        return true;
      }
    }
    if (current.option === 'meet' && current.player) {
      const still = this.options.players?.(at, this.options.persona.sight).some((p) => p.id === current.player) ?? false;
      if (!still) return true;
    }
    return false;
  }

  /** What it notices now: the square it is in, the places it sees, the place it stands at. */
  private look(view: BotView, now: number): void {
    const { map, persona } = this.options;
    const at = view.at;
    const current = this.current;
    if (this.memory.visitArea(at.x, at.z) && current) current.reward += REWARD.newArea;
    const seen = seePlaces(map, at, persona.sight);
    const needed = this.quests.remaining;
    for (const place of seen) if (this.memory.see(place, now, needed.includes(place.id)) && current) current.reward += REWARD.newPlace;
    const here = seen.find((p) => Math.hypot(p.at[0] - (at.x + 0.5), p.at[2] - (at.z + 0.5)) <= PLACE_REACH && this.memory.places.has(p.id));
    if (!here) return;
    if (here.id === this.lastPlace) {
      // Back at the same place: the way out starts again here.
      this.chain = [at];
      this.chainS = 0;
      return;
    }
    if (this.lastPlace) this.memory.recordWalk(map, this.lastPlace, here.id, this.chain, this.chainS);
    this.lastPlace = here.id;
    this.chain = [at];
    this.chainS = 0;
    this.seeWayFrom(here.id, at, seen);
  }

  /** At place `from`, a place it sees with no way known to it gets one planned over what it sees. */
  private seeWayFrom(from: string, at: Spot, seen: readonly WalkPlace[]): void {
    if (this.memory.linksFrom(from).length >= SEEN_WAYS_FROM) return;
    const target = seen.find((p) => this.memory.places.has(p.id) && p.id !== from && !this.memory.link(from, p.id) && Math.hypot(p.at[0] - at.x, p.at[2] - at.z) >= SEEN_WAY_MIN);
    if (!target) return;
    const { map, persona, planner } = this.options;
    this.options.requestPlan(() => {
      const plan = planner.plan(map, at, { x: target.at[0], y: target.at[1], z: target.at[2], reach: PLACE_REACH }, persona.sight);
      if (plan?.reachesGoal) this.memory.recordSeenWay(map, from, target.id, [at, ...plan.cells], persona.walk);
    });
  }

  private markHour(now: number): void {
    const hourTrips = this.metrics.trips.filter((t) => t.at > now - 3_600_000);
    const speed = this.options.persona.walk;
    const efficiency = hourTrips.length > 0 ? hourTrips.reduce((s, t) => s + t.straight / (t.seconds * speed), 0) / hourTrips.length : 0;
    this.metrics.rewardPerHour = this.metrics.rewardThisHour;
    this.metrics.history.push({
      hour: ++this.hour,
      placesKnown: this.memory.places.size,
      linksKnown: this.memory.links.size,
      shortcuts: this.memory.shortcuts,
      areasVisited: this.memory.areasVisited,
      efficiency: Math.round(efficiency * 1000) / 1000,
      stuckSeconds: Math.round(this.metrics.stuckSeconds),
      skipped: this.metrics.skipped,
      reward: Math.round(this.metrics.rewardThisHour * 100) / 100,
    });
    if (this.metrics.history.length > HISTORY_KEPT) this.metrics.history.shift();
    this.metrics.rewardThisHour = 0;
    this.nextHourAt += 3_600_000;
  }
}
