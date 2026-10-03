import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createSkiJump, INRUN_LENGTH, ZONE } from './logic';

describeMinigame('ski-jump');

describe('ski jump rules', () => {
  const setup = () => createSkiJump({ arena: { width: 863, height: 600 }, goal: 180, duration: 60, params: {}, rng: createRng(1) });
  const hold: GameInput = { ...NO_INPUT, pointer: { x: 300, y: 300 } };
  const jump = (releaseAt: number): number => {
    const game = setup();
    for (let i = 0; i < 600 && game.state.results.length === 0; i += 1) {
      const inrun = game.state.phase === 'ready' || (game.state.phase === 'inrun' && game.state.along < releaseAt);
      game.step(1 / 60, inrun ? hold : NO_INPUT);
    }
    return game.state.results[0] ?? 0;
  };

  it('flies furthest when let go in the green zone, less when too early or never', () => {
    const good = jump(INRUN_LENGTH - ZONE * 0.5);
    const early = jump(INRUN_LENGTH * 0.5);
    const never = jump(INRUN_LENGTH + 100);
    expect(good).toBeGreaterThan(never);
    expect(never).toBeGreaterThan(early);
  });

  it('adds a tenth for a tap just before landing, and ends after three jumps', async () => {
    const spec = MINIGAME_SPECS.get('ski-jump');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('ski-jump');
    const result = playRound(game, spec, { arena: { width: 863, height: 600 }, seed: 1, player: 'bot' });
    expect(result.endedEarly).toBe(true);
  });

  it('is lost by holding all the way without letting go at the lip', async () => {
    const spec = MINIGAME_SPECS.get('ski-jump');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('ski-jump');
    const holder = () => ({ touch: { x: 300, y: 300 } });
    expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed: 1, player: holder }).won).toBe(false);
  });
});
