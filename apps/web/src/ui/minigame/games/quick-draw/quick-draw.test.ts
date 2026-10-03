import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createQuickDraw, ROUNDS } from './logic';

describeMinigame('quick-draw');

describe('quick draw rules', () => {
  const setup = () => createQuickDraw({ arena: { width: 863, height: 600 }, goal: 4, duration: 50, params: { catSpeed: 1 }, rng: createRng(4) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 400 }] };

  it('calls a tap before the light a foul', () => {
    const game = setup();
    game.step(1 / 60, tap);
    expect(game.state.results).toEqual(['foul']);
    expect(game.score).toBe(0);
  });

  it('wins a quick tap after the light, loses a slow one to the cat', () => {
    const game = setup();
    while (game.state.phase === 'wait') game.step(1 / 60, NO_INPUT);
    expect(game.drainEvents().some((e) => e.voice === 'whistle')).toBe(true);
    game.step(1 / 60, tap);
    expect(game.state.results).toEqual(['win']);
    expect(game.score).toBe(1);
    while (game.state.phase !== 'lit') game.step(1 / 60, NO_INPUT);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.results).toEqual(['win', 'lose']);
  });

  it('ends after eight rounds', () => {
    const game = setup();
    for (let i = 0; i < 60 * 60 && !game.done; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
    expect(game.state.results).toHaveLength(ROUNDS);
  });

  it('is lost by tapping all the time', async () => {
    const spec = MINIGAME_SPECS.get('quick-draw');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('quick-draw');
    const masher = () => ({ tap: { x: 300, y: 400 } });
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: masher }).won).toBe(false);
  });
});
