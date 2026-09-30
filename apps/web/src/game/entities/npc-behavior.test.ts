import { describe, expect, it } from 'vitest';
import { NpcBehavior, angleDelta, type NpcBehaviorOptions, type NpcClip } from './npc-behavior';

const CLIPS = { idle: 2, walk: 1, eat: 1.5, dance: 2, 'gesture-positive': 1 };

function behavior(overrides: Partial<NpcBehaviorOptions> = {}): NpcBehavior {
  let seed = 0;
  return new NpcBehavior({
    homeYaw: 0,
    noticeRadius: 6,
    greetRadius: 3,
    clipSeconds: CLIPS,
    random: () => ((seed = (seed * 9301 + 49297) % 233280) / 233280),
    ...overrides,
  });
}

/** Clips played over `seconds` at 10 fps with Miu far away, consecutive repeats collapsed. */
function clipsOver(npc: NpcBehavior, seconds: number, toPlayer: { dx: number; dz: number } | null = null): NpcClip[] {
  const seen: NpcClip[] = [];
  for (let t = 0; t < seconds; t += 0.1) {
    const { clip } = npc.step(0.1, toPlayer);
    if (seen[seen.length - 1] !== clip) seen.push(clip);
  }
  return seen;
}

describe('angleDelta', () => {
  it('takes the short way round', () => {
    expect(angleDelta(0.1, -0.1)).toBeCloseTo(-0.2);
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    expect(angleDelta(-3, 3)).toBeCloseTo(6 - 2 * Math.PI);
  });
});

describe('NpcBehavior', () => {
  it('breaks up the idle loop with actions, never the same one twice running', () => {
    const actions = clipsOver(behavior(), 120).filter((c) => c !== 'idle');
    expect(actions.length).toBeGreaterThanOrEqual(8);
    expect(new Set(actions)).toEqual(new Set(['eat', 'dance', 'gesture-positive']));
    for (let i = 1; i < actions.length; i++) expect(actions[i]).not.toBe(actions[i - 1]);
  });

  it('returns to idle after each action, for as long as the clip lasts', () => {
    const npc = behavior();
    let actionFrames = 0;
    let longest = 0;
    for (let t = 0; t < 60; t += 0.1) {
      const { clip } = npc.step(0.1, null);
      actionFrames = clip === 'idle' ? 0 : actionFrames + 1;
      longest = Math.max(longest, actionFrames);
    }
    expect(longest * 0.1).toBeLessThanOrEqual(Math.max(...Object.values(CLIPS)) + 0.11);
  });

  it('only picks actions the model has', () => {
    const actions = clipsOver(behavior({ clipSeconds: { idle: 2, eat: 1 } }), 60).filter((c) => c !== 'idle');
    expect(new Set(actions)).toEqual(new Set(['eat']));
  });

  it('turns to face Miu, stepping while it turns, then stands still facing her', () => {
    const npc = behavior();
    const miu = { dx: 4, dz: 0 }; // to the NPC's +x side: yaw π/2
    const first = npc.step(0.1, miu);
    expect(first.clip).toBe('walk');
    let frame = first;
    for (let i = 0; i < 20; i++) frame = npc.step(0.1, miu);
    expect(frame.yaw).toBeCloseTo(Math.PI / 2, 5);
    expect(frame.clip).toBe('idle');
  });

  it('ignores Miu beyond the notice radius and turns back home when she leaves', () => {
    const npc = behavior({ homeYaw: 1 });
    expect(npc.step(0.1, { dx: 20, dz: 0 }).yaw).toBe(1);
    for (let i = 0; i < 20; i++) npc.step(0.1, { dx: 0, dz: -4 });
    let frame = npc.step(0.1, null);
    for (let i = 0; i < 30; i++) frame = npc.step(0.1, null);
    expect(frame.yaw).toBeCloseTo(1, 5);
  });

  it('greets Miu once when she comes within reach, not again right after', () => {
    const npc = behavior();
    npc.step(0.1, { dx: 0, dz: 5 });
    expect(npc.step(0.1, { dx: 0, dz: 2 }).clip).toBe('gesture-positive');
    for (let i = 0; i < 15; i++) npc.step(0.1, { dx: 0, dz: 2 });
    npc.step(0.1, { dx: 0, dz: 5 });
    expect(npc.step(0.1, { dx: 0, dz: 2 }).clip).not.toBe('gesture-positive');
  });

  it('keeps its attention on Miu instead of starting an action while she is close', () => {
    const actions = clipsOver(behavior(), 60, { dx: 0, dz: 5 }).filter((c) => c !== 'idle' && c !== 'walk');
    expect(actions).toEqual([]);
  });
});
