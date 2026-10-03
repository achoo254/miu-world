// One file per minigame in content/minigames/<id>.json: what the how-to card says and how a round is set up.
// The game's code lives in apps/web/src/ui/minigame/games/<id>/ (docs/minigames.md); the server catalogue
// and `pnpm content:check` read these files to check every quest's minigame step against its game.
import { z } from 'zod';
import { ContentId, MAX_MINIGAME_SCORE, MinigameParamValue, MinigameParamKey, type MinigameParams } from './content';

/** Gestures a game reads (shown on its how-to card); every one is a single finger on a touch screen. */
export const MINIGAME_CONTROLS = ['tap', 'drag', 'swipe', 'hold'] as const;
export type MinigameControl = (typeof MINIGAME_CONTROLS)[number];

const Text = z.string().trim().min(1);

export const MinigameSpec = z.strictObject({
  /** The file name and the game's folder name. */
  id: ContentId,
  /** Shown on the banner and in the quest list ("Hứng trứng"). */
  name: Text.max(40),
  /** Mechanic family (runner, catch, aim, sports…): no two games of the 100 should play the same way. */
  family: ContentId,
  /** One to three short lines for the how-to card; `{name}` is the child's character. */
  howTo: z.array(Text.max(90)).min(1).max(3),
  controls: z.array(z.enum(MINIGAME_CONTROLS)).min(1),
  /** Length of a round in seconds. */
  duration: z.number().int().min(15).max(120),
  /**
   * The standard goal: the bot test proves good play reaches it. A quest may ask for less, never for more
   * (raise this, and let the bot test prove it, for a harder quest).
   */
  goal: z.number().int().min(1).max(MAX_MINIGAME_SCORE),
  /** Tuning values with their defaults; a quest step may override any of them with a value of the same type. */
  params: z.record(MinigameParamKey, MinigameParamValue).default({}),
});
export type MinigameSpec = z.infer<typeof MinigameSpec>;

/** What is wrong with a quest step's game, goal and params for this game (empty when nothing). */
export function minigameStepIssues(spec: MinigameSpec | undefined, game: string, goal: number, params: MinigameParams): string[] {
  if (!spec) return [`plays unknown minigame ${game} (no content/minigames/${game}.json)`];
  const issues: string[] = [];
  if (goal > spec.goal) issues.push(`asks for ${goal} points, more than the ${spec.goal} the game ${game} is proven to reach`);
  for (const [key, value] of Object.entries(params)) {
    const known = spec.params[key];
    if (known === undefined) issues.push(`sets param ${key}, which the game ${game} does not declare`);
    else if (typeof known !== typeof value) issues.push(`sets param ${key} to a ${typeof value}, the game ${game} reads a ${typeof known}`);
  }
  return issues;
}
