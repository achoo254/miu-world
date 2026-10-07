// A few of the school's companion bots on the school's real walk grid with its real quests, on a simulated clock
// (seeded, no player around), for the tests that need bots that learnt something: what they learnt written out and
// read back, merged, kept across a restart.
import { hashOf, personaOf, seeded } from '../bot-persona';
import { BOT_MAP_CONFIGS, HOME_SNAP } from '../bot-profiles';
import { BotBody } from './body';
import { Brain, type SeenPlayer } from './brain';
import { LocalPlanner, PathQueue } from './local-path';
import { contentQuestBook, type BotQuest } from './quest-plan';
import { WalkStore, type Spot, type WalkMap } from './walk-store';

export const SCHOOL = 'truong-hoc';
const TICK_S = 0.5;
/** A day the map's quests are what they are every day (no event on). */
const DAY = new Date(Date.UTC(2026, 9, 7, 3));

let school: { map: WalkMap; quests: readonly BotQuest[] } | null = null;

/** The school's walk grid and quests, read once. */
export function schoolMap(): { map: WalkMap; quests: readonly BotQuest[] } {
  if (!school) {
    const map = new WalkStore().get(SCHOOL);
    if (!map) throw new Error(`no walk grid for ${SCHOOL}`);
    school = { map, quests: contentQuestBook().questsOn(SCHOOL, DAY) };
  }
  return school;
}

export interface FleetBot {
  readonly id: string;
  readonly home: Spot;
  readonly brain: Brain;
  readonly body: BotBody;
}

export interface Fleet {
  readonly bots: readonly FleetBot[];
  /** The simulated time (ms). */
  now(): number;
  /** Lives `minutes` more, calling `each` after every tick. */
  run(minutes: number, each?: () => void): void;
}

export interface FleetOptions {
  /** The simulated time it starts at (ms; a fleet after a restart goes on from the one before). */
  startAt?: number;
  /** Seeds its bots' choices (`learn` by default, as learning.sim.test.ts). */
  seed?: string;
  /** Players each bot sees. */
  players?: (at: Spot) => readonly SeenPlayer[];
}

/** The first `count` of the school's bots, each knowing nothing yet. */
export function schoolFleet(count: number, options: FleetOptions = {}): Fleet {
  const { map, quests } = schoolMap();
  let clock = options.startAt ?? 0;
  const now = (): number => clock;
  const queue = new PathQueue(Infinity);
  const planner = new LocalPlanner();
  const bots = (BOT_MAP_CONFIGS[SCHOOL] ?? []).slice(0, count).map((profile): FleetBot => {
    const home = map.snap(profile.home, HOME_SNAP);
    if (!home) throw new Error(`${profile.id} has no spot near its home`);
    const persona = personaOf(profile.id);
    const random = seeded(hashOf(`${options.seed ?? 'learn'}:${profile.id}`));
    const players = options.players;
    const brain = new Brain({ map, home, persona, quests, random, now, planner, requestPlan: (run) => queue.request(`${profile.id}|way`, run), ...(players ? { players } : {}) });
    const body = new BotBody({ map, home, pace: { speed: persona.walk, sight: persona.sight }, chooser: brain, planner, requestPlan: (run) => queue.request(profile.id, run), now });
    return { id: profile.id, home, brain, body };
  });
  return {
    bots,
    now,
    run(minutes, each) {
      for (let t = 0; t < (minutes * 60) / TICK_S; t++) {
        clock += TICK_S * 1000;
        for (const bot of bots) bot.body.tick(TICK_S);
        queue.drain();
        each?.();
      }
    },
  };
}
