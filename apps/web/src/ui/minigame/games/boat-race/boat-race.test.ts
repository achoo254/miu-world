import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createBoatRace } from './logic';

describeMinigame('boat-race');

describe('boat race rules', () => {
  const setup = () => createBoatRace({ arena: { width: 863, height: 600 }, goal: 2, duration: 60, params: { rivals: 1 }, rng: createRng(1) });
  const tap = (x: number) => ({ ...NO_INPUT, taps: [{ x, y: 500 }] });
  const wait = (game: ReturnType<typeof setup>, frames: number): void => {
    for (let i = 0; i < frames; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('pushes most for left-right strokes on the beat, little for the same side or a rush', () => {
    const game = setup();
    game.step(1 / 60, tap(100));
    wait(game, 24);
    const before = game.state.player.v;
    game.step(1 / 60, tap(700));
    expect(game.state.strokeKind).toBe('good');
    const good = game.state.player.v - before;
    wait(game, 24);
    const v = game.state.player.v;
    game.step(1 / 60, tap(700));
    expect(game.state.strokeKind).toBe('same');
    expect(game.state.player.v - v).toBeLessThan(good / 2);
    game.step(1 / 60, tap(100));
    expect(game.state.strokeKind).toBe('rushed');
  });

  it('scores the place at the finish and ends the round', async () => {
    const spec = MINIGAME_SPECS.get('boat-race');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('boat-race');
    const result = playRound(game, spec, { arena: { width: 863, height: 600 }, seed: 1, player: 'bot' });
    expect(result.endedEarly).toBe(true);
    expect(result.score).toBe(3);
    // Tapping as fast as possible only splashes: the rivals win.
    const frantic = ({ time }: { time: number }) => ({ tap: { x: Math.floor(time * 10) % 2 === 0 ? 100 : 700, y: 500 } });
    expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed: 1, player: frantic }).won).toBe(false);
  });
});
