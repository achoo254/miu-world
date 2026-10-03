import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createRedLight, LAP_STEPS, PENALTY_STEPS } from './logic';

describeMinigame('red-light');

describe('red light rules', () => {
  const setup = () => createRedLight({ arena: { width: 863, height: 600 }, goal: 25, duration: 45, params: { turnSpeed: 1 }, rng: createRng(1) });
  const hold = { ...NO_INPUT, pointer: { x: 400, y: 500 } };

  it('walks while held and stands still when let go', () => {
    const game = setup();
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, hold);
    const walked = game.state.player.steps;
    expect(walked).toBeGreaterThan(1);
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.player.steps).toBe(walked);
  });

  it('sends a walker back three steps when the teddy sees her move', () => {
    const game = setup();
    game.state.player.steps = 10;
    game.state.phase = 'looking';
    game.state.phaseTime = 0.5;
    game.state.phaseLength = 2;
    game.step(1 / 60, hold);
    expect(game.state.player.steps).toBeCloseTo(10 - PENALTY_STEPS + 2.6 / 60, 5);
    expect(game.drainEvents().some((e) => e.type === 'hit')).toBe(true);
  });

  it('counts a lap at the line', () => {
    const game = setup();
    game.state.player.steps = LAP_STEPS - 0.01;
    game.state.phaseTime = 0;
    game.state.phaseLength = 3;
    game.step(1 / 60, hold);
    expect(game.state.lap).toBe(1);
    expect(game.score).toBe(LAP_STEPS);
  });

  it('is lost by walking all the time', async () => {
    const spec = MINIGAME_SPECS.get('red-light');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('red-light');
    const always = ({ arena }: { arena: { width: number; height: number } }) => ({ touch: { x: arena.width / 2, y: arena.height - 100 } });
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: always }).won).toBe(false);
  });
});
