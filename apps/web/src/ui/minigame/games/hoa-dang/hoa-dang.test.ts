import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHoaDang } from './logic';

/** Sets lanterns down as fast as they come, anywhere along the bank. */
const hurrier = ({ arena, time }: BotContext): BotMove => ({ tap: { x: 50 + (Math.abs(Math.sin(time * 12.9898) * 43758.5453) % 1) * (arena.width - 100), y: arena.height - 80 } });

describeMinigame('hoa-dang');
describeMinigame('hoa-dang', { loser: hurrier });

describe('hoa dang rules', () => {
  const setup = () => createHoaDang({ arena: { width: 863, height: 600 }, goal: 12, duration: 60, params: { speed: 1 }, rng: createRng(2) });

  it('scores a lantern that reaches the bend and puts out one that bumps a boat', () => {
    const game = setup();
    for (const lane of game.state.lanes) lane.drifters = [];
    game.state.ready = 0;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: game.state.bankY }] });
    for (let i = 0; i < 60 * 4; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    const lane = game.state.lanes[0];
    if (!lane) throw new Error('no lane');
    lane.speed = 0;
    lane.drifters = [{ x: 400, w: 150, kind: 'boat' }];
    game.state.ready = 0;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: game.state.bankY }] });
    for (let i = 0; i < 60 * 4; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });
});
