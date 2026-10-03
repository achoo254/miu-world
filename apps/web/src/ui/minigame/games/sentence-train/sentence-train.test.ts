import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSentenceTrain, SENTENCES } from './logic';
import { SCENE } from './draw';

describeMinigame('sentence-train');

describe('sentence train rules', () => {
  const setup = () => createSentenceTrain({ arena: { width: 600, height: 1298 }, goal: 8, duration: 90, params: {}, rng: createRng(2) });

  it('writes every sentence with a capital first word, a full stop and a picture', () => {
    for (const s of SENTENCES) {
      const first = s.words[0] ?? '';
      expect(first[0]).toBe(first[0]?.toUpperCase());
      expect(s.words[s.words.length - 1]?.endsWith('.')).toBe(true);
      expect(s.words.slice(0, -1).every((w) => !w.endsWith('.'))).toBe(true);
      for (const i of s.scene) expect(i === -1 || SCENE[i] !== undefined).toBe(true);
    }
  });

  it('keeps every waiting wagon on screen, below the main line', () => {
    for (const arena of [{ width: 863, height: 600 }, { width: 600, height: 863 }, { width: 600, height: 1298 }]) {
      const s = createSentenceTrain({ arena, goal: 8, duration: 90, params: {}, rng: createRng(3) }).state;
      for (const w of s.wagons) {
        expect(w.home.x - w.w / 2).toBeGreaterThanOrEqual(0);
        expect(w.home.x + w.w / 2).toBeLessThanOrEqual(arena.width);
        expect(w.home.y + s.wagonH / 2).toBeLessThanOrEqual(arena.height);
        expect(w.home.y).toBeGreaterThan(s.trackY + s.wagonH);
      }
    }
  });

  it('attaches the next word, backs up a wagon after a wrong one, and drives off with the sentence', () => {
    const game = setup();
    const s = game.state;
    const tap = (order: number) => {
      const w = s.wagons.find((x) => x.order === order);
      if (!w) throw new Error('no wagon');
      game.step(1 / 60, { ...NO_INPUT, taps: [w.home] });
    };
    tap(0);
    expect(s.built).toBe(1);
    tap(2);
    expect(s.built).toBe(0);
    for (let i = 0; i < 50; i += 1) game.step(1 / 60, NO_INPUT);
    for (let k = 0; k < s.wagons.length; k += 1) tap(k);
    expect(game.score).toBe(1);
    expect(s.phase).toBe('drive');
  });
});

describe('sentence train against guessing', () => {
  it('is not won by tapping waiting wagons at random, ten times a second', () => {
    for (const seed of [1, 2, 3]) {
      const game = createSentenceTrain({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: {}, rng: createRng(seed) });
      const pick = createRng(seed + 70);
      for (let step = 0; step < 90 * 60; step += 1) {
        const waiting = game.state.wagons.filter((w) => !w.attached);
        const w = step % 6 === 0 ? waiting[pick.int(0, Math.max(0, waiting.length - 1))] : undefined;
        game.step(1 / 60, w ? { ...NO_INPUT, taps: [w.home] } : NO_INPUT);
      }
      expect(game.score).toBeLessThan(8);
    }
  });
});
