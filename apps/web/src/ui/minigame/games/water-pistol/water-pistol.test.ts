import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createWaterPistol } from './logic';

describeMinigame('water-pistol');

describe('water pistol rules', () => {
  const setup = () => createWaterPistol({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: { speed: 1 }, rng: createRng(6) });

  it('knocks down a target held in the jet and scores a bullseye three', () => {
    const game = setup();
    const row = game.state.rows[0];
    if (!row) throw new Error('no row');
    row.vx = 0;
    game.state.targets = [{ kind: 'bullseye', row: 0, x: 400, wet: 0, down: -1 }];
    game.state.aim = { x: 400, y: row.y };
    for (let i = 0; i < 25; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 400, y: row.y } });
    expect(game.score).toBe(3);
  });

  it('runs dry when the finger never lifts, and refills once it does', () => {
    const game = setup();
    for (let i = 0; i < 60 * 3; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 10, y: 590 } });
    expect(game.state.dry).toBe(true);
    expect(game.state.spraying).toBe(false);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.dry).toBe(false);
    expect(game.state.water).toBeGreaterThan(0.5);
  });
});

describe('water pistol difficulty', () => {
  it('is not won by holding the jet still on one shelf: aiming matters', async () => {
    const { loadMinigame, MINIGAME_SPECS } = await import('../../registry');
    const { playRound } = await import('../../testing/play-round');
    const spec = MINIGAME_SPECS.get('water-pistol');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('water-pistol');
    const arena = { width: 863, height: 600 };
    // Sprays 2.4 s, rests 1.6 s, always at the middle of the middle shelf.
    const camper = ({ time }: { time: number }) => (time % 4 < 2.4 ? { touch: { x: arena.width / 2, y: 110 + 70 + 95 } } : {});
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena, seed, player: camper }).won).toBe(false);
  });
});
