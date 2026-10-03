import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFireflyTorch } from './logic';

describeMinigame('firefly-torch');

describe('firefly torch rules', () => {
  const setup = () => createFireflyTorch({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: { speed: 1 }, rng: createRng(4) });

  it('catches a firefly tapped inside the beam', () => {
    const game = setup();
    const f = game.state.flies[0];
    if (!f) throw new Error('no firefly');
    f.x = game.state.beamX + 20;
    f.y = game.state.beamY;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: f.x, y: f.y }] });
    expect(game.score).toBe(1);
  });

  it('cannot catch one in the dark: the tap only moves the beam there', () => {
    const game = setup();
    const f = game.state.flies[0];
    if (!f) throw new Error('no firefly');
    f.x = game.state.beamX + 400;
    f.y = game.state.beamY;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: f.x, y: f.y }] });
    expect(game.score).toBe(0);
    expect(game.state.beamX).toBeGreaterThan(431);
  });
});
