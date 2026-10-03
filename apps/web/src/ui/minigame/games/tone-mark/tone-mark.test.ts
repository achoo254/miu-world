import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { bare, createToneMark, toneOf, TONES, withTone, WORDS } from './logic';

describeMinigame('tone-mark');

describe('tone mark rules', () => {
  it('takes the mark off and puts another on the same vowel', () => {
    expect(bare('cá')).toBe('ca');
    expect(bare('gấu')).toBe('gâu');
    expect(bare('chuột')).toBe('chuôt');
    expect(bare('bướm')).toBe('bươm');
    expect(withTone('gấu', 'huyen')).toBe('gầu');
    expect(withTone('đậu', 'sac')).toBe('đấu');
    expect(withTone('sữa', 'nang')).toBe('sựa');
    expect(withTone('cá', 'hoi')).toBe('cả');
  });

  it('files every word under its own tone', () => {
    for (const tone of TONES) for (const { word } of WORDS[tone]) expect(toneOf(word), word).toBe(tone);
  });

  it('scores the right mark dropped on the word, and lets a wrong one go home', () => {
    const game = createToneMark({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: {}, rng: createRng(1) });
    const s = game.state;
    const right = s.hats.find((h) => h.tone === toneOf(s.word));
    const wrong = s.hats.find((h) => h.tone !== toneOf(s.word));
    if (!right || !wrong) throw new Error('no hats');
    const card = { x: s.card.x + s.card.w / 2, y: s.card.y + s.card.h / 2 };
    const drag = (from: { x: number; y: number }) => {
      game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: from });
      game.step(1 / 60, { ...NO_INPUT, pointer: card });
      game.step(1 / 60, { ...NO_INPUT, released: true });
    };
    drag(wrong.home);
    expect(game.score).toBe(0);
    expect(s.mood).toBe('wrong');
    expect(wrong.x).toBe(wrong.home.x);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    drag(right.home);
    expect(game.score).toBe(1);
    expect(s.shown).toBe(s.word);
  });
});
