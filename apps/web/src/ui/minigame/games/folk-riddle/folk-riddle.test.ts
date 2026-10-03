import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { canAnswer, createFolkRiddle } from './logic';
import { RIDDLES } from './riddles';

/** Taps all over the pictures without reading: a guess, a quarter of them right, until the hearts are gone. */
const guesser = ({ arena, time }: BotContext): BotMove => {
  const h = (k: number) => Math.abs(Math.sin(time * 12.9898 + k * 78.233) * 43758.5453) % 1;
  return { tap: { x: 40 + h(1) * (arena.width - 80), y: 380 + h(2) * (arena.height - 400) } };
};

describeMinigame('folk-riddle');
describeMinigame('folk-riddle', { loser: guesser });

describe('folk riddle rules', () => {
  const setup = () => createFolkRiddle({ arena: { width: 863, height: 600 }, goal: 7, duration: 90, params: {}, rng: createRng(9) });
  const waitToAnswer = (game: ReturnType<typeof setup>) => {
    while (!canAnswer(game.state)) game.step(1 / 60, NO_INPUT);
  };

  it('has riddles with distinct answers, each a short riddle', () => {
    expect(new Set(RIDDLES.map((r) => r.answer)).size).toBe(RIDDLES.length);
    for (const r of RIDDLES) {
      expect(r.lines.length).toBeGreaterThanOrEqual(3);
      expect(r.lines.length).toBeLessThanOrEqual(4);
    }
  });

  it('offers four different pictures, one of them right, and takes one guess', () => {
    const game = setup();
    expect(new Set(game.state.choices.map((c) => c.riddle)).size).toBe(4);
    expect(game.state.choices.filter((c) => c.riddle === game.state.current)).toHaveLength(1);
    const wrong = game.state.choices.find((c) => c.riddle !== game.state.current);
    if (!wrong) throw new Error('no wrong choice');
    // Too early: the pictures wait for the second line.
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: wrong.x, y: wrong.y }] });
    expect(game.state.phase).toBe('ask');
    waitToAnswer(game);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: wrong.x, y: wrong.y }] });
    expect(game.state.phase).toBe('wrong');
    expect(game.score).toBe(0);
    while (game.state.phase !== 'ask') game.step(1 / 60, NO_INPUT);
    waitToAnswer(game);
    const right = game.state.choices.find((c) => c.riddle === game.state.current);
    if (!right) throw new Error('no right choice');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: right.x, y: right.y }] });
    expect(game.score).toBe(1);
  });
});
