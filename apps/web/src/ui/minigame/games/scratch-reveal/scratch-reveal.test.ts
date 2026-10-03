import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createScratchReveal, OPEN_AT } from './logic';

describeMinigame('scratch-reveal');

describe('scratch reveal rules', () => {
  const setup = () => createScratchReveal({ arena: { width: 863, height: 600 }, goal: 10, duration: 90, params: {}, rng: createRng(5) });
  const rub = (game: ReturnType<typeof setup>, rows: number) => {
    const { x, y, size } = game.state.card;
    for (let r = 0; r < rows; r += 1) for (let i = 0; i <= 10; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: x + (size * i) / 10, y: y + 30 + r * 60 } });
    game.step(1 / 60, NO_INPUT);
  };

  it('keeps the answers shut until a little of the picture shows', () => {
    const game = setup();
    const right = game.state.choices.find((c) => c.animal === game.state.answer);
    if (!right) throw new Error('no right answer');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: right.x, y: right.y }] });
    expect(game.score).toBe(0);
    rub(game, 2);
    expect(game.state.clearedShare).toBeGreaterThanOrEqual(OPEN_AT);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: right.x, y: right.y }] });
    expect(game.score).toBe(2);
  });

  it('fades a wrong answer and gives one point after a lot of scratching', () => {
    const game = setup();
    rub(game, 7);
    expect(game.state.clearedShare).toBeGreaterThan(0.35);
    const wrong = game.state.choices.find((c) => c.animal !== game.state.answer);
    const right = game.state.choices.find((c) => c.animal === game.state.answer);
    if (!wrong || !right) throw new Error('bad choices');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: wrong.x, y: wrong.y }] });
    expect(wrong.wrong).toBe(true);
    expect(game.score).toBe(0);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: right.x, y: right.y }] });
    expect(game.score).toBe(1);
  });

  it('deals a fresh covered card after a right answer', () => {
    const game = setup();
    rub(game, 3);
    const right = game.state.choices.find((c) => c.animal === game.state.answer);
    if (!right) throw new Error('no right answer');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: right.x, y: right.y }] });
    for (let i = 0; i < 70; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.rounds).toBe(2);
    expect(game.state.clearedShare).toBe(0);
  });
});
