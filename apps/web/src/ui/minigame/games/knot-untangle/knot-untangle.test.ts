import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createKnotUntangle, crosses, crossingEdges } from './logic';

describeMinigame('knot-untangle');

describe('knot untangle rules', () => {
  it('tells crossing strings from ones that only touch a shared balloon', () => {
    expect(crosses({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(true);
    expect(crosses({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBe(false);
  });

  it('deals a tangle whose plan has no crossings, and scores when untangled', () => {
    const game = createKnotUntangle({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(4) });
    expect(crossingEdges(game.state).size).toBeGreaterThan(0);
    expect(crossingEdges({ nodes: game.state.solution, edges: game.state.edges }).size).toBe(0);
    // Tap each balloon, then its place.
    for (let i = 0; i < game.state.nodes.length && game.score === 0; i += 1) {
      const node = game.state.nodes[i];
      const goal = game.state.solution[i];
      if (!node || !goal) continue;
      game.step(1 / 60, { ...NO_INPUT, pressed: true, released: true, taps: [{ ...node }] });
      game.step(1 / 60, { ...NO_INPUT, pressed: true, released: true, taps: [goal] });
    }
    expect(game.score).toBe(1);
  });
});
