import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCalligraphy, inkFor } from './logic';

describeMinigame('ong-do-calligraphy');

describe('ông đồ rules', () => {
  const setup = () => createCalligraphy({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(1) });
  const trace = (game: ReturnType<typeof setup>, step: number) => {
    const stroke = game.state.strokes[game.state.current];
    if (!stroke) throw new Error('no stroke');
    const pts = stroke.samples.filter((_, i) => i % step === 0);
    pts.push(stroke.samples.at(-1) ?? { x: 0, y: 0 });
    pts.forEach((p, i) => game.step(1 / 60, { ...NO_INPUT, pointer: p, pressed: i === 0 }));
    game.step(1 / 60, { ...NO_INPUT, released: true });
  };

  it('inks darker the slower the brush goes', () => {
    expect(inkFor(200)).toBe(1);
    expect(inkFor(1200)).toBeLessThan(0.5);
  });

  it('keeps a slow stroke and wipes a rushed one', () => {
    const game = setup();
    trace(game, 8);
    expect(game.state.verdict).toBe('pale');
    expect(game.state.current).toBe(0);
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    trace(game, 1);
    expect(game.state.verdict).toBe('good');
    expect(game.state.current).toBe(1);
  });
});
