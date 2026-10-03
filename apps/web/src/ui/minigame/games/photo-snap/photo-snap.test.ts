import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createPhotoSnap, FILM } from './logic';

describeMinigame('photo-snap');

describe('photo snap rules', () => {
  const setup = () => createPhotoSnap({ arena: { width: 863, height: 600 }, goal: 6, duration: 60, params: { speed: 1 }, rng: createRng(3) });
  const snap = { ...NO_INPUT, taps: [{ x: 400, y: 300 }] };

  it('takes a good photo of an animal that is up in the frame, and only once', () => {
    const game = setup();
    const h = game.state.hideouts[0];
    if (!h) throw new Error('no hideout');
    Object.assign(h, { x: game.state.frameX, cover: 'bush', up: 0.5, stay: 2, taken: false });
    game.step(1 / 60, snap);
    expect(game.score).toBe(1);
    game.step(1 / 60, snap);
    expect(game.score).toBe(1);
    expect(game.state.film).toBe(FILM - 2);
  });

  it('wastes film on an empty frame and stops when the roll is used up', () => {
    const game = setup();
    game.state.hideouts = [];
    for (let i = 0; i < FILM + 3; i += 1) game.step(1 / 60, snap);
    expect(game.score).toBe(0);
    expect(game.state.film).toBe(0);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
  });

  it('is lost by snapping all the time', async () => {
    const spec = MINIGAME_SPECS.get('photo-snap');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('photo-snap');
    const snapper = () => ({ tap: { x: 400, y: 300 } });
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: snapper }).won).toBe(false);
  });
});
