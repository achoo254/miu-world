import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createChuyen } from './logic';

describeMinigame('chuyen');

describe('chơi chuyền rules', () => {
  const setup = () => createChuyen({ arena: { width: 863, height: 600 }, goal: 5, duration: 90, params: { speed: 1 }, rng: createRng(6) });
  const tap = (game: ReturnType<typeof setup>, x: number, y: number) => game.step(1 / 60, { ...NO_INPUT, taps: [{ x, y }] });
  const fallTo = (game: ReturnType<typeof setup>, y: number) => {
    for (let i = 0; i < 400 && !(game.state.ball.vy > 0 && game.state.ball.y >= y); i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('clears a bàn with enough sticks and a catch, then asks for one more stick', () => {
    const game = setup();
    const { ball } = game.state;
    tap(game, ball.x, ball.y);
    expect(ball.phase).toBe('air');
    const stick = game.state.sticks[0];
    if (!stick) throw new Error('no stick');
    tap(game, stick.x, stick.y);
    fallTo(game, game.state.mat.y);
    tap(game, ball.x, ball.y);
    expect(game.score).toBe(1);
    expect(game.state.need).toBe(2);
    expect(stick.gone).toBe(true);
  });

  it('puts the sticks back after a catch with too few, and after a dropped ball', () => {
    const game = setup();
    const { ball } = game.state;
    tap(game, ball.x, ball.y);
    fallTo(game, game.state.mat.y);
    tap(game, ball.x, ball.y);
    expect(game.score).toBe(0);
    expect(game.state.outcome).toBe('short');
    tap(game, ball.x, ball.y);
    const stick = game.state.sticks[1];
    if (!stick) throw new Error('no stick');
    tap(game, stick.x, stick.y);
    for (let i = 0; i < 400 && ball.phase === 'air'; i += 1) game.step(1 / 60, NO_INPUT);
    expect(ball.phase).toBe('dropped');
    expect(stick.picked).toBe(false);
    expect(game.score).toBe(0);
  });
});
