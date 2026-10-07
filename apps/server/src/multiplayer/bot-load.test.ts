// The bot runner under the load of a busy server: 500 companion bots with their whole minds on a made-up town of
// 800 × 800 columns (streets every 40 blocks, a walled house with a door on each block), first knowing nothing, then
// knowing all a memory holds (200 places, its ways), with four players about, for a minute of the test's clock. What
// it costs is printed (the budget on a dev machine: a tick under 2 ms on average and 8 ms at the 99th percentile);
// the assertions hold on any machine: a wide bound on the tick, the messages (none to a bot, a far bot's moves thinned
// out for a player), every bot's way planned at most once in 2 s and none waiting long, memories written at most once
// in 120 s each, and a room nobody is in moving on once a second while its bots still learn.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerWsMessage } from '@miu/schema/multiplayer';
import { WALK_GROUND, type WalkPlace } from '@miu/voxel/walk-cells';
import { hashOf, seeded } from './bot-persona';
import { HOME_SNAP, type BotProfile } from './bot-profiles';
import { BotRunner, EMPTY_ROOM_STEP_S, TICK_MS } from './bot-runner';
import { memoryBotStore } from './bot-store';
import { FAR_MOVE_MS, MultiplayerHub, NEAR_MOVE_RANGE, type MultiplayerRoom } from './multiplayer-hub';
import type { BrainSnapshot } from './bot-brain/brain';
import { MIN_PLAN_GAP_MS } from './bot-brain/stepper';
import { decodeMemory, encodeMemory } from './bot-brain/memory-codec';
import { AREA_SIDE, MAX_LINKS, MAX_PLACES } from './bot-brain/memory-graph';
import type { BotQuest } from './bot-brain/quest-plan';
import { WalkMap, type Spot } from './bot-brain/walk-store';

const TOWN = 'load-town';
/** A second room on the same grid that no player comes into. */
const QUIET = 'load-quiet';
const SIDE = 800;
const BLOCK = 40;
const ROAD = 4;
const FEET = 10;
/** A house in each block: walls round it, a door 3 wide facing the street to the north. */
const HOUSE = { x: 12, z: 14, w: 13, d: 11, door: 5 } as const;
const MINUTE_MS = 60_000;

/** The column's spots: none in a wall, road on the streets, plain ground everywhere else. */
function spotsAt(x: number, z: number): Array<{ feet: number; clear: number; ground: number; edge: boolean }> {
  const bx = x % BLOCK;
  const bz = z % BLOCK;
  const inX = bx >= HOUSE.x && bx < HOUSE.x + HOUSE.w;
  const inZ = bz >= HOUSE.z && bz < HOUSE.z + HOUSE.d;
  const wall = inX && inZ && (bx === HOUSE.x || bx === HOUSE.x + HOUSE.w - 1 || bz === HOUSE.z || bz === HOUSE.z + HOUSE.d - 1);
  const door = bz === HOUSE.z && bx >= HOUSE.x + HOUSE.door && bx < HOUSE.x + HOUSE.door + 3;
  if (wall && !door) return [];
  const road = bx < ROAD || bz < ROAD;
  return [{ feet: FEET, clear: 7, ground: road ? WALK_GROUND.road : WALK_GROUND.plain, edge: false }];
}

/** A person at every house's door, a thing inside it, a landmark at every crossing: 1,200 places. */
function townPlaces(): WalkPlace[] {
  const places: WalkPlace[] = [];
  for (let cz = 0; cz < SIDE / BLOCK; cz++) {
    for (let cx = 0; cx < SIDE / BLOCK; cx++) {
      const x0 = cx * BLOCK;
      const z0 = cz * BLOCK;
      places.push({ id: `cross-${cx}-${cz}`, kind: 'landmark', at: [x0 + 2.5, FEET, z0 + 2.5] });
      places.push({ id: `door-${cx}-${cz}`, kind: 'npc', at: [x0 + HOUSE.x + HOUSE.door + 1.5, FEET, z0 + HOUSE.z - 1.5] });
      places.push({ id: `room-${cx}-${cz}`, kind: 'object', at: [x0 + HOUSE.x + 6.5, FEET, z0 + HOUSE.z + 5.5] });
    }
  }
  return places;
}

const town = new WalkMap(TOWN, [SIDE, SIDE], spotsAt, townPlaces(), 'load-town-grid');
const random = seeded(hashOf('bot-load'));
const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;

/** Twenty quests of three steps each at the town's places, every other step a question. */
const QUESTS: BotQuest[] = Array.from({ length: 20 }, (_, q) => ({
  id: `load-quest-${q}`,
  steps: Array.from({ length: 3 }, (_, s) => ({ id: `s${s}`, targets: [pick(town.places).id], question: s % 2 === 1 })),
}));

/** `count` bots of `mapId` with homes picked by `where` (snapped to a standing spot). */
function profiles(prefix: string, count: number, where: (i: number) => { x: number; z: number }): BotProfile[] {
  return Array.from({ length: count }, (_, i) => {
    const at = where(i);
    const home = town.snap({ x: at.x, y: FEET, z: at.z }, HOME_SNAP);
    if (!home) throw new Error(`no spot near ${at.x}, ${at.z}`);
    return { id: `bot-${prefix}-${i}`, displayName: `Bot ${i}`, species: 'fox', outfit: [], home };
  });
}

const anywhere = (): { x: number; z: number } => ({ x: 20 + random() * (SIDE - 40), z: 20 + random() * (SIDE - 40) });

/**
 * A memory as full as one gets: MAX_PLACES places with values, MAX_LINKS ways between neighbouring places (each along
 * the street, a few points), every square of the town walked.
 */
function fullMemory(): BrainSnapshot {
  const places = town.places.slice(0, MAX_PLACES).map((p, i) => ({ id: p.id, firstSeenAt: 0, visits: 1 + (i % 5), q: (i % 7) / 7, lastReward: 0 }));
  const at = new Map(town.places.map((p) => [p.id, p.at]));
  const links: BrainSnapshot['graph']['links'] = [];
  for (let i = 0; links.length < MAX_LINKS && i < places.length * places.length; i++) {
    const a = places[i % places.length];
    const b = places[(i % places.length) + 1 + Math.floor(i / places.length)];
    const pa = a ? at.get(a.id) : undefined;
    const pb = b ? at.get(b.id) : undefined;
    if (!a || !b || !pa || !pb) continue;
    const corner = [Math.floor(pb[0]), FEET, Math.floor(pa[2])];
    const points = [Math.floor(pa[0]), FEET, Math.floor(pa[2]), ...corner, Math.floor(pb[0]), FEET, Math.floor(pb[2])];
    const length = Math.abs(pa[0] - pb[0]) + Math.abs(pa[2] - pb[2]);
    links.push({ a: a.id, b: b.id, points, length, cost: length / 3, walks: 2, found: 'walked', firstS: length / 2, thirdS: null });
  }
  const squares = Math.ceil(SIDE / AREA_SIDE) ** 2;
  return {
    graph: { places, links, areas: Array.from({ length: Math.ceil(squares / 8) }, () => 255), shortcuts: 3, seenWays: 2 },
    bandits: { explore: 0.2, meet: 0.6, rest: -0.1, ride: 0.2 },
    detour: 1.6,
    metrics: { trips: [], tripsTotal: 0, stuck: 0, stuckSeconds: 0, resets: 0, skipped: 0, questsDone: 0, stepsDone: 0, meets: 0, rewardThisHour: 0, rewardPerHour: 0, history: [] },
  };
}

interface Watch {
  /** Each tick's time (ms, real). */
  ticks: number[];
  /** How long each plan waited in the queue (ms, the test's clock). */
  waits: number[];
  /** When each bot's own walking plan ran (by plan key; the test's clock). */
  plannedAt: Map<string, number[]>;
  /** When each memory was written (by bot; the test's clock). */
  writes: Map<string, number[]>;
}

/** The runner started over `hub` with `bots` per map, watched: its ticks timed, its plans and its writes noted. */
function watched(hub: MultiplayerHub, bots: Record<string, readonly BotProfile[]>, store = memoryBotStore()): { runner: BotRunner; watch: Watch; store: typeof store } {
  const watch: Watch = { ticks: [], waits: [], plannedAt: new Map(), writes: new Map() };
  const save = store.saveWorldMemory.bind(store);
  store.saveWorldMemory = async (botId, mapId, gridVersion, memory) => {
    const list = watch.writes.get(botId) ?? [];
    list.push(Date.now());
    watch.writes.set(botId, list);
    await save(botId, mapId, gridVersion, memory);
  };
  const runner = new BotRunner(hub, {
    random: seeded(hashOf('bot-load-runner')),
    store,
    walk: { get: (mapId) => (mapId === TOWN || mapId === QUIET ? town : null) },
    quests: { questsOn: (mapId) => (mapId === TOWN || mapId === QUIET ? QUESTS : []) },
    profiles: bots,
  });
  const plans = runner.plans;
  const request = plans.request.bind(plans);
  const asked = new Map<string, number>();
  plans.request = (key, run) => {
    if (!asked.has(key)) asked.set(key, Date.now());
    request(key, () => {
      const since = asked.get(key) ?? Date.now();
      asked.delete(key);
      watch.waits.push(Date.now() - since);
      if (!key.endsWith('|way')) {
        const list = watch.plannedAt.get(key) ?? [];
        list.push(Date.now());
        watch.plannedAt.set(key, list);
      }
      run();
    });
  };
  const tick = runner.tick.bind(runner);
  runner.tick = () => {
    const started = performance.now();
    tick();
    watch.ticks.push(performance.now() - started);
  };
  return { runner, watch, store };
}

/** A player standing at (x, z) in `room`, keeping what she is told and when (the test's clock). */
function standing(room: MultiplayerRoom, id: string, x: number, z: number): { inbox: ServerWsMessage[]; times: number[] } {
  const inbox: ServerWsMessage[] = [];
  const times: number[] = [];
  room.join({
    id,
    isBot: false,
    send: (message) => {
      inbox.push(message);
      times.push(Date.now());
    },
    presence: { id, displayName: 'Bé', isBot: false, species: 'fox', outfit: [], pet: null, petGear: [], x, y: FEET, z, yaw: 0, speed: 0, action: 'idle', riding: false, bubble: null },
  });
  return { inbox, times };
}

/** The moves of every bot of `room` handed to it, counted (a bot needs none). */
function countBotMoves(room: MultiplayerRoom): () => number {
  let moves = 0;
  for (const member of room.members.values()) {
    if (!member.isBot) continue;
    const send = member.send;
    member.send = (message) => {
      if (message.type === 'move') moves += 1;
      send(message);
    };
  }
  return () => moves;
}

function stats(list: readonly number[]): { mean: number; p95: number; p99: number; max: number } {
  const sorted = [...list].sort((a, b) => a - b);
  const at = (p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
  const round = (n: number): number => Math.round(n * 1000) / 1000;
  return { mean: round(sorted.reduce((s, n) => s + n, 0) / Math.max(1, sorted.length)), p95: round(at(0.95)), p99: round(at(0.99)), max: round(sorted.at(-1) ?? 0) };
}

let hub: MultiplayerHub;
let runner: BotRunner | null = null;

beforeEach(() => {
  // The clock the bots live by is the test's; the plan queue's budget is measured in real time.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  hub = new MultiplayerHub();
});

afterEach(async () => {
  runner?.stop();
  runner = null;
  await hub.close();
  vi.useRealTimers();
});

/** The budget's checks on a minute of 500 bots in the town with four players, and 20 more in a room nobody is in. */
async function townMinute(store = memoryBotStore()): Promise<void> {
  const bots = profiles('town', 500, anywhere);
  const quiet = profiles('quiet', 20, anywhere);
  const run = watched(hub, { [TOWN]: bots, [QUIET]: quiet }, store);
  runner = run.runner;
  runner.start();
  const room = hub.getOrCreateRoom(TOWN);
  const players = [0, 1, 2, 3].map((i) => {
    const home = (bots[i * 100] ?? bots[0])?.home ?? { x: 400, z: 400 };
    return standing(room, `p-${i}`, home.x + 0.5, home.z + 0.5);
  });
  const botMoves = countBotMoves(room);
  const quietRoom = hub.getOrCreateRoom(QUIET);
  const quietMoves = countBotMoves(quietRoom);
  const moved = new Map<string, number>();
  const lastAt = new Map<string, string>();
  for (let t = 0; t < MINUTE_MS; t += TICK_MS) {
    await vi.advanceTimersByTimeAsync(TICK_MS);
    for (const m of quietRoom.members.values()) {
      const at = `${m.presence.x},${m.presence.z}`;
      if (lastAt.get(m.id) !== at) moved.set(m.id, (moved.get(m.id) ?? 0) + 1);
      lastAt.set(m.id, at);
    }
  }
  const { watch } = run;
  const tick = stats(watch.ticks);
  const wait = stats(watch.waits);
  const writes = [...watch.writes.values()];
  const moveRates = players.map((p) => p.inbox.filter((m) => m.type === 'move').length / (MINUTE_MS / 1000));
  console.log(JSON.stringify({ bots: bots.length, tickMs: tick, queueWaitMs: wait, plansPerTick: Math.round((runner.plans.ran / watch.ticks.length) * 10) / 10, writes: writes.reduce((s, w) => s + w.length, 0), movesPerSecond: moveRates }));

  // A wide bound for any machine (the budget is the printed numbers on a dev machine).
  expect(tick.mean).toBeLessThan(10);
  // A bot's own way is planned at most once in 2 s, and nobody waits long for one.
  for (const [key, times] of watch.plannedAt) for (let i = 1; i < times.length; i++) expect((times[i] ?? 0) - (times[i - 1] ?? 0), key).toBeGreaterThanOrEqual(MIN_PLAN_GAP_MS);
  expect(wait.p95).toBeLessThanOrEqual(2_000);
  // Memories written at most once in 120 s each (each bot at its own moment): within the minute, once at most, and
  // fewer than five a second for the server.
  for (const w of writes) expect(w.length).toBeLessThanOrEqual(1);
  expect(writes.reduce((s, w) => s + w.length, 0) / (MINUTE_MS / 1000)).toBeLessThan(5);
  // No bot is told another's moves.
  expect(botMoves()).toBe(0);
  expect(quietMoves()).toBe(0);
  // The room nobody is in moves on once a second (its bots stand still in between), and its bots still learn.
  for (const [id, n] of moved) expect(n, id).toBeLessThanOrEqual(MINUTE_MS / 1000 / EMPTY_ROOM_STEP_S + 1);
  await runner.flush();
  const learnt = quiet.map((p) => store.worlds.get(`${p.id}|${QUIET}`)).filter((row) => row && decodeMemory(JSON.parse(row.memory)).graph.places.length > 0);
  expect(learnt.length).toBeGreaterThan(quiet.length / 2);
}

describe('500 companion bots in one town, four players about', () => {
  it('knowing nothing yet: stay within the budget of the tick, the plan queue, the messages and the writes', { timeout: 60_000 }, async () => {
    // Up to a minute on a slow machine: 600 ticks of 520 bots, their plans and a minute of their learning.
    await townMinute();
  });

  it('knowing all a memory holds (200 places and their ways): the same', { timeout: 60_000 }, async () => {
    // As above, with every bot's memory read first (decoded and restored 520 times).
    const store = memoryBotStore();
    const memory = JSON.stringify(encodeMemory(fullMemory()));
    expect(decodeMemory(JSON.parse(memory)).graph.places).toHaveLength(MAX_PLACES);
    for (let i = 0; i < 500; i++) store.worlds.set(`bot-town-${i}|${TOWN}`, { gridVersion: town.sources, memory });
    await townMinute(store);
  });
});

describe("a player's share of the moves", () => {
  it('a hundred bots walking, a few of them near her: every move of a near one, a far one only now and then', async () => {
    const player: Spot = { x: 100, y: FEET, z: 100 };
    // Six live around her, the rest across the town.
    const bots = profiles('moves', 100, (i) => (i < 6 ? { x: player.x + 10 + i * 4, z: player.z + 6 } : { x: 300 + random() * 450, z: 300 + random() * 450 }));
    const run = watched(hub, { [TOWN]: bots });
    runner = run.runner;
    runner.start();
    const room = hub.getOrCreateRoom(TOWN);
    const her = standing(room, 'p-her', player.x + 0.5, player.z + 0.5);
    let nearTicks = 0;
    let ticks = 0;
    for (let t = 0; t < MINUTE_MS; t += TICK_MS) {
      await vi.advanceTimersByTimeAsync(TICK_MS);
      ticks += 1;
      for (const m of room.members.values()) if (m.isBot && Math.hypot(m.presence.x - player.x, m.presence.z - player.z) <= NEAR_MOVE_RANGE) nearTicks += 1;
    }
    const moves = her.inbox.flatMap((m, i) => (m.type === 'move' ? [{ move: m, at: her.times[i] ?? 0 }] : []));
    const perSecond = moves.length / (MINUTE_MS / 1000);
    const near = nearTicks / ticks;
    console.log(JSON.stringify({ movesPerSecond: perSecond, botsNear: Math.round(near * 10) / 10 }));
    expect(near).toBeLessThanOrEqual(6);
    expect(perSecond).toBeLessThanOrEqual(120);
    for (const m of room.members.values()) {
      if (!m.isBot) continue;
      const own = moves.filter(({ move }) => move.id === m.id);
      // Never left walking on the spot: the last move she got of each bot is what it does now.
      const last = own.at(-1)?.move;
      if (last) expect({ id: m.id, speed: last.speed, action: last.action }).toEqual({ id: m.id, speed: m.presence.speed, action: m.presence.action });
      // Far off, it comes at most once every FAR_MOVE_MS, unless what it does changed.
      const far = own.filter(({ move }) => Math.hypot(move.x - player.x - 0.5, move.z - player.z - 0.5) > NEAR_MOVE_RANGE);
      for (let i = 1; i < far.length; i++) {
        const a = far[i - 1];
        const b = far[i];
        if (!a || !b || a.move.speed !== b.move.speed || a.move.action !== b.move.action || a.move.riding !== b.move.riding) continue;
        expect(b.at - a.at, m.id).toBeGreaterThanOrEqual(FAR_MOVE_MS);
      }
    }
  });
});
