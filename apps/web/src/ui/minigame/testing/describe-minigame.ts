// The bot test every game ships (games/<id>/<id>.test.ts calls `describeMinigame('<id>')`): on the three
// reference screens and several seeds, good play WINS, nobody touching LOSES, a seed always plays the same
// round, the round ends by its clock, and `draw` runs on every state of a round without throwing.
import { describe, expect, it } from 'vitest';
import { arenaFor, REFERENCE_SCREENS } from '../round';
import { loadMinigame, MINIGAME_SPECS } from '../registry';
import type { BotContext, BotMove } from '../types';
import { nullContext, playRound, testDrawView } from './play-round';

const SEEDS = [1, 2, 3, 4, 5];

export interface MinigameTestOptions {
  /** A player that must lose, when doing nothing at all would win this game (default: idle). */
  loser?: (context: BotContext) => BotMove;
}

export function describeMinigame(id: string, options: MinigameTestOptions = {}): void {
  describe(`minigame ${id}`, () => {
    const spec = MINIGAME_SPECS.get(id);

    it('has its file in content/minigames', () => {
      expect(spec?.id).toBe(id);
    });

    for (const screen of REFERENCE_SCREENS) {
      const { arena } = arenaFor(screen.width, screen.height);

      it(`is won by good play on ${screen.name} (${SEEDS.length} seeds)`, async () => {
        if (!spec) throw new Error(`no content/minigames/${id}.json`);
        const game = await loadMinigame(id);
        const scores = SEEDS.map((seed) => playRound(game, spec, { arena, seed, player: 'bot' }));
        expect(scores.map((r) => r.won), `bot scores ${scores.map((r) => r.score).join(', ')} for goal ${spec.goal}`).toEqual(SEEDS.map(() => true));
      });

      it(`is lost by ${options.loser ? 'a poor player' : 'nobody playing'} on ${screen.name}`, async () => {
        if (!spec) throw new Error(`no content/minigames/${id}.json`);
        const game = await loadMinigame(id);
        for (const seed of SEEDS) {
          const result = playRound(game, spec, { arena, seed, player: options.loser ?? 'idle' });
          expect(result.won, `seed ${seed} scored ${result.score} of ${spec.goal}`).toBe(false);
        }
      });
    }

    it('plays the same round from the same seed, and ends on time', async () => {
      if (!spec) throw new Error(`no content/minigames/${id}.json`);
      const game = await loadMinigame(id);
      const { arena } = arenaFor(1180, 820);
      const a = playRound(game, spec, { arena, seed: 42, player: 'bot' });
      const b = playRound(game, spec, { arena, seed: 42, player: 'bot' });
      expect(b).toEqual(a);
      expect(a.elapsed).toBeLessThanOrEqual(spec.duration + 1e-6);
      expect(Number.isInteger(a.score) && a.score >= 0).toBe(true);
    });

    it('draws every state of a round', async () => {
      if (!spec) throw new Error(`no content/minigames/${id}.json`);
      const game = await loadMinigame(id);
      const ctx = nullContext();
      for (const screen of REFERENCE_SCREENS) {
        const { arena } = arenaFor(screen.width, screen.height);
        playRound(game, spec, { arena, seed: 7, player: 'bot', onStep: (round) => round.game.draw(ctx, testDrawView(arena, round.elapsed)) });
      }
    });
  });
}
