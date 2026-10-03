import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createMilkCow, PATIENCE } from './logic';

describeMinigame('milk-cow');

describe('milk cow rules', () => {
  const setup = () => createMilkCow({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: { refill: 1 }, rng: createRng(1) });
  const down = (x: number, y: number): Swipe => ({ direction: 'down', from: { x, y }, dx: 0, dy: 90, speed: 900 });

  it('a swipe down on a full teat squirts a point; on an empty one it wears the patience', () => {
    const game = setup();
    const [l] = game.state.teats;
    game.step(1 / 60, { ...NO_INPUT, swipes: [down(l.at.x, l.at.y)] });
    expect(game.score).toBe(1);
    game.step(1 / 60, { ...NO_INPUT, swipes: [down(l.at.x, l.at.y)] });
    expect(game.score).toBe(1);
    expect(game.state.patience).toBe(PATIENCE - 1);
  });

  it('out of patience she huffs and ignores swipes for a while', () => {
    const game = setup();
    const [l] = game.state.teats;
    for (let i = 0; i < PATIENCE + 1; i += 1) game.step(1 / 60, { ...NO_INPUT, swipes: [down(l.at.x, l.at.y)] });
    expect(game.state.huff).toBeGreaterThan(1.5);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    const before = game.score;
    game.step(1 / 60, { ...NO_INPUT, swipes: [down(l.at.x, l.at.y)] });
    expect(game.score).toBe(before);
  });

  it('is lost by swiping as fast as possible: the rhythm matters', async () => {
    const spec = MINIGAME_SPECS.get('milk-cow');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('milk-cow');
    let n = 0;
    const frantic = ({ arena }: { arena: { width: number } }) => {
      n += 1;
      return { swipe: { from: { x: arena.width / 2 + (n % 2 === 0 ? -75 : 75), y: 420 }, dx: 0, dy: 90 } };
    };
    for (const seed of [1, 2]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: frantic }).won).toBe(false);
  });
});
