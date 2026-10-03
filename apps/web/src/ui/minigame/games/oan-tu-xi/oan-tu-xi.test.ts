import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { answerFor, createOanTuXi } from './logic';

/** Taps one of the three hands at random as soon as it can: right a third of the time, and slowed by the pauses. */
const guesser = ({ arena, time }: BotContext): BotMove => {
  const i = Math.floor(Math.abs(Math.sin(time * 12.9898) * 43758.5453)) % 3;
  const r = Math.min(96, (arena.width - 80) / 6.6);
  const gap = (arena.width - 6 * r) / 4;
  return { tap: { x: gap + r + i * (2 * r + gap), y: arena.height - r - Math.max(30, arena.height * 0.06) } };
};

describeMinigame('oan-tu-xi');
describeMinigame('oan-tu-xi', { loser: guesser });

describe('oẳn tù tì rules', () => {
  const setup = () => createOanTuXi({ arena: { width: 863, height: 600 }, goal: 12, duration: 60, params: { speed: 1 }, rng: createRng(4) });
  const skipChant = (game: ReturnType<typeof setup>) => {
    while (game.state.phase === 'chant') game.step(1 / 60, NO_INPUT);
  };

  it('knows which hand wins and which loses', () => {
    expect(answerFor('bua', 'win')).toBe('bao');
    expect(answerFor('keo', 'win')).toBe('bua');
    expect(answerFor('bao', 'win')).toBe('keo');
    expect(answerFor('bua', 'lose')).toBe('keo');
    expect(answerFor('bao', 'lose')).toBe('bua');
  });

  it('scores the right hand and not a wrong one', () => {
    const game = setup();
    skipChant(game);
    const right = game.state.buttons.find((b) => b.hand === answerFor(game.state.friend, game.state.rule));
    const wrong = game.state.buttons.find((b) => b !== right);
    if (!right || !wrong) throw new Error('no buttons');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: wrong.x, y: wrong.y }] });
    expect(game.score).toBe(0);
    expect(game.state.phase).toBe('result');
    while (game.state.phase !== 'answer') game.step(1 / 60, NO_INPUT);
    const next = game.state.buttons.find((b) => b.hand === answerFor(game.state.friend, game.state.rule));
    if (!next) throw new Error('no button');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: next.x, y: next.y }] });
    expect(game.score).toBe(1);
  });

  it('keeps every hand big enough to tap and inside the screen', () => {
    for (const arena of [{ width: 863, height: 600 }, { width: 600, height: 863 }, { width: 600, height: 1298 }]) {
      const game = createOanTuXi({ arena, goal: 12, duration: 60, params: {}, rng: createRng(1) });
      for (const b of game.state.buttons) {
        expect(b.r).toBeGreaterThanOrEqual(40);
        expect(b.x - b.r).toBeGreaterThanOrEqual(0);
        expect(b.x + b.r).toBeLessThanOrEqual(arena.width);
        expect(b.y + b.r).toBeLessThanOrEqual(arena.height);
      }
    }
  });
});
