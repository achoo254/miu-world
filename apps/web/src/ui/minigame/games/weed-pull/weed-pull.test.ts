import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createWeedPull, PULL_DISTANCE, type PlantKind } from './logic';

describeMinigame('weed-pull');

describe('weed pull rules', () => {
  const setup = (kind: PlantKind) => {
    const game = createWeedPull({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: { speed: 1 }, rng: createRng(1) });
    const plot = game.state.plots[0];
    if (!plot) throw new Error('no plot');
    plot.plant = kind;
    return { game, plot, at: { x: plot.x, y: plot.y - game.state.plantSize * 0.4 } };
  };
  const hold = (game: ReturnType<typeof setup>['game'], pointer: Point) => game.step(1 / 60, { ...NO_INPUT, pointer });

  it('pulls a weed out with an upward drag, and a carrot costs a point', () => {
    const { game, at } = setup('weed');
    hold(game, at);
    hold(game, { x: at.x, y: at.y - PULL_DISTANCE - 5 });
    expect(game.score).toBe(1);
    game.step(1 / 60, NO_INPUT);
    const carrot = setup('carrot');
    carrot.game.state.score = 3;
    hold(carrot.game, carrot.at);
    hold(carrot.game, { x: carrot.at.x, y: carrot.at.y - PULL_DISTANCE - 5 });
    expect(carrot.game.score).toBe(2);
  });

  it('keeps a tough weed in the ground until it is shaken', () => {
    const { game, at } = setup('tough');
    hold(game, at);
    hold(game, { x: at.x, y: at.y - PULL_DISTANCE - 5 });
    expect(game.score).toBe(0);
    for (const dx of [40, -40, 40, -40]) hold(game, { x: at.x + dx, y: at.y });
    hold(game, { x: at.x, y: at.y - PULL_DISTANCE - 5 });
    expect(game.score).toBe(2);
  });
});
