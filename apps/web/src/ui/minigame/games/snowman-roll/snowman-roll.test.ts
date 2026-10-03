import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSnowmanRoll, GROWTH, partCentre, PARTS, START_RADIUS } from './logic';

describeMinigame('snowman-roll');

describe('snowman roll rules', () => {
  const setup = () => createSnowmanRoll({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: {}, rng: createRng(1) });
  const at = (p: Point) => ({ ...NO_INPUT, pointer: p });

  it('grows the ball by how far it rolls', () => {
    const game = setup();
    const { ball } = game.state;
    const from = { x: ball.x, y: ball.y };
    game.step(1 / 60, at({ x: from.x + 10, y: from.y }));
    expect(game.state.ball.r).toBeCloseTo(START_RADIUS + 10 * GROWTH);
  });

  it('stacks a ball of the right size dropped on the spot, and sends a small one back', () => {
    const game = setup();
    const { state } = game;
    const [low] = PARTS[0] ?? [0, 0];
    state.ball.r = low - 10;
    const target = partCentre(state, 0, state.ball.r);
    Object.assign(state.ball, target);
    game.step(1 / 60, at(target));
    game.step(1 / 60, NO_INPUT);
    expect(state.last).toBe('small');
    expect(game.score).toBe(0);
    state.ball.r = low + 4;
    const again = partCentre(state, 0, state.ball.r);
    Object.assign(state.ball, again);
    game.step(1 / 60, at(again));
    game.step(1 / 60, NO_INPUT);
    expect(state.last).toBe('stacked');
    expect(state.stacked).toHaveLength(1);
    expect(game.score).toBe(1);
  });

  it('crumbles a ball that is too big', () => {
    const game = setup();
    const { state } = game;
    state.ball.r = (PARTS[0]?.[1] ?? 0) + 10;
    const target = partCentre(state, 0, state.ball.r);
    Object.assign(state.ball, target);
    game.step(1 / 60, at(target));
    game.step(1 / 60, NO_INPUT);
    expect(state.last).toBe('big');
    expect(state.ball.r).toBe(START_RADIUS);
  });
});
