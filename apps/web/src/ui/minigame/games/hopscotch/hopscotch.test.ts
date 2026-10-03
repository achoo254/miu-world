import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHopscotch, hopOrder } from './logic';

describeMinigame('hopscotch');

describe('hopscotch rules', () => {
  const setup = () => createHopscotch({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: { speed: 1 }, rng: createRng(1) });
  const tap = (game: ReturnType<typeof setup>, p: { x: number; y: number }) => game.step(1 / 60, { ...NO_INPUT, taps: [p] });
  const wait = (game: ReturnType<typeof setup>, seconds: number) => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('throws onto the marked box, hops over the stone, and scores the round', () => {
    const game = setup();
    const s = game.state;
    s.target = 2;
    s.marker = 2.5;
    tap(game, s.start);
    expect(s.phase).toBe('hop');
    expect(hopOrder(s)).toEqual([0, 1, 3, 4, 5, 6, 7]);
    for (const i of hopOrder(s)) {
      wait(game, 0.3);
      tap(game, s.boxes[i] ?? s.start);
    }
    expect(game.score).toBe(1);
  });

  it('throws again after a miss and starts over after a wrong hop', () => {
    const game = setup();
    const s = game.state;
    s.marker = 4.5;
    tap(game, s.start);
    expect(s.phase).toBe('oops');
    wait(game, 1.2);
    expect(s.phase).toBe('throw');
    s.marker = 0.5;
    s.markerDir = 0;
    tap(game, s.start);
    expect(s.phase).toBe('hop');
    wait(game, 0.3);
    tap(game, s.boxes[3] ?? s.start);
    expect(s.phase).toBe('oops');
    expect(game.score).toBe(0);
  });
});
