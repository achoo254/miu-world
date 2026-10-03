import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSlingshot, MAX_PULL, shotHits, STONES } from './logic';

describeMinigame('slingshot-tower');

describe('slingshot rules', () => {
  const setup = () => createSlingshot({ arena: { width: 863, height: 600 }, goal: 3, duration: 75, params: {}, rng: createRng(2) });
  const shoot = (game: ReturnType<typeof setup>, pull: Point) => {
    const from = { x: 300, y: 400 };
    game.step(1 / 60, { ...NO_INPUT, pointer: from, pressed: true });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: from.x + pull.x, y: from.y + pull.y } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    for (let i = 0; i < 60 * 4 && game.state.stone; i += 1) game.step(1 / 60, NO_INPUT);
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('topples the tower when a stone hits a parcel, and brings a new tower', () => {
    const game = setup();
    const first = game.state.tower;
    let pull: Point | null = null;
    for (let deg = 5; deg <= 70 && !pull; deg += 2.5) {
      for (let p = 0.3; p <= 1 && !pull; p += 0.025) {
        const a = (deg * Math.PI) / 180;
        const candidate = { x: -Math.cos(a) * MAX_PULL * p, y: Math.sin(a) * MAX_PULL * p };
        if (shotHits(game.state, candidate).index >= 0) pull = candidate;
      }
    }
    if (!pull) throw new Error('no shot reaches the tower');
    shoot(game, pull);
    expect(game.score).toBe(1);
    expect(first.bodies.every((b) => b.loose)).toBe(true);
    expect(game.state.tower).not.toBe(first);
  });

  it('a weak pull does not shoot; six missed stones end the round', () => {
    const game = setup();
    shoot(game, { x: -10, y: 5 });
    expect(game.state.stonesLeft).toBe(STONES);
    for (let i = 0; i < STONES; i += 1) shoot(game, { x: 60, y: 140 });
    expect(game.state.stonesLeft).toBe(0);
    expect(game.score).toBe(0);
    expect(game.done).toBe(true);
  });
});
