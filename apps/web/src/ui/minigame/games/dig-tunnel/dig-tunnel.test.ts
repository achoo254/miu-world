import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cellCentreOf, createDigTunnel, WOBBLE } from './logic';

describeMinigame('dig-tunnel');

describe('dig tunnel rules', () => {
  const setup = () => {
    const game = createDigTunnel({ arena: { width: 863, height: 600 }, goal: 10, duration: 90, params: {}, rng: createRng(5) });
    const { cols } = game.state;
    // A plain field: earth everywhere, one gem and one rock where the tests want them.
    game.state.tiles = game.state.tiles.map((_, i) => (i < cols ? 'empty' : 'dirt'));
    game.state.rocks = [];
    // A gem far away, so the field is not laid again.
    game.state.tiles[game.state.tiles.length - 1] = 'gem';
    return game;
  };
  const run = (game: ReturnType<typeof setup>, seconds: number, to?: number) => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, to === undefined ? NO_INPUT : { ...NO_INPUT, pointer: cellCentreOf(game.state, to) });
  };

  it('digs down to a gem and collects it', () => {
    const game = setup();
    const gem = game.state.player + game.state.cols * 2;
    game.state.tiles[gem] = 'gem';
    run(game, 1, gem);
    expect(game.score).toBe(1);
    expect(game.state.tiles[gem]).toBe('empty');
  });

  it('drops a rock whose earth was dug out, on a child who stays under it', () => {
    const game = setup();
    const { cols } = game.state;
    const rockCell = game.state.player + cols;
    game.state.tiles[rockCell] = 'rock';
    game.state.rocks.push({ cell: rockCell, wobble: -1, falling: false });
    // Dig round the rock to the square under it, and wait there.
    const under = rockCell + cols;
    game.state.tiles[game.state.player + 1] = 'empty';
    game.state.tiles[rockCell + 1] = 'empty';
    game.state.tiles[under] = 'empty';
    game.state.player = under;
    game.state.from = under;
    run(game, WOBBLE + 0.4);
    expect(game.lives).toBe(2);
  });
});
