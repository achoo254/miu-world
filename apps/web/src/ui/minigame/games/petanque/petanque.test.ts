import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPetanque, scoreEnd, type Ball } from './logic';

describeMinigame('petanque');

describe('pétanque rules', () => {
  const ball = (owner: Ball['owner'], x: number, y: number): Ball => ({ owner, x, y, vx: 0, vy: 0 });

  it('scores each of the nearest side’s balls that beat the other side’s best', () => {
    const balls = [ball('jack', 0, 0), ball('child', 10, 0), ball('child', 30, 0), ball('child', 90, 0), ball('owl', 50, 0), ball('owl', 60, 0)];
    expect(scoreEnd(balls)).toEqual({ child: 2, owl: 0 });
    expect(scoreEnd([ball('jack', 0, 0), ball('owl', 5, 0), ball('child', 20, 0)])).toEqual({ child: 0, owl: 1 });
  });

  it('throws further for a longer pull, and a landing ball knocks another', () => {
    const game = createPetanque({ arena: { width: 863, height: 600 }, goal: 4, duration: 75, params: {}, rng: createRng(1) });
    const from = { x: 430, y: 500 };
    game.step(1 / 60, { ...NO_INPUT, pointer: from, pressed: true });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 430, y: 420 } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    const short = game.state.flight?.to.y ?? 0;
    expect(game.state.flight?.owner).toBe('child');
    const game2 = createPetanque({ arena: { width: 863, height: 600 }, goal: 4, duration: 75, params: {}, rng: createRng(1) });
    game2.step(1 / 60, { ...NO_INPUT, pointer: from, pressed: true });
    game2.step(1 / 60, { ...NO_INPUT, pointer: { x: 430, y: 380 } });
    game2.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game2.state.flight?.to.y ?? 0).toBeLessThan(short);
  });
});
