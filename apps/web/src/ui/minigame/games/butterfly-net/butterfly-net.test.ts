import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { butterflyBot, createButterflyNet } from './logic';

/** Swats with quick taps: the net never creeps up, it swings from wherever it was. */
const swatter = ({ arena }: BotContext): BotMove => ({ tap: { x: arena.width / 2, y: arena.height / 2 } });

describeMinigame('butterfly-net');
describeMinigame('butterfly-net', { loser: swatter });

describe('butterfly net rules', () => {
  const setup = () => createButterflyNet({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: {}, rng: createRng(1) });

  it('scares a butterfly when the net rushes at it', () => {
    const game = setup();
    const b = game.state.butterflies[0];
    if (!b) throw new Error('none');
    for (let i = 0; i < 300; i += 1) game.step(1 / 60, NO_INPUT);
    game.state.net = { x: b.x - 150, y: b.y };
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: b.x + 200, y: b.y } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: b.x + 200, y: b.y } });
    expect(b.scared).toBeGreaterThan(0);
  });

  it('catches a calm butterfly when the finger lifts over it', () => {
    const game = setup();
    for (let i = 0; i < 300; i += 1) game.step(1 / 60, NO_INPUT);
    const b = game.state.butterflies[0];
    if (!b) throw new Error('none');
    game.state.net = { x: b.x, y: b.y };
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(1);
    expect(butterflyBot(game.state, { arena: { width: 863, height: 600 }, time: 1, goal: 8 })).toBeTruthy();
  });
});
