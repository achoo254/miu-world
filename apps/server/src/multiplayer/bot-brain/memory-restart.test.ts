// Bots kept across a server restart, on a real (in-memory) database: six of the school's bots learn for an hour and
// a few minutes, what they learnt is written out as the server stops, and the bots of the next run take it up and go
// on learning from there: they know the same places with the same values and the same quickest ways, so a trip
// they knew before is as quick after. How direct their trips to their quests are in the hour after the restart is
// printed next to the same bots living that hour without a restart and bots starting from nothing; what is asserted
// is that it beats starting from nothing. Against the hour without a restart it is printed only: which quests each
// bot draws in that hour weighs more than anything else (over seven pairs of seeds the hour after a restart was
// 0.69–1.57 times as direct as the hour without one, 1.16 on average; 0.80 with these), as learning.sim.test.ts
// found for its windows. The same seeds
// each time; nothing is kept after the test.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestDb, type DbHandle } from '../../db/client';
import { personaOf } from '../bot-persona';
import { dbBotStore } from '../bot-store';
import type { Trip } from './brain';
import { MemoryKeeper } from './memory-keeper';
import { SCHOOL, schoolFleet, schoolMap, type Fleet } from './school-fleet';

let handle: DbHandle;
beforeAll(async () => {
  handle = await createTestDb();
});
afterAll(async () => {
  await handle.close();
});

const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await new Promise<void>((resolve) => setImmediate(resolve));
};

async function live(fleet: Fleet, keeper: MemoryKeeper, minutes: number): Promise<void> {
  for (let m = 0; m < minutes; m++) {
    fleet.run(1, () => keeper.tick());
    await settle();
  }
}

/** Until every bot's memory is read: a few event-loop turns in-process (PGlite), a network round trip on Postgres. */
const allRead = (keeper: MemoryKeeper, fleet: Fleet): Promise<void> =>
  vi.waitFor(() => {
    for (const bot of fleet.bots) expect(keeper.ready(bot.id), bot.id).toBe(true);
  }, { timeout: 10_000, interval: 5 });

const keepAll = (keeper: MemoryKeeper, fleet: Fleet): void => {
  for (const bot of fleet.bots) keeper.attach({ key: bot.id, botId: bot.id, mapId: SCHOOL, map: schoolMap().map, brain: bot.brain, shared: false });
};

/** Straight distance over the distance walked at each bot's pace, over trips (Σ straight ÷ Σ time · speed). */
function efficiency(trips: ReadonlyArray<{ trip: Trip; speed: number }>): number {
  const walked = trips.reduce((s, t) => s + t.trip.seconds * t.speed, 0);
  return walked > 0 ? trips.reduce((s, t) => s + t.trip.straight, 0) / walked : 0;
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

describe('bots kept across a server restart', () => {
  // Four runs of six bots for 65 simulated minutes each (some 63,000 bot ticks) and their writes to PGlite: about
  // 10 s on a dev machine; the limit leaves room for a slow CI runner.
  it('know the same places with the same values after it, keep learning, and get to their quests faster than from nothing', { timeout: 120_000 }, async () => {
    const store = dbBotStore(handle.db);
    const MINUTES = 65;
    const before = schoolFleet(6);
    const keeper = new MemoryKeeper(store, before.now);
    keepAll(keeper, before);
    await allRead(keeper, before);
    await live(before, keeper, MINUTES);
    // The server stops: whatever each learnt since its last write is written out.
    await keeper.flush();
    const stoppedAt = before.now();

    // The next run, on the same database: the same bots, choosing anew.
    const after = schoolFleet(6, { startAt: stoppedAt, seed: 'after' });
    const restarted = new MemoryKeeper(store, after.now);
    keepAll(restarted, after);
    await allRead(restarted, after);
    for (const [i, bot] of after.bots.entries()) {
      const was = before.bots[i]?.brain;
      if (!was) throw new Error('no bot before');
      expect(restarted.ready(bot.id)).toBe(true);
      expect([...bot.brain.memory.places.keys()]).toEqual([...was.memory.places.keys()]);
      for (const [id, p] of was.memory.places) expect(bot.brain.memory.places.get(id)?.q).toBeCloseTo(p.q, 4);
      expect(bot.brain.memory.links.size).toBe(was.memory.links.size);
      // The quickest known way to every place it can reach from one, as quick as before.
      const from = [...was.memory.places.keys()].find((id) => was.memory.linksFrom(id).length > 0) ?? '';
      const reachBefore = was.memory.reach([{ id: from, cost: 0 }]);
      const reachAfter = bot.brain.memory.reach([{ id: from, cost: 0 }]);
      expect(reachAfter.size).toBe(reachBefore.size);
      for (const [id, r] of reachBefore) expect(reachAfter.get(id)?.cost ?? Infinity).toBeLessThanOrEqual(r.cost * 1.001 + 0.05 * was.memory.route(reachBefore, id).length);
      expect(bot.brain.memory.shortcuts).toBe(was.memory.shortcuts);
      expect(bot.brain.metrics.history.map((h) => h.hour)).toEqual(was.metrics.history.map((h) => h.hour));
      expect(bot.brain.metrics.stepsDone).toBe(was.metrics.stepsDone);
    }
    const mark = after.bots.map((b) => ({ trips: b.brain.metrics.tripsTotal, steps: b.brain.metrics.stepsDone }));
    const placesAtStop = after.bots.map((b) => b.brain.memory.places.size);
    await live(after, restarted, MINUTES);
    await restarted.flush();

    // The yardsticks: the bots before it living on as if there was no restart, and the bots after it (the same
    // seeds) starting from nothing.
    before.run(MINUTES);
    const fresh = schoolFleet(6, { startAt: stoppedAt, seed: 'after' });
    fresh.run(MINUTES);

    const tripsOf = (fleet: Fleet, from: number, to: number): Array<{ trip: Trip; speed: number }> =>
      fleet.bots.flatMap((b) => b.brain.metrics.trips.filter((t) => t.startedAt >= from && t.startedAt < to).map((trip) => ({ trip, speed: personaOf(b.id).walk })));
    const hour = (fleet: Fleet): Array<{ trip: Trip; speed: number }> => tripsOf(fleet, stoppedAt, stoppedAt + 60 * 60_000);
    const lastBefore = before.bots.flatMap((b) => b.brain.metrics.trips.filter((t) => t.startedAt < stoppedAt).slice(-1).map((trip) => ({ trip, speed: personaOf(b.id).walk })));
    const firstAfter = after.bots.flatMap((b) => b.brain.metrics.trips.filter((t) => t.startedAt >= stoppedAt).slice(0, 1).map((trip) => ({ trip, speed: personaOf(b.id).walk })));
    const numbers = {
      hourAfterRestart: { trips: hour(after).length, efficiency: round(efficiency(hour(after))) },
      hourWithoutRestart: { trips: hour(before).length, efficiency: round(efficiency(hour(before))) },
      hourFromNothing: { trips: hour(fresh).length, efficiency: round(efficiency(hour(fresh))) },
      lastTripBefore: round(efficiency(lastBefore)),
      firstTripAfter: round(efficiency(firstAfter)),
      places: after.bots.map((b) => b.brain.memory.places.size),
      links: after.bots.map((b) => b.brain.memory.links.size),
      hours: after.bots.map((b) => b.brain.metrics.history.map((h) => h.hour)),
    };
    console.log(JSON.stringify(numbers));

    // More direct to its quests than from nothing: what it learnt came through (seven pairs of seeds: 1.11–2.10 times; 1.26 with these).
    expect(efficiency(hour(after))).toBeGreaterThan(1.1 * efficiency(hour(fresh)));
    for (const [i, bot] of after.bots.entries()) {
      // It keeps learning: never knows less, its hours count on, it does more of its quests.
      expect(bot.brain.memory.places.size).toBeGreaterThanOrEqual(placesAtStop[i] ?? Infinity);
      expect(bot.brain.metrics.history.map((h) => h.hour)).toEqual([1, 2]);
      expect(bot.brain.metrics.stepsDone).toBeGreaterThan(mark[i]?.steps ?? Infinity);
      expect(bot.brain.metrics.tripsTotal).toBeGreaterThan(mark[i]?.trips ?? Infinity);
    }
  });
});
