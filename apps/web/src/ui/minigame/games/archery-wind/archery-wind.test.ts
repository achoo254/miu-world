import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { playRound } from '../../testing/play-round';
import { createArchery, ringPoints, WIND_DRIFT } from './logic';

describeMinigame('archery-wind');

describe('archery rules', () => {
  const setup = () => createArchery({ arena: { width: 863, height: 600 }, goal: 40, duration: 60, params: { wind: 1 }, rng: createRng(8) });

  it('scores rings from the middle out', () => {
    expect(ringPoints(0, 150)).toBe(10);
    expect(ringPoints(40, 150)).toBe(8);
    expect(ringPoints(140, 150)).toBe(2);
    expect(ringPoints(160, 150)).toBe(0);
  });

  it('carries the arrow with the wind: aiming upwind hits the middle', () => {
    const game = setup();
    const from = { x: 400, y: 500 };
    const drift = game.state.wind * WIND_DRIFT * game.state.radius;
    game.step(1 / 60, { ...NO_INPUT, pointer: from, pressed: true });
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: from.x - drift / 1.1, y: from.y } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(10);
    expect(game.state.arrowsLeft).toBe(7);
  });

  it('is lost by always aiming at the middle and ignoring the wind', async () => {
    const spec = MINIGAME_SPECS.get('archery-wind');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('archery-wind');
    const arena = { width: 863, height: 600 };
    // Holds 0.5 s at the spot it pressed (aim stays on the centre), then lets go; again after a beat.
    const straight = ({ time }: { time: number }) => (time % 1.6 < 0.6 ? { touch: { x: 400, y: 500 } } : {});
    for (const seed of [1, 2, 3, 4]) expect(playRound(game, spec, { arena, seed, player: straight }).won).toBe(false);
  });
});
