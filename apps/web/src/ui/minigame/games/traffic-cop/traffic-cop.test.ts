import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { carPose, createTrafficCop, LEAVE, type Arm, type Car } from './logic';

describeMinigame('traffic-cop');

describe('traffic cop rules', () => {
  const setup = () => createTrafficCop({ arena: { width: 863, height: 600 }, goal: 30, duration: 90, params: { traffic: 0.01 }, rng: createRng(2) });
  const car = (id: number, arm: Arm, s: number): Car => ({ id, arm, kind: 'car', colour: 0, s, speed: 230, phase: 'approach', waited: 0, crashedAgo: 0, counted: false, waved: false });
  const run = (game: ReturnType<typeof setup>, seconds: number): void => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('stops a car at the line until it is tapped, then counts it across', () => {
    const game = setup();
    const { state } = game;
    state.cars = [car(100, 'w', state.stopAt.w - 50)];
    run(game, 1);
    expect(state.cars[0]?.phase).toBe('waiting');
    const first = state.cars[0];
    if (!first) throw new Error('no car');
    const pose = carPose(state, first);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [{ x: pose.x, y: pose.y }] });
    run(game, 2);
    expect(game.score).toBe(1);
  });

  it('bumps crossing cars and takes a heart', () => {
    const game = setup();
    const { state } = game;
    state.cars = [car(100, 'w', state.stopAt.w), car(101, 'n', state.stopAt.n)];
    for (const c of state.cars) c.phase = 'go';
    run(game, 1.5);
    expect(game.lives).toBe(2);
  });

  it('lets a car that waited too long go on its own', () => {
    const game = setup();
    const { state } = game;
    state.cars = [car(100, 's', state.stopAt.s)];
    run(game, LEAVE + 0.2);
    expect(state.cars[0]?.phase).toBe('go');
  });
});
