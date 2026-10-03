import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createPenaltyKick, KEEPER_HALF } from './logic';

describeMinigame('penalty-kick');

describe('penalty kick rules', () => {
  const setup = () => createPenaltyKick({ arena: { width: 863, height: 600 }, goal: 8, duration: 45, params: { keeperSpeed: 1 }, rng: createRng(5) });
  const shot = (from: { x: number; y: number }, dx: number, dy: number): Swipe => ({ direction: 'up', from, dx, dy, speed: 1800 });
  const flyOut = (game: ReturnType<typeof setup>): void => {
    for (let i = 0; i < 60 && game.state.ball?.result == null; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('scores a shot into the goal away from the keeper', () => {
    const game = setup();
    const { spotX, spotY, goalLine, goalX, goalHalf } = game.state;
    game.state.keeperX = goalX - goalHalf + KEEPER_HALF;
    const aim = goalX + goalHalf - 60;
    game.step(1 / 60, { ...NO_INPUT, swipes: [shot({ x: spotX, y: spotY }, ((aim - spotX) / (spotY - goalLine)) * 200, -200)] });
    flyOut(game);
    expect(game.state.ball?.result).toBe('goal');
    expect(game.score).toBe(1);
  });

  it('is saved straight at the keeper and wide past a post', () => {
    const game = setup();
    const { spotX, spotY, goalX, goalHalf, goalLine } = game.state;
    game.state.keeperX = spotX;
    game.step(1 / 60, { ...NO_INPUT, swipes: [shot({ x: spotX, y: spotY }, 0, -200)] });
    flyOut(game);
    expect(game.state.ball?.result).toBe('saved');
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    const wide = goalX + goalHalf + 80;
    game.step(1 / 60, { ...NO_INPUT, swipes: [shot({ x: spotX, y: spotY }, ((wide - spotX) / (spotY - goalLine)) * 200, -200)] });
    flyOut(game);
    expect(game.state.ball?.result).toBe('wide');
    expect(game.score).toBe(0);
  });

  it('ignores a swipe down or one high up the screen', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, swipes: [{ direction: 'down', from: { x: 400, y: 500 }, dx: 0, dy: 200, speed: 1500 }, shot({ x: 400, y: 100 }, 0, -200)] });
    expect(game.state.ball).toBeNull();
  });
});

describe('penalty kick difficulty', () => {
  it('saves most shots kicked straight at the middle: aiming matters', async () => {
    const spec = MINIGAME_SPECS.get('penalty-kick');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('penalty-kick');
    const arena = { width: 863, height: 600 };
    const straight = ({ arena: a }: { arena: { width: number; height: number } }) => ({ swipe: { from: { x: a.width / 2, y: a.height - 120 }, dx: 0, dy: -220 } });
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena, seed, player: straight }).won).toBe(false);
  });
});
