// The NPC's picture in quest scenes: an icon for the characters that have one (by map target or by
// name), otherwise the first letter of their name on a round parchment badge.
import type { QuestStepPublic } from '@miu/schema/content';
import { Icon } from '../kit/art';
import type { UiIcon } from '../kit/ui-art';

/** Picture for each speaking target on the maps, and for the textbook cast by name. */
const BY_TARGET: Record<string, UiIcon> = { 'parrot-guide': 'parrot', 'animal-beaver': 'beaver', 'ancient-tree': 'tree' };
const BY_NAME: ReadonlyArray<[RegExp, UiIcon]> = [
  [/^vẹt/i, 'parrot'],
  [/^hải ly/i, 'beaver'],
  [/^cây cổ thụ/i, 'tree'],
];

export function npcIcon(name: string, target?: string): UiIcon | null {
  const byTarget = target ? BY_TARGET[target] : undefined;
  return byTarget ?? BY_NAME.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

/** A short reaction on the portrait: a hop as a line starts, a jump for a right answer, a lean in to encourage. */
export type NpcReaction = 'speak' | 'cheer' | 'encourage';

export function NpcPortrait({
  name,
  target,
  size = 64,
  reaction,
  reactionKey,
}: {
  name: string;
  target?: string;
  size?: number;
  reaction?: NpcReaction;
  /** A new key replays the reaction (a new line, another try). */
  reactionKey?: string | number;
}) {
  const icon = npcIcon(name, target);
  return (
    <span key={reactionKey} className={`npc-portrait${reaction ? ` npc-portrait--${reaction}` : ''}`} aria-hidden="true" data-id="npc-portrait">
      {icon ? <Icon name={icon} size={size} /> : name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** Who asks a challenge: the last character who spoke before it in the quest, if any. */
export function presenterOf(steps: readonly QuestStepPublic[], stepId: string): { name: string; target?: string } | null {
  const index = steps.findIndex((s) => s.id === stepId);
  for (let i = index - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (step?.kind !== 'dialogue') continue;
    const last = step.lines[step.lines.length - 1];
    if (last) return { name: last.speaker, target: step.target };
  }
  return null;
}
