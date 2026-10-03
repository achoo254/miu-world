import { describe, expect, it } from 'vitest';
import { BotDriver } from './bot-driver';
import { classifyGesture, InputCollector } from './input';
import { MINIGAME_CODE_IDS, MINIGAME_SPECS } from './registry';
import { arenaFor, starsFor, stepsForFrame, STEP_SECONDS } from './round';
import { createRng } from './rng';
import { emoji, MINIGAME_SPRITE_PATHS, spriteName } from './sprites';
import { themeFor } from './theme';
import manifest from '../../../../../assets/manifest.json';

const GAME_TESTS = import.meta.glob('./games/*/*.test.ts');

describe('minigame registry', () => {
  it('pairs every game file in content/minigames with a game folder, and every folder with a bot test', () => {
    expect([...MINIGAME_SPECS.keys()].sort()).toEqual(MINIGAME_CODE_IDS);
    const tested = new Set(Object.keys(GAME_TESTS).map((file) => file.split('/').at(-2)));
    expect(MINIGAME_CODE_IDS.filter((id) => !tested.has(id))).toEqual([]);
  });

  it('ships the three reference games', () => {
    expect(MINIGAME_CODE_IDS).toEqual(expect.arrayContaining(['runner', 'egg-catch', 'penalty-kick']));
  });
});

describe('minigame pictures', () => {
  it('resolves an emoji or a name to an allowed picture', () => {
    expect(emoji('🥚')).toBe('egg');
    expect(spriteName('☁')).toBe('cloud');
    expect(spriteName('☁️')).toBe('cloud');
    expect(spriteName('basket')).toBe('basket');
    expect(spriteName('🦖')).toBeNull();
  });

  it('only names files of the asset manifest, so the build ships them and nothing is hotlinked', () => {
    const listed = new Set(manifest.files.map((f) => f.path));
    expect(MINIGAME_SPRITE_PATHS.filter((p) => !listed.has(p))).toEqual([]);
  });
});

describe('one finger, read the same way everywhere', () => {
  it('tells a tap from a swipe in CSS pixels, whatever the arena scale', () => {
    expect(classifyGesture({ x: 0, y: 0 }, { x: 5, y: 5 }, 120, 1)).toEqual({ kind: 'tap', at: { x: 0, y: 0 } });
    expect(classifyGesture({ x: 0, y: 0 }, { x: 0, y: -80 }, 150, 1)).toMatchObject({ kind: 'swipe', swipe: { direction: 'up', dy: -80 } });
    // 20 arena units on a phone (0.65 px per unit) is 13 px: still a tap.
    expect(classifyGesture({ x: 0, y: 0 }, { x: 20, y: 0 }, 120, 0.65)).toMatchObject({ kind: 'tap' });
    expect(classifyGesture({ x: 0, y: 0 }, { x: 5, y: 0 }, 900, 1)).toBeNull();
  });

  it('hands out press, release, taps and swipes once, and times a hold', () => {
    const input = new InputCollector(1);
    input.down({ x: 10, y: 10 }, 1000);
    expect(input.take(1500)).toMatchObject({ pressed: true, pointer: { x: 10, y: 10 }, holdTime: 0.5 });
    expect(input.take(1600)).toMatchObject({ pressed: false, holdTime: 0.6 });
    input.up({ x: 10, y: 10 }, 1200);
    expect(input.take(1700)).toMatchObject({ released: true, pointer: null, taps: [{ x: 10, y: 10 }], holdTime: 0 });
    expect(input.take(1800).taps).toEqual([]);
  });

  it('lets a bot hold, tap and swipe through the same finger', () => {
    const input = new InputCollector(1);
    const bot = new BotDriver(input);
    bot.apply({ touch: { x: 50, y: 60 } }, 0);
    expect(input.take(0).pointer).toEqual({ x: 50, y: 60 });
    bot.apply({ swipe: { from: { x: 100, y: 500 }, dx: 0, dy: -200 } }, 200);
    expect(input.take(200).swipes).toMatchObject([{ direction: 'up' }]);
    bot.apply({ tap: { x: 1, y: 2 } }, 300);
    expect(input.take(300).taps).toEqual([{ x: 1, y: 2 }]);
  });
});

describe('round rules', () => {
  it('keeps the shorter side at 600 units on every screen', () => {
    expect(arenaFor(1180, 820).arena).toEqual({ width: (1180 * 600) / 820, height: 600 });
    expect(arenaFor(390, 844).arena.width).toBeCloseTo(600);
  });

  it('gives stars from the goal: none short of it, three at 1.8 times', () => {
    expect([9, 10, 13, 14, 17, 18].map((s) => starsFor(s, 10))).toEqual([0, 1, 1, 2, 2, 3]);
  });

  it('steps at a fixed 60 Hz whatever the frame rate, and never fast-forwards a long hitch', () => {
    expect(stepsForFrame(0, 1 / 60).steps).toBe(1);
    expect(stepsForFrame(0, 1 / 120)).toMatchObject({ steps: 0 });
    expect(stepsForFrame(STEP_SECONDS / 2, 1 / 120).steps).toBe(1);
    expect(stepsForFrame(0, 5).steps).toBe(15);
  });

  it('draws the same numbers from the same seed', () => {
    const a = createRng(9);
    const b = createRng(9);
    expect([a.next(), a.int(1, 6), a.range(2, 3)]).toEqual([b.next(), b.int(1, 6), b.range(2, 3)]);
  });

  it('paints each map in its own colours, all from the design tokens', () => {
    const token = (name: string): string => `var(${name})`;
    expect(themeFor('nui-tuyet', token)).toMatchObject({ id: 'snow', ground: 'var(--color-cloud)' });
    expect(themeFor('dao-bi-an', token)).toMatchObject({ id: 'beach', ground: 'var(--color-parchment-deep)' });
    expect(themeFor(null, token).id).toBe('meadow');
  });
});
