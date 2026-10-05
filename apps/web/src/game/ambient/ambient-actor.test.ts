import { describe, expect, it } from 'vitest';
import { AMBIENT_ROUTINES } from '@miu/voxel/world-entities';
import { AmbientActor, pickChore, type ActorContext } from './ambient-actor';
import { AMBIENT_LINES } from './ambient-lines';
import { ROUTINES, spotsUsed } from './ambient-routines';
import type { Chore, RoutineSpec, Speech, Vec3 } from './ambient-types';

/** mulberry32: the same sequence every run. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ctx = (extra: Partial<ActorContext> = {}): ActorContext => ({
  player: null,
  groundY: () => 10,
  reduced: false,
  clipSeconds: () => 1,
  ...extra,
});

function actorFor(routine: keyof typeof ROUTINES, seed = 1): AmbientActor {
  const spots = Object.fromEntries(spotsUsed(ROUTINES[routine]).map((name, i): [string, Vec3] => [name, [5 + i, 10, 5 + i * 0.5]]));
  return new AmbientActor(routine, ROUTINES[routine], [0, 10, 0], 0, spots, seeded(seed));
}

/** Runs an actor for `seconds` in 1/30 s steps, collecting every chore it starts and every line it says. */
function live(actor: AmbientActor, seconds: number, context: ActorContext = ctx()) {
  const speech: Speech[] = [];
  const frames = [];
  for (let t = 0; t < seconds; t += 1 / 30) {
    const step = actor.step(1 / 30, context);
    if (step.speech) speech.push(step.speech);
    frames.push(step.frame);
  }
  return { speech, frames };
}

describe('ambient routines', () => {
  it('cover every routine the maps may place, each with three or more chores and pools that exist', () => {
    expect(Object.keys(ROUTINES).sort()).toEqual([...AMBIENT_ROUTINES].sort());
    for (const [name, spec] of Object.entries(ROUTINES) as Array<[string, RoutineSpec]>) {
      if (spec.kind !== 'swimmer') expect(spec.chores.length, name).toBeGreaterThanOrEqual(3);
      const beats = [...spec.chores, ...spec.react, ...spec.celebrate].flatMap((c) => c.beats);
      // Everyone who can be seen cheers a finished quest; a fish that only leaps now and then may not.
      if (spec.kind !== 'swimmer') expect(spec.celebrate.length, `${name} celebrates`).toBeGreaterThan(0);
      const pools = [spec.greet.pool, ...beats.flatMap((b) => (b.do === 'say' ? [b.pool, ...(b.reply ? [b.reply] : [])] : []))];
      for (const pool of pools) expect(AMBIENT_LINES[pool]?.length ?? 0, `${name} pool ${pool}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps every line short enough to read while walking', () => {
    for (const [pool, lines] of Object.entries(AMBIENT_LINES)) {
      for (const line of lines) expect(line.split(/\s+/).length, `${pool}: ${line}`).toBeLessThanOrEqual(8);
    }
  });
});

describe('pickChore', () => {
  it('never picks the same chore twice in a row, yet follows the weights', () => {
    const chores: Chore[] = [
      { id: 'a', weight: 4, beats: [] },
      { id: 'b', weight: 1, beats: [] },
      { id: 'c', weight: 1, beats: [] },
    ];
    const random = seeded(7);
    let last: Chore | null = null;
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 600; i++) {
      const next = pickChore(chores, last, random);
      expect(next).not.toBe(last);
      if (next) counts[next.id] = (counts[next.id] ?? 0) + 1;
      last = next;
    }
    expect(counts.a).toBeGreaterThan(counts.b ?? 0);
  });
});

describe('AmbientActor', () => {
  it('works through several different chores, standing on the ground it walks over', () => {
    const actor = actorFor('woodcutter');
    const { frames } = live(actor, 120, ctx({ groundY: (x) => 10 + x * 0.1 }));
    const clips = new Set(frames.map((f) => f.clip));
    for (const clip of ['walk', 'attack-melee-right', 'sit', 'pick-up']) expect(clips).toContain(clip);
    expect(new Set(frames.map((f) => f.pose))).toContain('wipe-sweat');
    for (const f of frames.filter((f) => f.clip === 'walk')) expect(f.position[1]).toBeCloseTo(10 + f.position[0] * 0.1, 5);
  });

  it('stops for the child, greets once per visit, and goes back to its chore when she leaves', () => {
    const actor = actorFor('gardener', 3);
    live(actor, 8);
    const near = ctx({ player: { ...{ x: actor.position[0] + 2, y: actor.position[1], z: actor.position[2] } } });
    const visit = live(actor, 4, near);
    expect(visit.speech.map((s) => s.pool)).toEqual(['gardener-greet']);
    expect(visit.frames.at(-1)?.clip).toBe('idle');
    // She has been noticed: the character faces her.
    const last = visit.frames.at(-1);
    const toChild = Math.atan2(2, 0);
    expect(Math.abs((last?.yaw ?? 0) - toChild)).toBeLessThan(0.05);
    const far = ctx({ player: { x: 500, y: 10, z: 500 } });
    live(actor, 3, far);
    // Back within ten seconds: no second greeting yet.
    expect(live(actor, 1, near).speech).toEqual([]);
    expect(live(actor, 20, far).frames.some((f) => f.clip !== 'idle')).toBe(true);
  });

  it('reacts to a tap with a line, then returns to work', () => {
    const actor = actorFor('cook', 5);
    live(actor, 5);
    expect(actor.react()).toBe(true);
    expect(actor.react()).toBe(false); // already reacting
    const { speech } = live(actor, 6);
    expect(speech[0]?.pool).toBe('cook-chat');
    expect(actor.canReact).toBe(true);
  });

  it('never taps a fish, and keeps it hidden except mid-leap', () => {
    const fish = actorFor('fish', 9);
    expect(fish.react()).toBe(false);
    const { frames } = live(fish, 40);
    const shown = frames.filter((f) => f.visible);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(frames.length / 2);
    for (const f of shown) expect(f.position[1]).toBeGreaterThan(9);
  });

  it('beats its wings climbing and glides coming down; a bee always buzzes', () => {
    const { frames } = live(actorFor('parrot', 2), 90);
    const flying = frames.filter((f) => f.wings !== 'folded');
    expect(flying.some((f) => f.wings === 'flap')).toBe(true);
    expect(flying.some((f) => f.wings === 'glide')).toBe(true);
    expect(frames.some((f) => f.wings === 'folded')).toBe(true); // perched sometimes
    // Glides are short: most of the time in the air the wings beat (owner, 05/10/2026: birds never seemed to flap).
    expect(flying.filter((f) => f.wings === 'glide').length / flying.length).toBeLessThan(0.35);
    expect(live(actorFor('bee', 2), 10).frames.every((f) => f.wings === 'buzz')).toBe(true);
  });

  it('keeps to calm chores under reduced motion: no flights, no hops, no leaps', () => {
    const reduced = ctx({ reduced: true });
    const parrot = live(actorFor('parrot', 4), 60, reduced).frames;
    expect(parrot.every((f) => f.wings === 'folded')).toBe(true);
    const bunny = live(actorFor('bunny', 4), 60, reduced).frames;
    expect(bunny.every((f) => f.position[1] === 10)).toBe(true);
    expect(live(actorFor('fish', 4), 30, reduced).frames.every((f) => !f.visible)).toBe(true);
  });

  it('cheers a finished quest with its own line, then goes back to work; calmly under reduced motion', () => {
    const woodcutter = actorFor('woodcutter', 7);
    live(woodcutter, 5);
    expect(woodcutter.celebrate(false)).toBe(true);
    expect(woodcutter.celebrate(false)).toBe(false); // already cheering
    expect(live(woodcutter, 4).speech[0]?.pool).toBe('woodcutter-cheer');
    expect(woodcutter.canReact).toBe(true);
    // Reduced motion: only cheers that stay on the ground, so the bunny never leaves it.
    const bunny = actorFor('bunny', 7);
    const calm = ctx({ reduced: true });
    live(bunny, 3, calm);
    for (let i = 0; i < 4; i++) {
      bunny.celebrate(true);
      expect(live(bunny, 4, calm).frames.every((f) => f.position[1] === 10)).toBe(true);
    }
  });

  it('runs over to the child for a visit, says hello, and runs back home; people and fish never visit', () => {
    const bunny = actorFor('bunny', 11);
    live(bunny, 2);
    expect(bunny.visit([8, 10, 6])).toBe(true);
    const { frames, speech } = live(bunny, 12);
    const nearest = Math.min(...frames.map((f) => Math.hypot(f.position[0] - 8, f.position[2] - 6)));
    expect(nearest).toBeLessThan(0.5);
    expect(frames.some((f) => f.clip === 'run')).toBe(true);
    expect(speech[0]?.pool).toBe('bunny-sound');
    live(bunny, 10);
    expect(Math.hypot(bunny.position[0], bunny.position[2])).toBeLessThan(0.5);
    expect(actorFor('cook').visit([8, 10, 6])).toBe(false);
    expect(actorFor('fish').visit([8, 10, 6])).toBe(false);
  });

  it('answers a neighbour on the next frame, turned towards them', () => {
    const actor = actorFor('cook', 6);
    actor.step(1 / 30, ctx());
    const [x, , z] = actor.position;
    actor.answer('cook-thanks', [x, 10, z + 5]);
    const step = actor.step(1 / 30, ctx());
    expect(step.speech).toEqual({ pool: 'cook-thanks' });
    expect(step.frame.yaw).toBeCloseTo(0, 5);
    expect(actor.step(1 / 30, ctx()).speech).toBeNull();
  });
});
