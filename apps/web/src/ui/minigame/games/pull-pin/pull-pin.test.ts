import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { BOARDS, createPullPin, pinSegment } from './logic';

describeMinigame('pull-pin');

describe('pull the pin rules', () => {
  const setup = () => createPullPin({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(3) });
  const pull = (game: ReturnType<typeof setup>, i: number) => {
    const pin = game.state.pins[i];
    if (!pin) throw new Error('no pin');
    const { a, b } = pinSegment(game.state, pin);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }] });
  };

  it('solves every board with its order of pins', () => {
    for (let b = 0; b < BOARDS.length; b += 1) {
      for (let tries = 0; tries < 40; tries += 1) {
        const game = createPullPin({ arena: { width: 600, height: 863 }, goal: 4, duration: 90, params: {}, rng: createRng(tries + b * 100) });
        if (game.state.board !== b) continue;
        for (const i of BOARDS[b]?.solution ?? []) pull(game, i);
        expect(game.state.result).toBe('solved');
        break;
      }
    }
  });

  it('spoils a board when mud reaches the cup or the balls', () => {
    const game = setup();
    const board = BOARDS[game.state.board];
    const toCup = game.state.pins.findIndex((p) => p.to === 'cup');
    // Pulling the cup's pin first: in every board it lets nothing good through, or mud through.
    pull(game, toCup);
    const muddy = game.state.chambers.some((c) => c.content === 'mixed') || game.state.inCup === 'mud';
    if (muddy) expect(game.state.result).toBe('spoiled');
    expect(board).toBeDefined();
  });
});
