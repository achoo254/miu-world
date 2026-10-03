import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createWhatsMissing } from './logic';

describeMinigame('whats-missing');

describe('whats missing rules', () => {
  const setup = () => createWhatsMissing({ arena: { width: 863, height: 600 }, goal: 6, duration: 100, params: { lookSeconds: 5 }, rng: createRng(9) });
  const toPick = (game: ReturnType<typeof setup>): void => {
    for (let i = 0; i < 60 * 8 && game.state.phase !== 'pick'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('takes exactly one thing away, offers it among three choices, and scores it', () => {
    const game = setup();
    toPick(game);
    const { tray, after, missing, choices } = game.state;
    expect(after.filter((t) => t !== null)).toHaveLength(tray.length - 1);
    expect(after).not.toContain(missing);
    expect(new Set(choices).size).toBe(3);
    const slot = game.state.choiceSlots[choices.indexOf(missing)];
    if (!slot) throw new Error('no slot');
    game.step(1 / 60, { ...NO_INPUT, taps: [slot] });
    expect(game.score).toBe(1);
  });

  it('a wrong choice scores nothing and the round moves on', () => {
    const game = setup();
    toPick(game);
    const wrong = game.state.choices.findIndex((c) => c !== game.state.missing);
    const slot = game.state.choiceSlots[wrong];
    if (!slot) throw new Error('no slot');
    game.step(1 / 60, { ...NO_INPUT, taps: [slot] });
    expect(game.score).toBe(0);
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.round).toBe(1);
  });

  it('is lost by guessing at random', async () => {
    const spec = MINIGAME_SPECS.get('whats-missing');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('whats-missing');
    let n = 0;
    const guesser = ({ arena }: { arena: { width: number; height: number } }) => {
      n += 1;
      return { tap: { x: arena.width / 2 + ((n % 3) - 1) * Math.min(200, arena.width / 3.4), y: arena.height - 130 } };
    };
    const wins = [1, 2, 3, 4, 5].filter((seed) => playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: guesser }).won);
    expect(wins.length).toBeLessThanOrEqual(1);
  });
});
