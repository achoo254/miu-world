import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createGardenCycle } from './logic';

describeMinigame('garden-cycle');

describe('garden cycle rules', () => {
  const setup = () => createGardenCycle({ arena: { width: 863, height: 600 }, goal: 15, duration: 90, params: { growth: 1 }, rng: createRng(1) });

  it('sows on a tap, stops growing when dry, grows again when watered, and a ripe tap scores', () => {
    const game = setup();
    const bed = game.state.beds[0];
    if (!bed) throw new Error('no bed');
    game.step(1 / 60, { ...NO_INPUT, taps: [bed.at] });
    expect(bed.growth).toBeLessThan(0.01);
    for (let i = 0; i < 60 * 4; i += 1) game.step(1 / 60, NO_INPUT);
    const dry = bed.growth;
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(bed.growth).toBe(dry);
    bed.bird = -1;
    game.step(1 / 60, { ...NO_INPUT, taps: [bed.at] });
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(bed.growth).toBeGreaterThan(dry);
    bed.growth = 1;
    bed.bird = -1;
    game.step(1 / 60, { ...NO_INPUT, taps: [bed.at] });
    expect(game.score).toBe(1);
    expect(bed.growth).toBe(-1);
  });

  it('a bird left alone eats the seedling; a tap shoos it', () => {
    const game = setup();
    const [a, b] = game.state.beds;
    if (!a || !b) throw new Error('no beds');
    a.growth = 0.2;
    b.growth = 0.2;
    a.water = b.water = 1;
    a.bird = 0;
    b.bird = 0;
    game.step(1 / 60, { ...NO_INPUT, taps: [b.at] });
    for (let i = 0; i < 60 * 3; i += 1) game.step(1 / 60, NO_INPUT);
    expect(a.growth).toBe(-1);
    expect(b.growth).toBeGreaterThan(0);
  });

  it('a held finger dragged over a dry bed waters it', () => {
    const game = setup();
    const bed = game.state.beds[1];
    if (!bed) throw new Error('no bed');
    bed.growth = 0.3;
    bed.water = 0;
    game.step(1 / 60, { ...NO_INPUT, pointer: bed.at, holdTime: 0.5 });
    expect(bed.water).toBeGreaterThan(0.9);
  });
});
