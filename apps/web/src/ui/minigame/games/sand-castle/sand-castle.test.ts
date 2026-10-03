import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSandCastle } from './logic';

describeMinigame('sand-castle');

describe('sand castle rules', () => {
  const setup = () => createSandCastle({ arena: { width: 863, height: 600 }, goal: 12, duration: 90, params: { band: 0.18 }, rng: createRng(1) });
  const hold = (game: ReturnType<typeof setup>, until: (f: number) => boolean) => {
    for (let i = 0; i < 400 && !until(game.state.fill); i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: game.state.bucket, holdTime: 0.5 });
    game.step(1 / 60, { ...NO_INPUT, released: true });
  };

  it('builds a tower from a bucket filled to the band', () => {
    const game = setup();
    const mid = (game.state.band.lo + game.state.band.hi) / 2;
    hold(game, (f) => f >= mid);
    const spot = game.state.spots[0];
    if (!spot) throw new Error('no spot');
    game.step(1 / 60, { ...NO_INPUT, taps: [spot.at] });
    expect(spot.built).toBe(true);
    expect(game.score).toBe(1);
  });

  it('crumbles a tower with too little sand and slumps one with too much', () => {
    const game = setup();
    const [a, b] = game.state.spots;
    if (!a || !b) throw new Error('no spot');
    const lo = game.state.band.lo;
    hold(game, (f) => f >= lo / 2);
    game.step(1 / 60, { ...NO_INPUT, taps: [a.at] });
    expect(a.failed).toBe('crumble');
    hold(game, (f) => f >= 1.19);
    game.step(1 / 60, { ...NO_INPUT, taps: [b.at] });
    expect(b.failed).toBe('slump');
    expect(game.score).toBe(0);
  });
});
