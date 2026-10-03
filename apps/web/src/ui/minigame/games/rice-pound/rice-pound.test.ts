import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRicePound } from './logic';

/** Pounds ten times a second, never waiting for the friend. */
const masher = ({ arena }: BotContext): BotMove => ({ tap: { x: arena.width / 2, y: arena.height / 2 } });

describeMinigame('rice-pound');
describeMinigame('rice-pound', { loser: masher });

describe('rice pound rules', () => {
  const setup = () => createRicePound({ arena: { width: 863, height: 600 }, goal: 35, duration: 60, params: { speed: 1 }, rng: createRng(1) });
  const runTo = (game: ReturnType<typeof setup>, t: number) => {
    while (game.state.time < t - 1e-9) game.step(1 / 60, NO_INPUT);
  };

  it('takes turns: the friend, then the child', () => {
    const game = setup();
    game.step(1 / 60, NO_INPUT);
    const [first, second] = game.state.beats;
    expect(first?.mine).toBe(false);
    expect(second?.mine).toBe(true);
  });

  it('scores a tap on the child beat and knocks pestles on the friend beat', () => {
    const game = setup();
    game.step(1 / 60, NO_INPUT);
    const friend = game.state.beats.find((b) => !b.mine);
    const mine = game.state.beats.find((b) => b.mine);
    if (!friend || !mine) throw new Error('no beats');
    runTo(game, mine.at);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 1, y: 1 }] });
    expect(game.score).toBe(1);
    const nextFriend = game.state.beats.find((b) => !b.mine && b.at > game.state.time);
    if (!nextFriend) throw new Error('no friend beat');
    runTo(game, nextFriend.at);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 1, y: 1 }] });
    expect(game.score).toBe(1);
    expect(game.state.lastResult).toBe('clash');
  });
});
