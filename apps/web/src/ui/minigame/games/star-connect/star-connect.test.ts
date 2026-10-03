import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { arenaFor, REFERENCE_SCREENS } from '../../round';
import { HUD_SAFE_TOP, NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createStarConnect, figureBox, FIGURES, sampleOutline } from './logic';

describeMinigame('star-connect');

describe('star connect rules', () => {
  const setup = () => createStarConnect({ arena: { width: 863, height: 600 }, goal: 3, duration: 60, params: { stars: 10 }, rng: createRng(1) });

  it('keeps every star apart and below the HUD on every screen', () => {
    for (const screen of REFERENCE_SCREENS) {
      const { arena } = arenaFor(screen.width, screen.height);
      const box = figureBox(arena);
      for (const figure of FIGURES) {
        const pts = sampleOutline(figure.outline, 10).map(([u, v]) => ({ x: box.x + u * box.w, y: box.y + v * box.h }));
        for (const [i, a] of pts.entries()) {
          expect(a.y).toBeGreaterThan(HUD_SAFE_TOP + 20);
          expect(a.y).toBeLessThan(arena.height - 30);
          for (const b of pts.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y), `${figure.picture} on ${screen.name}`).toBeGreaterThanOrEqual(85);
        }
      }
    }
  });

  it('joins stars only in order; a wrong one wobbles', () => {
    const game = setup();
    const [first, second, third] = game.state.dots;
    if (!first || !second || !third) throw new Error('no dots');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: third.x, y: third.y }] });
    expect(game.state.joined).toBe(0);
    expect(third.wrong).toBeLessThan(0.1);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: first.x + 20, y: first.y }] });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: second.x, y: second.y } });
    expect(game.state.joined).toBe(2);
  });

  it('scores a finished picture and shows the next', () => {
    const game = setup();
    const before = game.state.figure;
    for (const d of [...game.state.dots]) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: d.x, y: d.y }] });
    expect(game.score).toBe(1);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.joined).toBe(0);
    expect(game.state.figure).not.toBe(before);
  });
});
