// Lines the screen says again and again, in pools that rotate without repeats (owner rule: nothing
// that loops may repeat back-to-back). `{name}` is the player's character name; `{who}` the target.
// The words live in the locales (`loop.*`), each line with its English twin at the same position.
import type { InteractableKind } from '../../game-bridge/game-store';
import { linesOf, mapBoth, type Bilingual } from '../i18n/i18n';

/** Talking to someone (or touching something) whose turn in the quest has not come yet. */
export const NOT_NOW_LINES: Readonly<Record<InteractableKind, readonly Bilingual[]>> = {
  npc: linesOf('loop.notNow.npc'),
  object: linesOf('loop.notNow.object'),
  riddle: linesOf('loop.notNow.riddle'),
  chest: linesOf('loop.notNow.chest'),
  gate: linesOf('loop.notNow.gate'),
};

/** A clue just found, when the server sends no line of its own. */
export const FOUND_LINES: readonly Bilingual[] = linesOf('loop.found');

export function fillLine(line: Bilingual, who: string, name: string): Bilingual {
  return mapBoth(line, (text) => text.replaceAll('{who}', who).replaceAll('{name}', name));
}

/** A wrong answer on a step whose content has no feedback pool of its own. */
export const TRY_AGAIN_LINES: readonly Bilingual[] = linesOf('loop.tryAgain');

/** Touching anything once the chapter is done (the child came back to wander). */
export const DONE_LINES: readonly Bilingual[] = linesOf('loop.done');
