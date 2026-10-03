import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPhotoFinish, photoTime, placings, runnerX } from './logic';

describeMinigame('photo-finish');

describe('photo finish rules', () => {
  const setup = () => createPhotoFinish({ arena: { width: 863, height: 600 }, goal: 10, duration: 75, params: { runners: 5 }, rng: createRng(6) });
  const toPhoto = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 60 * 5 && game.state.phase !== 'photo'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('shows the winner on the line in the photo, the others behind in finishing order (every race, many seeds)', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const game = createPhotoFinish({ arena: { width: 600, height: 1298 }, goal: 10, duration: 75, params: { runners: 6 }, rng: createRng(seed) });
      for (let race = 0; race < 8; race += 1) {
        const order = placings(game.state);
        const xs = order.map((r) => runnerX(game.state, r, photoTime(game.state)));
        expect(xs[0]).toBeCloseTo(game.state.finishX, 5);
        for (let i = 1; i < xs.length; i += 1) expect(xs[i] ?? 0).toBeLessThan((xs[i - 1] ?? 0) - 8);
        // Answer right to get the next race.
        for (let i = 0; i < 60 * 5 && game.state.phase !== 'photo'; i += 1) game.step(1 / 60, NO_INPUT);
        const wanted = placings(game.state)[game.state.ask - 1];
        game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: game.state.laneTop + ((wanted?.lane ?? 0) + 0.5) * game.state.laneHeight }] });
        for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
      }
    }
  });

  it('scores the lane of the asked place; a wrong lane replays and scores nothing', () => {
    const game = setup();
    toPhoto(game);
    const wanted = placings(game.state)[game.state.ask - 1];
    if (!wanted) throw new Error('no runner');
    const laneY = (lane: number) => game.state.laneTop + (lane + 0.5) * game.state.laneHeight;
    const wrong = game.state.runners.find((r) => r.lane !== wanted.lane);
    if (!wrong) throw new Error('one runner');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: laneY(wrong.lane) }] });
    expect(game.state.phase).toBe('replay');
    toPhoto(game);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: laneY(wanted.lane) }] });
    expect(game.score).toBe(1);
  });
});
