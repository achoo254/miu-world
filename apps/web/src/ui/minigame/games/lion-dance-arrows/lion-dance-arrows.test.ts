import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput, type SwipeDirection } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { ARROWS, createLionDance } from './logic';

describeMinigame('lion-dance-arrows');

describe('lion dance rules', () => {
  const setup = () => createLionDance({ arena: { width: 863, height: 600 }, goal: 36, duration: 58, params: { tempo: 1 }, rng: createRng(2) });
  const swipe = (direction: SwipeDirection): GameInput => ({ ...NO_INPUT, swipes: [{ direction, from: { x: 400, y: 400 }, dx: 0, dy: -100, speed: 900 }] });
  const runTo = (game: ReturnType<typeof setup>, t: number) => {
    while (game.state.time < t - 1e-9) game.step(1 / 60, NO_INPUT);
  };

  it('writes a song of forty arrows that fits the round', () => {
    const game = setup();
    expect(game.state.arrows).toHaveLength(ARROWS);
    expect(game.state.arrows.at(-1)?.at).toBeLessThan(57);
  });

  it('scores the right way on the beat, and drums', () => {
    const game = setup();
    const first = game.state.arrows[0];
    if (!first) throw new Error('no arrows');
    runTo(game, first.at - 0.05);
    game.step(1 / 60, swipe(first.dir));
    expect(first.judged).toBe('perfect');
    expect(game.score).toBe(2);
    expect(game.drainEvents().find((e) => e.type === 'score')?.voice).toBe('drum');
  });

  it('misses a wrong swipe and an arrow let past; ignores a swipe far from any beat', () => {
    const game = setup();
    const [first, second] = game.state.arrows;
    if (!first || !second) throw new Error('no arrows');
    game.step(1 / 60, swipe('up'));
    expect(game.state.arrows.every((a) => a.judged === null)).toBe(true);
    runTo(game, first.at);
    game.step(1 / 60, swipe(first.dir === 'up' ? 'down' : 'up'));
    expect(first.judged).toBe('miss');
    runTo(game, second.at + 0.4);
    expect(second.judged).toBe('miss');
    expect(game.score).toBe(0);
  });

  it('is lost by swiping one way on every beat', async () => {
    const spec = MINIGAME_SPECS.get('lion-dance-arrows');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('lion-dance-arrows');
    const masher = () => ({ swipe: { from: { x: 300, y: 400 }, dx: 0, dy: -120 } });
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: masher }).won).toBe(false);
  });
});
