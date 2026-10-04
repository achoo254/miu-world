// The NPC's picture in quest scenes: an icon for the characters that have one (by map target or by
// name), otherwise the first letter of their name on a round parchment badge.
import type { QuestStepPublic } from '@miu/schema/content';
import { Icon } from '../kit/art';
import type { UiIcon } from '../kit/ui-art';

/** Picture for each speaking target on the maps, and for the textbook cast by name. */
const BY_TARGET: Record<string, UiIcon> = {
  'parrot-guide': 'parrot',
  'animal-beaver': 'beaver',
  'ancient-tree': 'tree',
};

const TARGET_PREFIXES: ReadonlyArray<[string, UiIcon]> = [
  ['animal-panda', 'panda'],
  ['animal-polar', 'bear'],
  ['animal-dog', 'dog'],
  ['animal-cat', 'catFace'],
  ['animal-bunny', 'rabbit'],
  ['animal-fox', 'fox'],
  ['animal-penguin', 'penguin'],
  ['animal-monkey', 'monkey'],
  ['animal-crab', 'crab'],
  ['animal-beaver', 'beaver'],
  ['animal-parrot', 'parrot'],
  ['animal-chick', 'chicken'],
  ['animal-pig', 'pig'],
  ['animal-cow', 'cow'],
];

const BY_NAME: ReadonlyArray<[RegExp, UiIcon]> = [
  [/^vẹt/i, 'parrot'],
  [/^hải ly/i, 'beaver'],
  [/^cây cổ thụ/i, 'tree'],
  [/^gấu trúc/i, 'panda'],
  [/^gấu/i, 'bear'],
  [/^(chó|cún)/i, 'dog'],
  [/^mèo/i, 'catFace'],
  [/^thỏ/i, 'rabbit'],
  [/^cáo/i, 'fox'],
  [/^chuột túi/i, 'kangaroo'],
  [/^cánh cụt/i, 'penguin'],
  [/^hải cẩu/i, 'seal'],
  [/^khỉ/i, 'monkey'],
  [/^cua/i, 'crab'],
  [/^(họa mi|chim)/i, 'bird'],
  [/^dơi/i, 'bat'],
  [/^rô bốt/i, 'robot'],
  [/^người tuyết/i, 'snowman'],
  [/^(nông dân|bác nông dân)/i, 'farmer'],
  [/^gà/i, 'chicken'],
  [/^(heo|lợn)/i, 'pig'],
  [/^bò/i, 'cow'],
];

export function npcIcon(name: string, target?: string): UiIcon | null {
  if (target) {
    const direct = BY_TARGET[target];
    if (direct) return direct;
    const byPrefix = TARGET_PREFIXES.find(([p]) => target.includes(p))?.[1];
    if (byPrefix) return byPrefix;
  }
  return BY_NAME.find(([pattern]) => pattern.test(name))?.[1] ?? null;
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
  return speakerBefore(steps, steps.findIndex((s) => s.id === stepId));
}

/** Who cheers when the quest is done: the last character who spoke in it, if any. */
export function lastSpeakerOf(steps: readonly QuestStepPublic[]): { name: string; target?: string } | null {
  return speakerBefore(steps, steps.length);
}

function speakerBefore(steps: readonly QuestStepPublic[], index: number): { name: string; target?: string } | null {
  for (let i = index - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (step?.kind !== 'dialogue') continue;
    const last = step.lines[step.lines.length - 1];
    if (last) return { name: last.speaker, target: step.target };
  }
  return null;
}
