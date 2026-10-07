import { describe, expect, it } from 'vitest';
import type { WalkPlace } from '@miu/voxel/walk-cells';
import { hashOf, seeded } from '../bot-persona';
import { BotBody } from './body';
import { Brain, type BrainOptions, type Gesture, type SeenPlayer } from './brain';
import { LocalPlanner, PathQueue } from './local-path';
import type { BotQuest } from './quest-plan';
import { walksAlong } from './stepper';
import { drawnMap } from './walk-fixtures';
import type { Spot, WalkMap } from './walk-store';

const TICK_S = 0.5;
const place = (id: string, kind: WalkPlace['kind'], x: number, z: number): WalkPlace => ({ id, kind, at: [x + 0.5, 1, z + 0.5] });

/** A bot with a brain on `map`, run on a simulated clock. */
function harness(map: WalkMap, home: Spot, options: Partial<BrainOptions> = {}) {
  let clock = 0;
  const queue = new PathQueue(Infinity);
  const planner = new LocalPlanner();
  const doing: Array<string | null> = [];
  const gestures: Gesture[] = [];
  const news: Array<'found' | 'done'> = [];
  const persona = { sight: 16, walk: 3, curious: 0.5 };
  const brain = new Brain({
    map,
    home,
    persona,
    quests: [],
    random: seeded(hashOf('brain-test')),
    now: () => clock,
    planner,
    requestPlan: (run) => queue.request('way', run),
    events: { doing: (quest) => doing.push(quest), gesture: (emote) => gestures.push(emote), news: (kind) => news.push(kind) },
    ...options,
  });
  const body = new BotBody({ map, home, pace: { speed: persona.walk, sight: persona.sight }, chooser: brain, planner, requestPlan: (run) => queue.request('feet', run), now: () => clock });
  const walked: Spot[] = [home];
  const run = (seconds: number, until: () => boolean = () => false): void => {
    for (let t = 0; t < seconds / TICK_S && !until(); t++) {
      clock += TICK_S * 1000;
      body.tick(TICK_S);
      walked.push(...body.walkedNow);
      queue.drain();
    }
  };
  return { brain, body, doing, gestures, news, walked, run, now: () => clock };
}

describe("a bot's mind", () => {
  // An open yard of road with a wall across most of it: the quest's people stand on both sides.
  const rows = Array.from({ length: 80 }, (_, z) => Array.from({ length: 80 }, (_, x) => (z === 40 && x > 8 ? '#' : 'a')).join(''));
  const places = [place('nha', 'landmark', 6, 6), place('co-giao', 'npc', 70, 70), place('bac-bao-ve', 'npc', 12, 70), place('ghe-da', 'object', 40, 20)];
  const map = drawnMap(rows, { places });
  const quest: BotQuest = {
    id: 'bai-hoc',
    steps: [
      { id: 's1', targets: ['co-giao'], question: false },
      { id: 's2', targets: ['bac-bao-ve'], question: true },
      { id: 's3', targets: ['co-giao'], question: false },
    ],
  };

  it('starts knowing nothing, finds what its quest needs, does each step there, and goes back faster the next time', { timeout: 20_000 }, () => {
    const bot = harness(map, { x: 5, y: 1, z: 5 }, { quests: [quest] });
    expect(bot.brain.memory.places.size).toBe(0);
    expect(bot.doing).toEqual(['bai-hoc']);
    bot.run(1);
    // What it sees from home: only what lies within its sight.
    expect([...bot.brain.memory.places.keys()]).toEqual(['nha']);
    bot.run(30 * 60, () => bot.brain.metrics.stepsDone >= 3);
    expect(bot.brain.metrics.stepsDone).toBe(3);
    // Every step one the child's walk could take; never through the wall.
    expect(walksAlong(map, bot.walked)).toBe(true);
    // It waved at the people it did its steps with (thinking over the question instead), and cheered at its
    // question and at the end of the quest.
    expect(bot.gestures.filter((g) => g === 'wave').length).toBeGreaterThanOrEqual(2);
    expect(bot.gestures.filter((g) => g === 'cheer').length).toBeGreaterThanOrEqual(2);
    // News for a player who sees it: the two steps done where it had to go, then the quest finished.
    expect(bot.news).toEqual(['found', 'found', 'done']);
    // The quest done, it starts it again (the only one there is) and says so.
    expect(bot.doing.at(-1)).toBe('bai-hoc');
    expect(bot.brain.metrics.questsDone).toBe(1);
    // Its trips: the first to each person it had to look for or find a way to; back to the teacher, it knew both.
    const trips = bot.brain.metrics.trips;
    expect(trips.map((t) => [t.target, t.first])).toEqual([
      ['co-giao', true],
      ['bac-bao-ve', true],
      ['co-giao', false],
    ]);
    const efficiency = (i: number): number => (trips[i]?.straight ?? 0) / ((trips[i]?.seconds ?? 1) * 3);
    expect(efficiency(2)).toBeGreaterThan(efficiency(0));
    // What it learnt: the places it found, the ways it walked between them, the squares it walked.
    expect(bot.brain.memory.places.size).toBe(places.length);
    expect(bot.brain.memory.links.size).toBeGreaterThan(0);
    expect(bot.brain.memory.areasVisited).toBeGreaterThan(5);
    expect(bot.brain.memory.places.get('co-giao')?.q).toBeGreaterThan(0);
  });

  it('may choose to meet a player it sees: walks up to her, stays a moment, and goes back to its own plans', { timeout: 20_000 }, () => {
    let player: SeenPlayer | null = { id: 'p-1', x: 15.5, y: 1, z: 15.5 };
    const bot = harness(map, { x: 5, y: 1, z: 5 }, { players: (at, sight) => (player && Math.hypot(player.x - at.x, player.z - at.z) <= sight ? [player] : []) });
    // It values meeting highly here (a bot learns that from meetings that paid).
    bot.brain.bandits.meet = 5;
    bot.run(60, () => bot.brain.approaching !== null);
    expect(bot.brain.approaching).toBe('p-1');
    // Greeted while it walks over to meet her: that meeting is paid once, when it ends.
    bot.brain.metPlayer('p-1');
    expect(bot.brain.metrics.meets).toBe(0);
    bot.run(60, () => bot.brain.metrics.meets > 0);
    expect(bot.brain.metrics.meets).toBe(1);
    const at = bot.body.stepper.spot;
    expect(Math.hypot(at.x + 0.5 - 15.5, at.z + 0.5 - 15.5)).toBeLessThanOrEqual(5);
    // She walks off out of its sight: it does not follow her.
    player = { id: 'p-1', x: 75.5, y: 1, z: 75.5 };
    bot.brain.bandits.meet = -5;
    bot.run(20);
    expect(Math.hypot(bot.body.stepper.x - 75.5, bot.body.stepper.z - 75.5)).toBeGreaterThan(20);
    // A player it greets in passing is a meeting too.
    bot.brain.metPlayer('p-2');
    expect(bot.brain.metrics.meets).toBe(2);
  });

  it('in a party, heads for the targets of the party\'s step by its own way instead of its quest, then goes back to it', { timeout: 20_000 }, () => {
    const bot = harness(map, { x: 5, y: 1, z: 5 }, { quests: [quest] });
    bot.run(30);
    const ownStep = bot.brain.quests.step?.id;
    const ownDone = bot.brain.metrics.stepsDone;
    // The party plays another quest: its step's people are the guard (past the wall) and a place not on this map.
    bot.brain.share({ quest: 'nhom-hoc', targets: ['bac-bao-ve', 'khong-co'] });
    expect(bot.brain.questId).toBe('nhom-hoc');
    expect(bot.doing.at(-1)).toBe('nhom-hoc');
    expect(bot.brain.goal).toEqual({ quest: 'nhom-hoc', targets: ['bac-bao-ve'], reached: [] });
    bot.run(30 * 60, () => (bot.brain.goal?.reached.length ?? 0) > 0);
    expect(bot.brain.goal?.reached).toEqual(['bac-bao-ve']);
    // It got there on its own feet, by ways the child could walk, and was paid as for a step.
    const at = bot.body.stepper.spot;
    expect(Math.hypot(at.x + 0.5 - 12.5, at.z + 0.5 - 70.5)).toBeLessThanOrEqual(4);
    expect(walksAlong(map, bot.walked)).toBe(true);
    expect(bot.brain.metrics.stepsDone).toBe(ownDone + 1);
    // Its own quest waited where it was, and it goes back to it once the party's goal is gone.
    expect(bot.brain.quests.step?.id).toBe(ownStep);
    bot.brain.share(null);
    expect(bot.brain.questId).toBe('bai-hoc');
    expect(bot.doing.at(-1)).toBe('bai-hoc');
    expect(bot.brain.goal).toBeNull();
  });

  it('keeps away from where it got stuck, and stuck for good is put back at a place it knows', { timeout: 20_000 }, () => {
    // A pocket walled in all round, the bot inside: a place it sees outside it cannot get to.
    const pocket = Array.from({ length: 30 }, (_, z) => Array.from({ length: 30 }, (_, x) => ((x === 4 || x === 10) && z >= 4 && z <= 10) || ((z === 4 || z === 10) && x >= 4 && x <= 10) ? '#' : 'a').join(''));
    const walled = drawnMap(pocket, { places: [place('cay-da', 'landmark', 14, 7), place('ben', 'object', 20, 20)] });
    const bot = harness(walled, { x: 7, y: 1, z: 7 });
    bot.run(5 * 60, () => bot.brain.metrics.resets > 0);
    expect(bot.brain.metrics.resets).toBe(1);
    // Out of the pocket, next to the place it knew nearest.
    const { x, z } = bot.body.stepper.spot;
    expect(x > 10 || z > 10 || x < 4 || z < 4).toBe(true);
    expect(bot.brain.metrics.stuckSeconds).toBeGreaterThanOrEqual(20);
  });
});
