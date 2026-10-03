import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFerryDock, currentAt, pierPoint } from './logic';

describeMinigame('ferry-dock');

describe('ferry dock rules', () => {
  const setup = () => createFerryDock({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: {}, rng: createRng(1) });

  it('drifts with the current, strongest mid-river', () => {
    const game = setup();
    const s = game.state;
    expect(currentAt(s, s.topEdge)).toBeCloseTo(0);
    s.ferry = { x: 300, y: (s.topEdge + s.bottomEdge) / 2 };
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.ferry.x).toBeGreaterThan(320);
  });

  it('docks gently at the lit pier, and bumps off when too fast', () => {
    const game = setup();
    const s = game.state;
    const pier = s.piers[s.target];
    if (!pier) throw new Error('no pier');
    const at = pierPoint(s, pier);
    s.ferry = { x: at.x, y: at.y + (pier.bank === 'top' ? 0.5 : -0.5) };
    s.vel = { x: 0, y: pier.bank === 'top' ? -400 : 400 };
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(0);
    s.ferry = { x: at.x, y: at.y + (pier.bank === 'top' ? 0.5 : -0.5) };
    s.vel = { x: 0, y: pier.bank === 'top' ? -60 : 60 };
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(s.phase).toBe('docked');
  });
});
