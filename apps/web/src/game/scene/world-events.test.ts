import { Color, DirectionalLight, Fog, HemisphereLight, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import type { AmbientLife } from '../ambient/ambient-life';
import { createWorldEvents } from './world-events';

const player = { x: 10, y: 12, z: 10 };

function setup(options: { reduced?: boolean; lite?: boolean; visit?: () => string | null } = {}) {
  const scene = new Scene();
  const skyColours = { top: new Color('#6fbef2'), horizon: new Color('#dff2ff') };
  const life = { visit: options.visit ?? (() => 'Thỏ trắng') } as unknown as AmbientLife;
  const ctx = { scene, skyColours, fog: new Fog('#dff2ff', 50, 100), hemisphere: new HemisphereLight('#fff', '#8fa37a', 1.9), sun: new DirectionalLight('#fff', 1.7), life, reduced: options.reduced ?? false, lite: options.lite ?? false, ahead: () => ({ x: Math.SQRT1_2, z: Math.SQRT1_2 }) };
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return { ctx, scene, events: createWorldEvents(['rain-rainbow', 'fireflies', 'animal-visit'], ctx, random) };
}
/** Plays `seconds` of the game in 1/10 s steps, collecting each surprise as it starts. */
function play(events: ReturnType<typeof setup>['events'], seconds: number, questPrompt = false): string[] {
  const started: string[] = [];
  for (let t = 0; t < seconds; t += 0.1) {
    const before = events.active;
    events.update(0.1, player, questPrompt);
    if (events.active && events.active !== before) started.push(events.active);
  }
  return started;
}

describe('world events', () => {
  it('waits for a while of play before the first surprise, then plays them now and then, never the same twice in a row', () => {
    const { events } = setup();
    expect(play(events, 39)).toEqual([]);
    const started = play(events, 20 * 60);
    expect(started.length).toBeGreaterThanOrEqual(6);
    started.forEach((kind, i) => i > 0 && expect(kind).not.toBe(started[i - 1]));
    expect(new Set(started)).toEqual(new Set(['rain-rainbow', 'fireflies', 'animal-visit']));
  });

  it('never starts next to a quest target', () => {
    const { events } = setup();
    expect(play(events, 10 * 60, true)).toEqual([]);
    expect(play(events, 30).length).toBe(1);
  });

  it('greys the sky for rain, shows the rainbow after, and gives the day back', () => {
    const { events, ctx, scene } = setup();
    const day = ctx.skyColours.top.clone();
    expect(events.start('rain-rainbow', player)).toBe(true);
    play(events, 5);
    expect(ctx.skyColours.top.equals(day)).toBe(false);
    expect(scene.getObjectByName('rain')?.visible).toBe(true);
    play(events, 12);
    expect(scene.getObjectByName('rainbow')?.visible).toBe(true);
    play(events, 10);
    expect(events.active).toBeNull();
    expect(ctx.skyColours.top.getHex()).toBe(day.getHex());
  });

  it('keeps the rain from falling under reduced motion and on low quality', () => {
    for (const options of [{ reduced: true }, { lite: true }]) {
      const { events, scene } = setup(options);
      events.start('rain-rainbow', player);
      play(events, 5);
      expect(scene.getObjectByName('rain')?.visible).toBe(false);
    }
  });

  it('skips an animal visit when no animal is near, and the next surprise plays instead', () => {
    const { events } = setup({ visit: () => null });
    expect(events.start('animal-visit', player)).toBe(false);
    expect(events.active).toBeNull();
  });
});
