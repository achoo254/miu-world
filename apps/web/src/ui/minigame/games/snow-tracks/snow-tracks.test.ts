import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { ANIMALS, createSnowTracks, makePrints } from './logic';

describeMinigame('snow-tracks');

describe('snow tracks rules', () => {
  const setup = () => createSnowTracks({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: {}, rng: createRng(3) });
  const tapButton = (game: ReturnType<typeof setup>, i: number) => {
    const b = game.state.buttons[i];
    if (!b) throw new Error('no button');
    game.step(1 / 60, { ...NO_INPUT, taps: [b] });
  };

  it('lays every track inside the snow field', () => {
    for (const animal of ANIMALS) {
      const prints = makePrints(animal, createRng(1), 600, 130, 1000);
      expect(prints.length).toBeGreaterThan(8);
      for (const p of prints) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(600);
        expect(p.y).toBeGreaterThan(100);
        expect(p.y).toBeLessThan(1030);
      }
    }
  });

  it('scores only a right first guess; a wrong one rules that animal out and shows more prints', () => {
    const game = setup();
    const wrong = (game.state.animal + 1) % ANIMALS.length;
    const before = game.state.shown;
    tapButton(game, wrong);
    expect(game.state.ruledOut[wrong]).toBe(true);
    expect(game.state.shown).toBeGreaterThan(before + 3);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    tapButton(game, game.state.animal);
    expect(game.state.phase).toBe('reveal');
    expect(game.score).toBe(0);
    for (let i = 0; i < 70; i += 1) game.step(1 / 60, NO_INPUT);
    tapButton(game, game.state.animal);
    expect(game.score).toBe(1);
  });

  it('is not won by tapping animals at random', async () => {
    const spec = MINIGAME_SPECS.get('snow-tracks');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('snow-tracks');
    const rng = createRng(5);
    const guesser = (ctx: BotContext): BotMove => {
      const i = rng.int(0, 3);
      const r = Math.min(72, (ctx.arena.width - 60) / 9);
      return { tap: { x: ctx.arena.width / 2 + (i - 1.5) * Math.min(ctx.arena.width / 4.2, r * 2.6), y: ctx.arena.height - Math.max(50, r) - 28 } };
    };
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: guesser }).won).toBe(false);
  });
});
