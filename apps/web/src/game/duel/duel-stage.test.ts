import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { DuelState } from '../../game-bridge/game-store';
import type { ParticleSpawn } from '../interact/effect-particles';
import type { DuelPose } from './duel-poses';
import { CALM_SPARKS, DuelStage, type DuelBoss, type DuelStageDeps } from './duel-stage';

const flat = (_x: number, y: number): boolean => y < 5;

function boss(position: [number, number, number] = [10, 5, 14]): DuelBoss & { poses: Array<DuelPose | null> } {
  const poses: Array<DuelPose | null> = [];
  return { def: { id: 'trum-thu', position, radius: 3 }, available: true, height: 1.6, poses, duelPose: (p) => poses.push(p) };
}

function setup(options: { boss?: DuelBoss | null; player?: [number, number, number]; solid?: (x: number, y: number, z: number) => boolean; ready?: boolean } = {}) {
  const camera = new PerspectiveCamera(60, 820 / 1180, 0.1, 200);
  camera.position.set(10, 8, 4);
  camera.lookAt(10, 5, 14);
  camera.updateMatrixWorld();
  const states: DuelState[] = [];
  const sparks: ParticleSpawn[] = [];
  const player = { position: new Vector3(...(options.player ?? [10, 5, 12])), facing: 0 };
  const deps: DuelStageDeps = {
    camera,
    viewport: () => ({ width: 820, height: 1180 }),
    ready: () => options.ready ?? true,
    findBoss: () => (options.boss === undefined ? boss() : options.boss),
    standSpot: (b) => [b.def.position[0] ?? 0, 5, (b.def.position[2] ?? 0) - 2],
    player,
    place: vi.fn((spot: readonly [number, number, number]) => player.position.set(...spot)),
    solid: options.solid ?? flat,
    view: vi.fn(),
    shake: vi.fn(),
    act: vi.fn(),
    spawn: (p) => sparks.push(p),
    anchors: () => null,
    emit: (s) => states.push(s),
    controls: vi.fn(),
  };
  return { stage: new DuelStage(deps), deps, states, sparks, player };
}

const run = (stage: DuelStage, seconds: number): void => {
  for (let t = 0; t < seconds; t += 1 / 60) stage.update(1 / 60);
};

describe('the boss fight stage', () => {
  it('is unavailable when the boss is not on this map, hidden, or the game is not up', () => {
    for (const options of [{ boss: null }, { boss: { ...boss(), available: false } }, { ready: false }]) {
      const { stage, states, deps } = setup(options);
      stage.open('trum-thu', false);
      expect(states).toEqual(['unavailable']);
      expect(stage.active).toBe(false);
      expect(deps.controls).not.toHaveBeenCalled();
    }
  });

  it('sets up beside the boss: she faces it, her controls rest, the camera frames them both', () => {
    const b = boss();
    const { stage, states, deps, player } = setup({ boss: b });
    stage.open('trum-thu', false);
    expect(states).toEqual(['staged']);
    expect(stage.active).toBe(true);
    expect(deps.place).not.toHaveBeenCalled();
    expect(player.facing).toBeCloseTo(0, 5); // the boss is straight ahead along +z
    expect(deps.controls).toHaveBeenCalledWith(false);
    expect(deps.view).toHaveBeenCalledWith(expect.objectContaining({ position: expect.any(Vector3) }), false, expect.any(Number));
    expect(b.poses).toEqual(['wait']);
  });

  it('takes her to the boss first when the fight reopens far from it', () => {
    const { stage, states, deps } = setup({ player: [40, 5, 40] });
    stage.open('trum-thu', false);
    expect(states).toEqual(['staged']);
    expect(deps.place).toHaveBeenCalledWith([10, 5, 12], expect.any(Number));
  });

  it('is unavailable when walls stand between the camera and the two', () => {
    const { stage, states } = setup({ solid: (_x, y, z) => y < 5 || (z < 11 && y < 30) || (z > 15 && y < 30) });
    stage.open('trum-thu', false);
    expect(states).toEqual(['unavailable']);
  });

  it('throws a star at the answer and lands it on the boss when the server says right', () => {
    const b = boss();
    const { stage, sparks, deps } = setup({ boss: b });
    stage.open('trum-thu', false);
    stage.cue('aim', { x: 300, y: 300 });
    expect(deps.act).toHaveBeenCalledWith('throw', expect.any(Number));
    run(stage, 0.6);
    const flown = sparks.length;
    expect(flown).toBeGreaterThan(10);
    stage.cue('hit');
    run(stage, 0.5);
    expect(b.poses).toContain('hit');
    expect(sparks.length - flown).toBeGreaterThan(CALM_SPARKS);
  });

  it('bounces a wrong answer off harmlessly: bubbles back, she ducks, the view shakes a little', () => {
    const b = boss();
    const { stage, deps, sparks } = setup({ boss: b });
    stage.open('trum-thu', false);
    stage.cue('aim', { x: 300, y: 300 });
    stage.cue('miss'); // the word came back before the star got there: it plays once the star arrives
    expect(b.poses).not.toContain('counter');
    run(stage, 0.6);
    expect(b.poses).toContain('counter');
    expect(deps.act).toHaveBeenCalledWith('dodge', expect.any(Number));
    expect(deps.shake).toHaveBeenCalled();
    expect(sparks.some((s) => s.shape === 'bubble')).toBe(true);
  });

  it('lets a star fizzle out when no answer comes back, the boss unmoved', () => {
    const b = boss();
    const { stage, sparks } = setup({ boss: b });
    stage.open('trum-thu', false);
    stage.cue('aim', { x: 300, y: 300 });
    run(stage, 0.6);
    stage.cue('fizzle');
    expect(b.poses).toEqual(['wait']);
    expect(sparks.some((s) => s.shape === 'puff')).toBe(true);
  });

  it('with less motion: no flight, no shake, a camera that jumps, and at most eight sparks a blow', () => {
    const b = boss();
    const { stage, sparks, deps } = setup({ boss: b });
    stage.open('trum-thu', true);
    expect(deps.view).toHaveBeenCalledWith(expect.anything(), true, expect.any(Number));
    stage.cue('aim', { x: 300, y: 300 });
    run(stage, 0.6);
    stage.cue('hit');
    run(stage, 0.6);
    expect(sparks.length).toBeLessThanOrEqual(CALM_SPARKS);
    expect(b.poses).toContain('hit');
    sparks.length = 0;
    stage.cue('aim', { x: 300, y: 300 });
    stage.cue('miss');
    expect(sparks.length).toBeLessThanOrEqual(CALM_SPARKS);
    expect(deps.shake).not.toHaveBeenCalled();
  });

  it('bows the boss out on the winning blow, and a party member\'s blow staggers it', () => {
    const b = boss();
    const { stage } = setup({ boss: b });
    stage.open('trum-thu', false);
    stage.cue('ally-hit');
    expect(b.poses.at(-1)).toBe('hit');
    stage.cue('aim', { x: 300, y: 300 });
    stage.cue('win');
    run(stage, 1);
    expect(b.poses.at(-1)).toBe('lose');
  });

  it('taunts her now and then while it waits', () => {
    const b = boss();
    const { stage } = setup({ boss: b });
    stage.open('trum-thu', false);
    run(stage, 8);
    expect(b.poses).toContain('taunt');
  });

  it('gives everything back when closed: the boss its ways, her controls, the camera behind her', () => {
    const b = boss();
    const { stage, states, deps } = setup({ boss: b });
    stage.open('trum-thu', false);
    stage.close();
    expect(b.poses.at(-1)).toBeNull();
    expect(deps.controls).toHaveBeenLastCalledWith(true);
    expect(deps.view).toHaveBeenLastCalledWith(null, false, expect.any(Number));
    expect(states).toEqual(['staged', null]);
    expect(stage.active).toBe(false);
    stage.close();
    expect(states).toEqual(['staged', null]);
  });

  it('frames the two again, at once, when the screen changes shape', () => {
    const { stage, deps } = setup();
    stage.open('trum-thu', false);
    deps.camera.aspect = 9 / 19.5;
    deps.camera.updateProjectionMatrix();
    const reframe = stage.reframe;
    reframe();
    expect(deps.view).toHaveBeenLastCalledWith(expect.objectContaining({ position: expect.any(Vector3) }), true, expect.any(Number));
  });

  it('writes where the boss and her hand are on screen into the anchors, only when they move', () => {
    const { stage, deps } = setup();
    const bossEl = document.createElement('div');
    const playerEl = document.createElement('div');
    deps.anchors = () => ({ boss: bossEl, player: playerEl });
    stage.open('trum-thu', false);
    stage.update(1 / 60);
    const x = Number.parseFloat(bossEl.style.getPropertyValue('--duel-x'));
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(820);
    expect(playerEl.style.getPropertyValue('--duel-y')).toMatch(/px$/);
    const set = vi.spyOn(bossEl.style, 'setProperty');
    stage.update(1 / 60);
    expect(set).not.toHaveBeenCalled();
  });
});
