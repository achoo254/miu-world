import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMeltingFloes } from './logic';

describeMinigame('melting-floes');

describe('melting floes rules', () => {
  const setup = () => createMeltingFloes({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: {}, rng: createRng(7) });

  it('hops only to a floe next to the penguin and picks up its fish', () => {
    const game = setup();
    const start = game.state.at;
    const far = start + 2 < game.state.slots.length ? start + 2 : start - 2;
    for (const f of game.state.floes) f.life = 9;
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.slots[far] ?? { x: 0, y: 0 }] });
    expect(game.state.at).toBe(start);
    const next = start + 1;
    const floe = game.state.floes[next];
    if (!floe) throw new Error('no floe');
    floe.fish = true;
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.slots[next] ?? { x: 0, y: 0 }] });
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.at).toBe(next);
    expect(game.score).toBe(1);
  });

  it('takes a heart when the floe sinks under the penguin', () => {
    const game = setup();
    const here = game.state.floes[game.state.at];
    if (here) here.life = 0.01;
    for (let i = 0; i < 5; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
  });
});
