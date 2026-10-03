import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createCottonCandy, START_RADIUS, TURNS_PER_CANDY } from './logic';

describeMinigame('cotton-candy');

describe('cotton candy rules', () => {
  const setup = () => createCottonCandy({ arena: { width: 863, height: 600 }, goal: 6, duration: 60, params: { speed: 1 }, rng: createRng(1) });
  /** Circles the stick `turns` times at `perSecond` turns a second, one step at a time. */
  const circle = (game: ReturnType<typeof setup>, turns: number, perSecond: number) => {
    const r = (game.state.inner + game.state.outer) / 2;
    const steps = Math.round((turns / perSecond) * 60);
    for (let i = 0; i <= steps; i += 1) {
      const a = (i / 60) * perSecond * Math.PI * 2;
      game.step(1 / 60, { ...NO_INPUT, pointer: { x: game.state.cx + Math.cos(a) * r, y: game.state.cy + Math.sin(a) * r } });
    }
  };

  it('finishes a candy after enough steady turns', () => {
    const game = setup();
    circle(game, TURNS_PER_CANDY + 0.2, 1.2);
    expect(game.score).toBe(1);
  });

  it('flings the candy off when circling too fast: the stick starts over', () => {
    const game = setup();
    circle(game, 2, 1.2);
    expect(game.state.radius).toBeGreaterThan(START_RADIUS + 20);
    circle(game, 3, 4);
    expect(game.state.fellAgo).toBeGreaterThanOrEqual(0);
    expect(game.state.radius).toBe(START_RADIUS);
    expect(game.score).toBe(0);
  });

  it('is lost by circling far too fast (almost three turns a second)', async () => {
    const spec = MINIGAME_SPECS.get('cotton-candy');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('cotton-candy');
    const spinner = ({ time }: { time: number }) => ({ touch: { x: 431 + Math.cos(time * 18) * 190, y: 300 + Math.sin(time * 18) * 190 } });
    for (const seed of [1, 2]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: spinner }).won).toBe(false);
  });
});
