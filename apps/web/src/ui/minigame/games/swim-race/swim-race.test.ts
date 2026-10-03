import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createSwimRace, STROKE_LENGTH, toNearestBeat } from './logic';

describeMinigame('swim-race');

describe('swim race rules', () => {
  const setup = () => createSwimRace({ arena: { width: 863, height: 600 }, goal: 3, duration: 50, params: { tempo: 1 }, rng: createRng(2) });
  const tap: GameInput = { ...NO_INPUT, taps: [{ x: 400, y: 500 }] };
  const toBeat = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 120 && Math.abs(toNearestBeat(game.state)) > 0.01; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('pushes her on with a tap on the beat', () => {
    const game = setup();
    toBeat(game);
    game.step(1 / 60, tap);
    for (let i = 0; i < 180; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.child.progress).toBeGreaterThan(STROKE_LENGTH * 0.9);
    expect(game.state.verdict).toBe('good');
  });

  it('tires her with an off-beat tap: the next beat does nothing', () => {
    const game = setup();
    toBeat(game);
    for (let i = 0; i < 18; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap);
    expect(game.state.tired).toBeGreaterThan(0);
    toBeat(game);
    game.step(1 / 60, tap);
    expect(game.state.child.speed).toBe(0);
  });

  it('is lost by tapping as fast as possible', async () => {
    const spec = MINIGAME_SPECS.get('swim-race');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('swim-race');
    const masher = () => ({ tap: { x: 300, y: 500 } });
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: masher }).won).toBe(false);
  });
});
