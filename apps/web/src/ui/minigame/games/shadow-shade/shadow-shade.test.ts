import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createShadowShade, isShaded, MIN_ELEVATION, napSpot, shadowSpan, SHADE_SECONDS, sunPoint } from './logic';

describeMinigame('shadow-shade');

describe('shadow shade rules', () => {
  const setup = () => createShadowShade({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: {}, rng: createRng(2) });
  const tree = { kind: 'tree' as const, x: 400, half: 50, height: 200 };

  it('casts a long shadow away from a low sun and a short one under a high sun', () => {
    const [from] = shadowSpan(tree, MIN_ELEVATION);
    expect(from).toBeLessThan(400 - 50 - 800);
    const [, to] = shadowSpan(tree, Math.PI - MIN_ELEVATION);
    expect(to).toBeGreaterThan(400 + 50 + 800);
    const noon = shadowSpan(tree, Math.PI / 2);
    expect(noon[0]).toBeCloseTo(350);
    expect(noon[1]).toBeCloseTo(450);
  });

  it('never naps the cat where it is shaded at noon', () => {
    const rng = createRng(4);
    for (let n = 0; n < 100; n += 1) {
      const x = napSpot(rng, [tree, { kind: 'house', x: 700, half: 80, height: 170 }], 900, 450);
      expect(isShaded({ casters: [tree], sun: Math.PI / 2, catX: x })).toBe(false);
    }
  });

  it('scores once the cat has been in the shade for a moment, then walks it off', () => {
    const game = setup();
    const s = game.state;
    const c = s.casters[0];
    if (!c) throw new Error('no caster');
    s.catX = c.x - c.half - 60;
    const lift = Math.atan2(c.height, 60 + 26 + 30);
    const target = sunPoint({ ...s, sun: lift });
    for (let i = 0; i < 60 && game.score === 0; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: target });
    expect(game.score).toBe(1);
    expect(s.phase).toBe('purr');
    expect(SHADE_SECONDS).toBeLessThan(1);
  });
});
