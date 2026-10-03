import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { BEND_SPEED, createSlotCars, section } from './logic';

describeMinigame('slot-cars');

describe('slot cars rules', () => {
  const setup = () => createSlotCars({ arena: { width: 863, height: 600 }, goal: 3, duration: 60, params: { rival: 1 }, rng: createRng(1) });
  const hold = { ...NO_INPUT, pointer: { x: 400, y: 500 } };

  it('flies off when taking a bend too fast, and is back on the slot a second later', () => {
    const game = setup();
    for (let i = 0; i < 600 && game.state.child.crashed < 0; i += 1) game.step(1 / 60, hold);
    expect(game.state.child.crashed).toBeGreaterThanOrEqual(0);
    expect(section(game.state, game.state.childR, game.state.child.d).bend).toBe(true);
    for (let i = 0; i < 62; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.child.crashed).toBe(-1);
  });

  it('takes a bend safely under the bend speed', () => {
    const game = setup();
    game.state.child.d = 2 * game.state.half - 5;
    game.state.child.speed = BEND_SPEED - 20;
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.child.crashed).toBe(-1);
  });

  it('is lost by holding all the time', async () => {
    const spec = MINIGAME_SPECS.get('slot-cars');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('slot-cars');
    const always = () => ({ touch: { x: 400, y: 500 } });
    for (const seed of [1, 2]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: always }).won).toBe(false);
  });
});
