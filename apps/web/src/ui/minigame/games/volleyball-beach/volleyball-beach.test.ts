import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createVolleyballBeach, landingX } from './logic';

describeMinigame('volleyball-beach', {
  // Standing in the middle of the court and never spiking: the crab wins the points.
  loser: (context) => ({ touch: { x: context.arena.width / 4, y: context.arena.height - 110 } }),
});

describe('beach volleyball rules', () => {
  const setup = () => createVolleyballBeach({ arena: { width: 863, height: 600 }, goal: 5, duration: 75, params: {}, rng: createRng(2) });

  it('bumps back a ball the child stands under, and the crab scores one she misses', () => {
    const game = setup();
    for (let i = 0; i < 80 && game.state.phase !== 'rally'; i += 1) game.step(1 / 60, NO_INPUT);
    const x = landingX(game.state.ball, game.state.contactY) ?? 0;
    for (let i = 0; i < 120 && game.state.ball.to === 'child'; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x, y: 500 } });
    expect(game.state.ball.to).toBe('crab');
    const lost = setup();
    for (let i = 0; i < 60 * 4 && lost.state.set.crab === 0; i += 1) lost.step(1 / 60, { ...NO_INPUT, pointer: { x: 40, y: 500 } });
    expect(lost.state.set.crab).toBe(1);
  });

  it('spikes a ball tapped just above the head, fast to the far end', () => {
    const game = setup();
    for (let i = 0; i < 80 && game.state.phase !== 'rally'; i += 1) game.step(1 / 60, NO_INPUT);
    const x = landingX(game.state.ball, game.state.contactY) ?? 0;
    game.state.child.x = x;
    game.state.child.target = x;
    while (game.state.ball.y < game.state.contactY - 80 || game.state.ball.vy < 0) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x, y: 400 }] });
    expect(game.state.ball.spiked).toBe(true);
    expect(game.state.ball.to).toBe('crab');
  });
});
