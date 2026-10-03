import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHandSpan, nextEdge } from './logic';

describeMinigame('hand-span');

describe('hand span rules', () => {
  const setup = () => createHandSpan({ arena: { width: 600, height: 863 }, goal: 8, duration: 90, params: {}, rng: createRng(8) });

  it('snaps a hand laid near the last one and marks one laid with a gap', () => {
    const game = setup();
    const { span, y } = game.state;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: game.state.start + span / 2 + span * 0.2, y }] });
    expect(game.state.hands[0]).toMatchObject({ left: game.state.start, snug: true });
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: nextEdge(game.state) + span * 1.2, y }] });
    expect(game.state.hands[1]?.snug).toBe(false);
  });

  it('asks for the count once covered and scores only the true length', () => {
    const game = setup();
    const { span, y } = game.state;
    for (let i = 0; i < game.state.spans; i += 1) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: nextEdge(game.state) + span / 2, y }] });
    expect(game.state.phase).toBe('count');
    const wrong = game.state.choices.findIndex((n) => n !== game.state.spans);
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.buttons[wrong] ?? { x: 0, y: 0 }] });
    expect(game.state.phase).toBe('wrong');
    expect(game.score).toBe(0);
  });
});
