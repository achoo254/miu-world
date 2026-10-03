import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createCrocCompare, makePair, sideFor } from './logic';

describeMinigame('croc-compare');

describe('croc compare rules', () => {
  const setup = () => createCrocCompare({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: {}, rng: createRng(4) });
  const swipe = (direction: 'left' | 'right' | 'down') => ({ ...NO_INPUT, swipes: [{ direction, from: { x: 400, y: 400 }, dx: direction === 'left' ? -150 : direction === 'right' ? 150 : 0, dy: direction === 'down' ? 150 : 0, speed: 900 }] });

  it('keeps every plate in the grade 2 range and names the bigger side', () => {
    const rng = createRng(9);
    for (let n = 0; n < 200; n += 1) {
      const { left, right } = makePair(rng, n);
      for (const p of [left, right]) {
        expect(p.value).toBeGreaterThanOrEqual(2);
        expect(p.value).toBeLessThanOrEqual(100);
        if (p.kind === 'group') expect(p.value).toBeLessThanOrEqual(10);
      }
    }
    expect(sideFor(47, 74)).toBe('right');
    expect(sideFor(9, 9)).toBe('equal');
  });

  it('scores the right side and yawns longer after wrong answers in a row', () => {
    const game = setup();
    const wrong = game.state.answer === 'left' ? 'right' : 'left';
    game.step(1 / 60, swipe(wrong));
    expect(game.state.phase).toBe('yawn');
    expect(game.score).toBe(0);
    for (let i = 0; i < 95; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('ask');
    game.step(1 / 60, swipe(game.state.answer === 'left' ? 'right' : 'left'));
    for (let i = 0; i < 95; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('yawn');
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    const answer = game.state.answer;
    game.step(1 / 60, answer === 'equal' ? swipe('down') : swipe(answer));
    expect(game.score).toBe(1);
  });

  it('is not won by swiping at random', async () => {
    const spec = MINIGAME_SPECS.get('croc-compare');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('croc-compare');
    const rng = createRng(11);
    const guesser = (ctx: BotContext): BotMove => {
      const dir = rng.int(0, 2);
      return { swipe: { from: { x: ctx.arena.width / 2, y: 400 }, dx: dir === 0 ? -150 : dir === 1 ? 150 : 0, dy: dir === 2 ? 150 : 0 } };
    };
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: guesser }).won).toBe(false);
  });
});
