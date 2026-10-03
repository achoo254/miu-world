import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createDapNieu, potAt } from './logic';

describeMinigame('dap-nieu');

describe('dap nieu rules', () => {
  const setup = () => createDapNieu({ arena: { width: 863, height: 600 }, goal: 4, duration: 80, params: { lookSeconds: 3 }, rng: createRng(2) });
  const toBlind = (game: ReturnType<typeof setup>): void => {
    for (let i = 0; i < 60 * 4 && game.state.phase !== 'blind'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('breaks the pot with a swing right under it', () => {
    const game = setup();
    toBlind(game);
    game.state.playerX = potAt(game.state);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 10, y: 10 }] });
    expect(game.score).toBe(1);
    expect(game.state.phase).toBe('broken');
  });

  it('a miss shows the pot; a second miss ends that pot', () => {
    const game = setup();
    toBlind(game);
    game.state.playerX = potAt(game.state) + 300 > 820 ? potAt(game.state) - 300 : potAt(game.state) + 300;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 10, y: 10 }] });
    expect(game.state.phase).toBe('peek');
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 10, y: 10 }] });
    expect(game.state.phase).toBe('gone');
    expect(game.score).toBe(0);
  });

  it('a tap does not walk; a held finger does', () => {
    const game = setup();
    toBlind(game);
    const x = game.state.playerX;
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: x + 200, y: 300 }, holdTime: 0 });
    expect(game.state.playerX).toBe(x);
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: x + 200, y: 300 }, holdTime: 0.2 + i / 60 });
    expect(game.state.playerX).toBeGreaterThan(x);
  });

  it('is lost by swinging without walking', async () => {
    const spec = MINIGAME_SPECS.get('dap-nieu');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('dap-nieu');
    const swinger = () => ({ tap: { x: 300, y: 300 } });
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: swinger }).won).toBe(false);
  });
});
