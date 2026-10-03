import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createClockCatch, minutesOf, offset, spoken, TOLERANCE } from './logic';

/** Taps ten times a second without looking at the clock. */
const tapper = ({ arena }: BotContext): BotMove => ({ tap: { x: arena.width / 2, y: arena.height / 2 } });

describeMinigame('clock-catch');
describeMinigame('clock-catch', { loser: tapper });

describe('clock catch rules', () => {
  const setup = () => createClockCatch({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: { speed: 1 }, rng: createRng(2) });

  it('says class 2 times in words', () => {
    expect(spoken({ hour: 7, minute: 0 })).toBe('7 giờ');
    expect(spoken({ hour: 8, minute: 30 })).toBe('8 giờ rưỡi');
    expect(spoken({ hour: 3, minute: 15 })).toBe('3 giờ 15 phút');
    expect(offset(710, 10)).toBe(20);
    expect(offset(10, 710)).toBe(-20);
  });

  it('scores a stop close to the time and winds back after a wrong one', () => {
    const game = setup();
    const target = minutesOf(game.state.target);
    game.state.minutes = target - TOLERANCE - 20;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 1, y: 1 }] });
    expect(game.state.phase).toBe('wrong');
    expect(game.score).toBe(0);
    for (let i = 0; i < 70; i += 1) game.step(1 / 60, NO_INPUT);
    expect(offset(game.state.minutes, target)).toBeGreaterThan(60);
    game.state.minutes = target - 3;
    game.state.phase = 'run';
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 1, y: 1 }] });
    expect(game.score).toBe(1);
    expect(game.state.minutes).toBe(target);
  });
});
