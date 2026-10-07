import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { hashOf, personaOf, seeded } from '../bot-persona';
import { Brain, type BrainSnapshot } from './brain';
import { LocalPlanner } from './local-path';
import { decodeMemory, encodeMemory, MEMORY_BYTES_MAX, storedBytes, type StoredMemory } from './memory-codec';
import { LINK_POINTS, MAX_LINKS, MAX_PLACES, MAX_POINTS } from './memory-graph';
import { schoolFleet, schoolMap } from './school-fleet';

/** A player's public id as the hub hands them out. */
const PLAYER = 'p-0123456789ab';

/** Two of the school's bots after 40 simulated minutes; the first meets a player standing near its home. */
const learnt = (() => {
  let fleet: ReturnType<typeof schoolFleet> | null = null;
  return () => {
    if (!fleet) {
      const near = schoolFleet(1).bots[0]?.home ?? { x: 0, y: 0, z: 0 };
      const player = { id: PLAYER, x: near.x + 6.5, y: near.y, z: near.z + 0.5 };
      fleet = schoolFleet(2, { players: (at) => (Math.hypot(at.x - player.x, at.z - player.z) <= 20 ? [player] : []) });
      // The first one is keen on meeting her (as a bot that learnt meetings pay).
      const first = fleet.bots[0];
      if (first) first.brain.bandits.meet = 5;
      fleet.run(40);
    }
    return fleet;
  };
})();

const columnsOf = (stored: StoredMemory): Record<string, unknown> => JSON.parse(inflateRawSync(Buffer.from(stored.z, 'base64')).toString('utf8')) as Record<string, unknown>;
const storedWith = (columns: unknown): StoredMemory => ({ v: 1, z: deflateRawSync(JSON.stringify(columns)).toString('base64') });

/** A fresh school bot (as after a restart). */
function freshBrain(id: string): Brain {
  const { map, quests } = schoolMap();
  const home = map.snap({ x: map.sx / 2, y: 20, z: map.sz / 2 }, 40) ?? { x: 0, y: 0, z: 0 };
  return new Brain({ map, home, persona: personaOf(id), quests, random: seeded(hashOf(id)), now: () => 0, planner: new LocalPlanner(), requestPlan: () => {} });
}

describe("a bot's memory written out and read back", () => {
  it('reads back what it wrote: the same places, values, ways, squares and numbers', { timeout: 60_000 }, () => {
    for (const bot of learnt().bots) {
      const snapshot = bot.brain.snapshot();
      expect(snapshot.graph.places.length).toBeGreaterThan(50);
      expect(snapshot.graph.links.length).toBeGreaterThan(20);
      const stored = encodeMemory(snapshot);
      expect(storedBytes(stored)).toBeLessThanOrEqual(MEMORY_BYTES_MAX);
      const back = decodeMemory(JSON.parse(JSON.stringify(stored)));

      expect(back.graph.places.map((p) => [p.id, p.visits])).toEqual(snapshot.graph.places.map((p) => [p.id, p.visits]));
      back.graph.places.forEach((p, i) => {
        const was = snapshot.graph.places[i];
        expect(Math.abs(p.q - (was?.q ?? NaN))).toBeLessThanOrEqual(5e-5);
        expect(Math.abs(p.firstSeenAt - (was?.firstSeenAt ?? NaN))).toBeLessThanOrEqual(500);
      });
      expect(back.graph.links.map((l) => [l.a, l.b, l.points, l.walks, l.found])).toEqual(snapshot.graph.links.map((l) => [l.a, l.b, l.points, l.walks, l.found]));
      back.graph.links.forEach((l, i) => {
        const was = snapshot.graph.links[i];
        expect(Math.abs(l.cost - (was?.cost ?? NaN))).toBeLessThanOrEqual(0.05 + 1e-9);
        expect(Math.abs(l.length - (was?.length ?? NaN))).toBeLessThanOrEqual(0.05 + 1e-9);
      });
      expect(back.graph.areas).toEqual(snapshot.graph.areas);
      expect([back.graph.shortcuts, back.graph.seenWays]).toEqual([snapshot.graph.shortcuts, snapshot.graph.seenWays]);
      for (const key of ['explore', 'meet', 'rest', 'ride'] as const) expect(back.bandits[key]).toBeCloseTo(snapshot.bandits[key], 4);
      expect(back.detour).toBeCloseTo(snapshot.detour, 4);
      const { trips, history, stuckSeconds, rewardThisHour, rewardPerHour, ...counts } = snapshot.metrics;
      expect(back.metrics).toMatchObject(counts);
      expect(back.metrics.stuckSeconds).toBeCloseTo(stuckSeconds, 1);
      expect(back.metrics.rewardThisHour).toBeCloseTo(rewardThisHour, 2);
      expect(back.metrics.rewardPerHour).toBeCloseTo(rewardPerHour, 2);
      expect(back.metrics.trips.map((t) => [t.target, t.first])).toEqual(trips.map((t) => [t.target, t.first]));
      expect(back.metrics.history).toHaveLength(history.length);
      // What it reads back writes out the very same way again.
      expect(encodeMemory(back)).toEqual(stored);

      // A bot that takes it up knows the same places with the same values and the same quickest ways between them.
      const brain = freshBrain(bot.id);
      brain.restore(back);
      expect([...brain.memory.places.keys()]).toEqual([...bot.brain.memory.places.keys()]);
      for (const [id, place] of bot.brain.memory.places) expect(brain.memory.places.get(id)?.q).toBeCloseTo(place.q, 4);
      expect(brain.memory.links.size).toBe(bot.brain.memory.links.size);
      expect(brain.memory.areasVisited).toBe(bot.brain.memory.areasVisited);
      const from = [...bot.brain.memory.places.keys()].find((id) => bot.brain.memory.linksFrom(id).length > 0) ?? '';
      const before = bot.brain.memory.reach([{ id: from, cost: 0 }]);
      const after = brain.memory.reach([{ id: from, cost: 0 }]);
      expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
      for (const [id, reach] of before) expect(Math.abs((after.get(id)?.cost ?? Infinity) - reach.cost)).toBeLessThanOrEqual(0.05 * (bot.brain.memory.route(before, id).length + 1));
    }
  });

  it('keeps nothing of a player: no public id, no uuid, only that it met someone', { timeout: 60_000 }, () => {
    const bot = learnt().bots[0];
    expect(bot?.brain.metrics.meets).toBeGreaterThan(0);
    const stored = bot ? encodeMemory(bot.brain.snapshot()) : null;
    const text = `${JSON.stringify(stored)}${stored ? JSON.stringify(columnsOf(stored)) : ''}`;
    expect(text).not.toContain(PLAYER);
    expect(text).not.toMatch(/p-[0-9a-f]{12}/);
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it('fits in 32 KB however full: the longest ways thinned first, then the least walked let go of', () => {
    const random = seeded(hashOf('full-memory'));
    const int = (n: number): number => Math.floor(random() * n);
    const perLink = Math.floor(MAX_POINTS / MAX_LINKS);
    const full: BrainSnapshot = {
      graph: {
        places: Array.from({ length: MAX_PLACES }, (_, i) => ({ id: `a-long-place-name-${i}`, firstSeenAt: int(9e9), visits: int(50), q: random() * 4 - 1, lastReward: random() })),
        links: Array.from({ length: MAX_LINKS }, (_, i) => ({
          a: `a-long-place-name-${i % MAX_PLACES}`,
          b: `a-long-place-name-${(i + 1 + Math.floor(i / MAX_PLACES)) % MAX_PLACES}`,
          points: Array.from({ length: perLink * 3 }, (_, k) => (k % 3 === 1 ? 1 + int(60) : int(800))),
          length: random() * 300,
          cost: random() * 200,
          walks: i % 10,
          found: i % 3 === 0 ? 'shortcut' : 'walked',
          firstS: random() * 200,
          thirdS: i % 2 ? null : random() * 200,
        })),
        areas: Array.from({ length: 313 }, () => int(256)),
        shortcuts: 900,
        seenWays: 300,
      },
      bandits: { explore: 0.5, meet: 0.6, rest: -0.1, ride: 0.2 },
      detour: 1.7,
      metrics: {
        trips: Array.from({ length: 50 }, (_, i) => ({ target: `a-long-place-name-${i}`, first: i % 2 === 0, seconds: random() * 300, straight: random() * 200, startedAt: i * 60_000, at: i * 60_000 + 30_000 })),
        tripsTotal: 400,
        stuck: 90,
        stuckSeconds: 1234.5,
        resets: 3,
        skipped: 7,
        questsDone: 12,
        stepsDone: 80,
        meets: 20,
        rewardThisHour: 3.25,
        rewardPerHour: 12.5,
        history: Array.from({ length: 72 }, (_, h) => ({ hour: h + 1, at: (h + 1) * 3_600_000, placesKnown: 200, linksKnown: 600, shortcuts: h * 10, areasVisited: 300, efficiency: 0.42, stuckSeconds: h * 10, skipped: h, reward: 10.5 })),
      },
    };
    expect(storedBytes(encodeMemory(full, Infinity))).toBeGreaterThan(MEMORY_BYTES_MAX);
    const stored = encodeMemory(full);
    expect(storedBytes(stored)).toBeLessThanOrEqual(MEMORY_BYTES_MAX);
    const back = decodeMemory(stored);
    // Every place, its numbers and its hours stay; the ways were thinned before any was let go of.
    expect(back.graph.places).toHaveLength(MAX_PLACES);
    expect(back.metrics.history).toHaveLength(72);
    expect(back.metrics.trips).toHaveLength(50);
    const kept = back.graph.links;
    expect(kept.length).toBeGreaterThan(0);
    for (const link of kept) expect(link.points.length / 3).toBeLessThanOrEqual(Math.min(LINK_POINTS, perLink));
    if (kept.length < MAX_LINKS) {
      // Ways went: none kept has more than 4 points, and the ones that went were the least walked.
      for (const link of kept) expect(link.points.length / 3).toBeLessThanOrEqual(4);
      const leastKept = Math.min(...kept.map((l) => l.walks));
      const gone = full.graph.links.filter((l) => !kept.some((k) => k.a === l.a && k.b === l.b));
      expect(Math.max(...gone.map((l) => l.walks))).toBeLessThanOrEqual(leastKept);
    }
  });

  it('starts afresh on anything broken: a wrong format, broken data, numbers that do not agree', { timeout: 60_000 }, () => {
    const stored = encodeMemory(learnt().bots[1]?.brain.snapshot() ?? freshBrain('bot-th-1').snapshot());
    const columns = columnsOf(stored) as { p: { q: number[] }; l: { a: number[]; pts: string } };
    const broken: unknown[] = [
      null,
      'memory',
      {},
      { v: 2, z: stored.z },
      { ...stored, extra: 1 },
      { v: 1, z: 'not base64!' },
      { v: 1, z: deflateRawSync('not json').toString('base64') },
      { v: 1, z: Buffer.from('not deflated').toString('base64') },
      storedWith({ ...columns, p: { ...columns.p, q: columns.p.q.slice(1) } }),
      storedWith({ ...columns, l: { ...columns.l, a: columns.l.a.map(() => 9_999) } }),
      storedWith({ ...columns, l: { ...columns.l, pts: columns.l.pts.slice(0, -8) } }),
      storedWith({ ...columns, l: { ...columns.l, pts: Buffer.concat([Buffer.from(columns.l.pts, 'base64'), Buffer.from([1, 2])]).toString('base64') } }),
    ];
    for (const raw of broken) expect(() => decodeMemory(raw)).toThrow();
    expect(() => decodeMemory(storedWith(columns))).not.toThrow();
  });
});
