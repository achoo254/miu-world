import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryBotStore } from '../bot-store';
import { decodeMemory, encodeMemory } from './memory-codec';
import { MemoryKeeper, SAVE_EVERY_MS } from './memory-keeper';
import { SCHOOL, schoolFleet, schoolMap, type Fleet, type FleetBot } from './school-fleet';

/** Lets the store's promises settle (reads and writes are async, even in memory). */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

/** Lives `minutes` in steps of 10 s, the keeper's turn after every tick and its writes settled after every step. */
async function live(fleet: Fleet, keeper: MemoryKeeper, minutes: number): Promise<void> {
  for (let s = 0; s < minutes * 6; s++) {
    fleet.run(1 / 6, () => keeper.tick());
    await settle();
  }
}

const keep = (keeper: MemoryKeeper, bot: FleetBot, key = bot.id, shared = false): void =>
  keeper.attach({ key, botId: bot.id, mapId: SCHOOL, map: schoolMap().map, brain: bot.brain, shared });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("keeping a bot's memory of a map", () => {
  it('reads it before the bot walks, then writes it at most every two minutes at its own moment, only when it learnt something', async () => {
    const store = memoryBotStore();
    const writes: Array<{ bot: string; at: number }> = [];
    const fleet = schoolFleet(2);
    const save = store.saveWorldMemory.bind(store);
    store.saveWorldMemory = async (botId, mapId, gridVersion, memory) => {
      writes.push({ bot: botId, at: fleet.now() });
      await save(botId, mapId, gridVersion, memory);
    };
    const keeper = new MemoryKeeper(store, fleet.now);
    for (const bot of fleet.bots) keep(keeper, bot);
    expect(fleet.bots.map((b) => keeper.ready(b.id))).toEqual([false, false]);
    await settle();
    expect(fleet.bots.map((b) => keeper.ready(b.id))).toEqual([true, true]);
    await live(fleet, keeper, 7);
    for (const bot of fleet.bots) {
      const times = writes.filter((w) => w.bot === bot.id).map((w) => w.at);
      expect(times.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < times.length; i++) expect((times[i] ?? 0) - (times[i - 1] ?? 0)).toBeGreaterThanOrEqual(SAVE_EVERY_MS - 10_000);
    }
    // Each at its own moment (bot-th-1 some 97 s into each two minutes, bot-th-2 some 75 s).
    const firsts = fleet.bots.map((b) => writes.find((w) => w.bot === b.id)?.at);
    expect(firsts[0]).not.toBe(firsts[1]);
    // What is stored is what it knows, under the bot's own id and the grid it learnt on.
    const row = store.worlds.get(`${fleet.bots[0]?.id}|${SCHOOL}`);
    expect(row?.gridVersion).toMatch(/^[0-9a-f]{64}$/);
    // Nothing learnt since its last write (it stands still): nothing written.
    const count = writes.length;
    await keeper.flush();
    const before = writes.length;
    expect(before).toBeGreaterThanOrEqual(count);
    await keeper.flush();
    expect(writes.length).toBe(before);
  });

  it('tries a failed write again at its next turn, and the bot goes on meanwhile', async () => {
    const store = memoryBotStore();
    const fleet = schoolFleet(1);
    const bot = fleet.bots[0] as FleetBot;
    const save = store.saveWorldMemory.bind(store);
    let fail = 1;
    store.saveWorldMemory = async (...args) => {
      if (fail-- > 0) throw new Error('database away');
      await save(...args);
    };
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const keeper = new MemoryKeeper(store, fleet.now);
    keep(keeper, bot);
    await settle();
    // Its turn comes some 97 s into each two minutes: the first write fails, the next one (at ~217 s) goes through.
    await live(fleet, keeper, 2.5);
    expect(errors).toHaveBeenCalledWith('bot memory not saved', bot.id, SCHOOL, 'Error');
    expect(store.worlds.size).toBe(0);
    await live(fleet, keeper, 2);
    expect(store.worlds.size).toBe(1);
    expect(bot.brain.memory.places.size).toBeGreaterThan(0);
  });

  it('takes up a memory learnt on another walk grid with its places and values, not its ways', async () => {
    const store = memoryBotStore();
    const before = schoolFleet(1);
    before.run(20);
    const learnt = before.bots[0] as FleetBot;
    expect(learnt.brain.memory.links.size).toBeGreaterThan(0);
    await store.saveWorldMemory(learnt.id, SCHOOL, 'a-grid-made-before', encodeMemory(learnt.brain.snapshot()));
    const after = schoolFleet(1, { startAt: before.now() });
    const bot = after.bots[0] as FleetBot;
    const keeper = new MemoryKeeper(store, after.now);
    keep(keeper, bot);
    await settle();
    expect([...bot.brain.memory.places.keys()]).toEqual([...learnt.brain.memory.places.keys()]);
    for (const [id, p] of learnt.brain.memory.places) expect(bot.brain.memory.places.get(id)?.q).toBeCloseTo(p.q, 4);
    expect(bot.brain.memory.links.size).toBe(0);
    expect(bot.brain.memory.areasVisited).toBe(0);
    expect(bot.brain.metrics.stepsDone).toBe(learnt.brain.metrics.stepsDone);
    // Written again, it is a memory of this grid.
    await live(after, keeper, 5);
    expect(store.worlds.get(`${bot.id}|${SCHOOL}`)?.gridVersion).toBe(schoolMap().map.sources);
  });

  it('starts afresh from a memory it cannot read, logs only what went wrong, and its next write replaces it', async () => {
    const store = memoryBotStore();
    const secret = 'p-0123456789ab';
    store.worlds.set(`bot-th-1|${SCHOOL}`, { gridVersion: 'x', memory: JSON.stringify({ v: 1, z: secret }) });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fleet = schoolFleet(1);
    const bot = fleet.bots[0] as FleetBot;
    expect(bot.id).toBe('bot-th-1');
    const keeper = new MemoryKeeper(store, fleet.now);
    keep(keeper, bot);
    await settle();
    expect(keeper.ready(bot.id)).toBe(true);
    expect(bot.brain.memory.places.size).toBe(0);
    expect(errors).toHaveBeenCalledWith('bot memory unreadable, starting afresh', bot.id, SCHOOL, expect.any(String));
    expect(JSON.stringify(errors.mock.calls)).not.toContain(secret);
    await live(fleet, keeper, 3);
    await keeper.flush();
    const row = store.worlds.get(`${bot.id}|${SCHOOL}`);
    expect(decodeMemory(JSON.parse(row?.memory ?? 'null')).graph.places.length).toBe(bot.brain.memory.places.size);
  });

  it("merges a bot's instances in two homes into one memory, each counted once, under the bot's own id", async () => {
    const store = memoryBotStore();
    const homeA = schoolFleet(1, { seed: 'home-a' });
    const homeB = schoolFleet(1, { seed: 'home-b' });
    const a = homeA.bots[0] as FleetBot;
    const b = homeB.bots[0] as FleetBot;
    const keeper = new MemoryKeeper(store, homeA.now);
    keep(keeper, a, `${SCHOOL}#p-aaaaaaaaaaaa|${a.id}@p-aaaaaaaaaaaa`, true);
    keep(keeper, b, `${SCHOOL}#p-bbbbbbbbbbbb|${b.id}@p-bbbbbbbbbbbb`, true);
    await settle();
    homeA.run(15);
    homeB.run(25);
    await keeper.detach(`${SCHOOL}#p-aaaaaaaaaaaa|${a.id}@p-aaaaaaaaaaaa`);
    await keeper.detach(`${SCHOOL}#p-bbbbbbbbbbbb|${b.id}@p-bbbbbbbbbbbb`);
    expect([...store.worlds.keys()]).toEqual([`${a.id}|${SCHOOL}`]);
    const merged = decodeMemory(JSON.parse(store.worlds.get(`${a.id}|${SCHOOL}`)?.memory ?? 'null'));
    const union = new Set([...a.brain.memory.places.keys(), ...b.brain.memory.places.keys()]);
    expect(merged.graph.places.length).toBe(Math.min(200, union.size));
    expect(merged.metrics.stepsDone).toBe(a.brain.metrics.stepsDone + b.brain.metrics.stepsDone);
    expect(merged.metrics.tripsTotal).toBe(a.brain.metrics.tripsTotal + b.brain.metrics.tripsTotal);
    for (const p of merged.graph.places) {
      const visits = (a.brain.memory.places.get(p.id)?.visits ?? 0) + (b.brain.memory.places.get(p.id)?.visits ?? 0);
      expect(p.visits).toBe(visits);
    }
    // Another home opening later: its instance starts from what both learnt.
    const homeC = schoolFleet(1, { seed: 'home-c', startAt: homeB.now() });
    const c = homeC.bots[0] as FleetBot;
    keep(keeper, c, `${SCHOOL}#p-cccccccccccc|${c.id}@p-cccccccccccc`, true);
    await settle();
    expect(c.brain.memory.places.size).toBe(merged.graph.places.length);
    expect(c.brain.metrics.stepsDone).toBe(merged.metrics.stepsDone);
  });
});
