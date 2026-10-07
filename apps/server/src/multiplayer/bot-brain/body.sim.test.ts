// Ten minutes of the school's bots wandering its real walk grid on their own (seeded, simulated clock): every step
// one the child's walk could take, never standing where nobody stands, and seldom stuck.
import { describe, expect, it } from 'vitest';
import { hashOf, personaOf, seeded } from '../bot-persona';
import { BOT_MAP_CONFIGS, HOME_SNAP } from '../bot-profiles';
import { BotBody } from './body';
import { LocalPlanner, PathQueue } from './local-path';
import { walksAlong } from './stepper';
import { wanderChooser } from './wander';
import { WalkStore } from './walk-store';

const MAP = 'truong-hoc';
const TICK_S = 0.1;
const MINUTES = 10;

describe('bots wandering on their own feet', () => {
  it('walk only steps the child could take, and spend under 5% of their time stuck', () => {
    const map = new WalkStore().get(MAP);
    if (!map) throw new Error(`no walk grid for ${MAP}`);
    let clock = 0;
    const queue = new PathQueue(4);
    const planner = new LocalPlanner();
    const bodies = (BOT_MAP_CONFIGS[MAP] ?? []).map((profile) => {
      const home = map.snap(profile.home, HOME_SNAP);
      if (!home) throw new Error(`${profile.id} has no spot near its home`);
      const persona = personaOf(profile.id);
      return new BotBody({
        map,
        home,
        pace: { speed: persona.walk, sight: persona.sight },
        chooser: wanderChooser(seeded(hashOf(`sim:${profile.id}`))),
        planner,
        requestPlan: (run) => queue.request(profile.id, run),
        now: () => clock,
      });
    });
    expect(bodies.length).toBeGreaterThan(5);
    const walked = bodies.map((b) => [b.stepper.spot]);
    const seen = bodies.map(() => new Set<number>());
    const ticks = (MINUTES * 60) / TICK_S;
    for (let t = 0; t < ticks; t++) {
      clock += TICK_S * 1000;
      bodies.forEach((body, i) => {
        const { stepper } = body;
        const wasRiding = stepper.riding;
        body.tick(TICK_S);
        // Its body is over a spot of the column under it, at that spot's height.
        expect(map.standAt(Math.floor(stepper.x), stepper.y, Math.floor(stepper.z))).not.toBe(0);
        const trace = stepper.takeTrace();
        // A ride puts it down elsewhere: its way starts again from there.
        if (wasRiding && !stepper.riding) walked[i] = [stepper.spot];
        walked[i]?.push(...trace);
        for (const cell of trace) seen[i]?.add(cell.x + cell.z * map.sx);
      });
      queue.drain();
      // Every step of every bot's way so far: a step from the one before.
      if (t % 600 === 599) for (const way of walked) expect(walksAlong(map, way)).toBe(true);
    }
    for (const way of walked) expect(walksAlong(map, way)).toBe(true);
    const totalMs = bodies.length * MINUTES * 60_000;
    const stuckMs = bodies.reduce((sum, b) => sum + b.stepper.stats.stuckMs, 0);
    expect(stuckMs / totalMs).toBeLessThan(0.05);
    // They do wander: each has walked dozens of columns of its own.
    for (const columns of seen) expect(columns.size).toBeGreaterThan(50);
  });
});
