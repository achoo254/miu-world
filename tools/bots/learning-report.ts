// `pnpm bots:learning`: shows the review page how companion bots learn a map on their own. A measuring simulation,
// deterministic (fixed seeds, simulated clock): on each of three maps, six of its bots start knowing nothing and
// live three hours with the server's own mind (bot-brain/: the map's real walk grid and quests, no player around).
// Every ten minutes it takes the fleet's numbers: places known, how direct the trips to their quests' places are
// (the first trip to a place, and trips to a place it went to before), shortcuts found, time stuck. Writes
// assets/generated/review/bots-learning.json (then run `pnpm assets:manifest`). This measures, it does not train:
// nothing is written to any database, and no bot of the game starts from what these learnt.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { hashOf, personaOf, seeded } from '../../apps/server/src/multiplayer/bot-persona';
import { BOT_MAP_CONFIGS, HOME_SNAP } from '../../apps/server/src/multiplayer/bot-profiles';
import { BotBody } from '../../apps/server/src/multiplayer/bot-brain/body';
import { Brain, type Trip } from '../../apps/server/src/multiplayer/bot-brain/brain';
import { LocalPlanner, PathQueue } from '../../apps/server/src/multiplayer/bot-brain/local-path';
import { contentQuestBook, type QuestBook } from '../../apps/server/src/multiplayer/bot-brain/quest-plan';
import { WalkStore, type WalkMap } from '../../apps/server/src/multiplayer/bot-brain/walk-store';
import { ASSETS_DIR } from '../assets/asset-lib';

export const LEARNING_FILE = path.join(ASSETS_DIR, 'generated/review/bots-learning.json');

/** The maps measured: the school, the hub where players meet, and the forest. */
export const LEARNING_MAPS = ['truong-hoc', 'trung-tam', 'forest-ch1'] as const;

export interface LearningSettings {
  /** Bots per map (the first of its companion bots). */
  bots: number;
  minutes: number;
  /** A sample every this many minutes. */
  sampleMinutes: number;
  /** Simulated seconds a tick (the server steps its bots every 0.1 s; the learning test, like this, every 0.5 s). */
  tickS: number;
  /** Seeds each bot's dice as `<seed>:<bot id>`. */
  seed: string;
}

export const LEARNING_SETTINGS: LearningSettings = { bots: 6, minutes: 180, sampleMinutes: 10, tickS: 0.5, seed: 'learn' };

/** A day the maps' quests are what they are every day (no event on). */
const DAY = new Date(Date.UTC(2026, 9, 7, 3));

/** The fleet's numbers at one moment, counted from the start (means are per bot). */
export interface LearningSample {
  minute: number;
  placesKnown: number;
  shortcuts: number;
  /** Straight distance over distance walked, over every first trip to a quest place so far (null: none yet). */
  firstTripDirectness: number | null;
  /** The same over every trip to a quest place it had been to before (null: none yet). */
  againTripDirectness: number | null;
  firstTrips: number;
  againTrips: number;
  /** Share of the bots' time stuck so far. */
  stuckShare: number;
  /** Quest steps done by the whole fleet so far. */
  stepsDone: number;
}

export interface MapLearning {
  map: string;
  bots: number;
  /** Places on the map's walk grid (people, things, landmarks, gates, stops). */
  places: number;
  quests: number;
  samples: LearningSample[];
  /** Steps that broke the walking rules (always 0: the bots walk as the child's walk does). */
  badSteps: number;
}

export interface LearningReport {
  source: 'simulation';
  settings: LearningSettings;
  maps: MapLearning[];
}

interface SimBot {
  speed: number;
  brain: Brain;
  body: BotBody;
  trips: Trip[];
}

const round = (n: number, places = 3): number => Math.round(n * 10 ** places) / 10 ** places;

/** Σ straight ÷ Σ (time × the bot's pace) over the trips (null: none). */
function directness(trips: ReadonlyArray<{ trip: Trip; speed: number }>): number | null {
  const walked = trips.reduce((s, t) => s + t.trip.seconds * t.speed, 0);
  return walked > 0 ? round(trips.reduce((s, t) => s + t.trip.straight, 0) / walked) : null;
}

/** Six (`settings.bots`) of the map's bots, from nothing, for `settings.minutes`; a sample every `sampleMinutes`. */
export function simulateMap(mapId: string, map: WalkMap, book: QuestBook, settings: LearningSettings = LEARNING_SETTINGS): MapLearning {
  const profiles = (BOT_MAP_CONFIGS[mapId] ?? []).slice(0, settings.bots);
  if (profiles.length === 0) throw new Error(`no companion bots on ${mapId}`);
  const quests = book.questsOn(mapId, DAY);
  let clock = 0;
  const now = (): number => clock;
  const queue = new PathQueue(Infinity);
  const planner = new LocalPlanner();
  const bots = profiles.map((profile): SimBot => {
    const home = map.snap(profile.home, HOME_SNAP);
    if (!home) throw new Error(`${profile.id} has no standing spot near its home on ${mapId}`);
    const persona = personaOf(profile.id);
    const random = seeded(hashOf(`${settings.seed}:${profile.id}`));
    const brain = new Brain({ map, home, persona, quests, random, now, planner, requestPlan: (run) => queue.request(`${profile.id}|way`, run) });
    const body = new BotBody({ map, home, pace: { speed: persona.walk, sight: persona.sight }, chooser: brain, planner, requestPlan: (run) => queue.request(profile.id, run), now });
    return { speed: persona.walk, brain, body, trips: [] };
  });

  const samples: LearningSample[] = [];
  let badSteps = 0;
  const ticks = Math.round((settings.minutes * 60) / settings.tickS);
  const sampleEvery = Math.round((settings.sampleMinutes * 60) / settings.tickS);
  for (let t = 1; t <= ticks; t++) {
    clock += settings.tickS * 1000;
    for (const bot of bots) {
      const before = bot.brain.metrics.tripsTotal;
      bot.body.tick(settings.tickS);
      const { stepper } = bot.body;
      if (map.standAt(Math.floor(stepper.x), stepper.y, Math.floor(stepper.z)) === 0) badSteps += 1;
      // The brain keeps its last trips only: take the new ones as they end.
      const added = bot.brain.metrics.tripsTotal - before;
      if (added > 0) bot.trips.push(...bot.brain.metrics.trips.slice(-added));
    }
    queue.drain();
    if (t % sampleEvery !== 0) continue;
    const trips = bots.flatMap((b) => b.trips.map((trip) => ({ trip, speed: b.speed })));
    const first = trips.filter((t) => t.trip.first);
    const again = trips.filter((t) => !t.trip.first);
    const mean = (of: (b: SimBot) => number): number => round(bots.reduce((s, b) => s + of(b), 0) / bots.length, 1);
    const elapsedS = t * settings.tickS;
    samples.push({
      minute: Math.round((t * settings.tickS) / 60),
      placesKnown: mean((b) => b.brain.memory.places.size),
      shortcuts: mean((b) => b.brain.memory.shortcuts),
      firstTripDirectness: directness(first),
      againTripDirectness: directness(again),
      firstTrips: first.length,
      againTrips: again.length,
      stuckShare: round(bots.reduce((s, b) => s + b.brain.metrics.stuckSeconds, 0) / (bots.length * elapsedS), 4),
      stepsDone: bots.reduce((s, b) => s + b.brain.metrics.stepsDone, 0),
    });
  }
  return { map: mapId, bots: bots.length, places: map.places.length, quests: quests.length, samples, badSteps };
}

export function learningReport(settings: LearningSettings = LEARNING_SETTINGS, maps: readonly string[] = LEARNING_MAPS): LearningReport {
  const walk = new WalkStore();
  const book = contentQuestBook();
  return {
    source: 'simulation',
    settings,
    maps: maps.map((mapId) => {
      const map = walk.get(mapId);
      if (!map) throw new Error(`no walk grid for ${mapId} (run pnpm world:walk ${mapId})`);
      return simulateMap(mapId, map, book, settings);
    }),
  };
}

function main(): void {
  const started = Date.now();
  const report = learningReport();
  for (const m of report.maps) {
    const last = m.samples.at(-1);
    if (!last) continue;
    const gain = last.firstTripDirectness && last.againTripDirectness ? (last.againTripDirectness / last.firstTripDirectness).toFixed(2) : '–';
    console.log(
      `${m.map}: ${m.bots} bots, places known ${m.samples[0]?.placesKnown ?? 0} → ${last.placesKnown} of ${m.places}, ` +
        `trips again ${gain}× as direct as first (${last.firstTrips} first, ${last.againTrips} again), ` +
        `shortcuts ${last.shortcuts} a bot, stuck ${(last.stuckShare * 100).toFixed(1)}%, bad steps ${m.badSteps}`,
    );
  }
  mkdirSync(path.dirname(LEARNING_FILE), { recursive: true });
  writeFileSync(LEARNING_FILE, `${JSON.stringify(report, null, 1)}\n`);
  console.log(`written ${path.relative(process.cwd(), LEARNING_FILE)} in ${((Date.now() - started) / 1000).toFixed(1)} s (run pnpm assets:manifest)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
