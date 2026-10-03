import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createConveyorSort, frontThing } from './logic';

describeMinigame('conveyor-sort');

describe('conveyor sort rules', () => {
  const setup = () => createConveyorSort({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: { speed: 1 }, rng: createRng(8) });
  const swipe = (direction: 'left' | 'right'): Swipe => ({ direction, from: { x: 431, y: 400 }, dx: direction === 'left' ? -150 : 150, dy: 0, speed: 1200 });
  const firstOnBelt = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 300 && !frontThing(game.state); i += 1) game.step(1 / 60, NO_INPUT);
    const thing = frontThing(game.state);
    if (!thing) throw new Error('nothing on the belt');
    return thing;
  };

  it('scores the front thing swiped to its own basket, not one swiped to the other', () => {
    const game = setup();
    const thing = firstOnBelt(game);
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe(thing.side)] });
    expect(game.score).toBe(1);
    const next = firstOnBelt(game);
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe(next.side === 'left' ? 'right' : 'left')] });
    expect(game.score).toBe(1);
    expect(next.sent?.right).toBe(false);
  });

  it('is lost by always swiping the same way', async () => {
    const spec = MINIGAME_SPECS.get('conveyor-sort');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('conveyor-sort');
    const oneWay = () => ({ swipe: { from: { x: 400, y: 400 }, dx: -150, dy: 0 } });
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: oneWay }).won).toBe(false);
  });
});
