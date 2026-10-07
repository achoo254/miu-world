// One answer of a boss question as something to play at (a shield, an orb, a slot, a rune): a real button, so a tap,
// a click and the keyboard (Tab, Enter) all pick it; the four moves differ only in how the child gets to "this one".
// Its text is the choice's, `{name}` filled, in the language mode; ≥ 48 px to touch.
import { forwardRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { BossTurn, DuelMove } from '@miu/schema/content';
import { mapBoth } from '../../../i18n/i18n';
import { Bi } from '../../../i18n/use-t';
import { twin } from '../../../quest/content-text';

/** `aimed`: the blow is on its way to it; `bounced`: the last blow at it missed (it wobbles); `locked`: not now. */
export type TargetState = 'idle' | 'aimed' | 'bounced' | 'locked';

/** A screen point (CSS px): where a blow is aimed. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** What every move gets from the fight. */
export interface MoveProps {
  move: DuelMove;
  turn: BossTurn;
  fill: (text: string) => string;
  /** `stage`: round the boss in the running world (positions from the game's anchors); `card`: laid out on the card. */
  mode: 'stage' | 'card';
  /** Less motion: nothing drifts, nothing flies. */
  calm: boolean;
  /** Nothing can be picked (a blow on its way, the server busy, someone else's turn). */
  locked: boolean;
  aimed: string | null;
  bounced: string | null;
  /** The child picked a choice; `at` is where it is on screen (the blow flies there). */
  onPick: (choiceId: string, at: ScreenPoint) => void;
}

/** The centre of an element on screen. */
export function centreOf(el: Element): ScreenPoint {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Whether a screen point falls on the element (with a margin of `slack` px all round: a finger is wide). */
export function isOver(el: Element, at: ScreenPoint, slack = 16): boolean {
  const r = el.getBoundingClientRect();
  return at.x >= r.left - slack && at.x <= r.right + slack && at.y >= r.top - slack && at.y <= r.bottom + slack;
}

/** The state each choice shows. */
export function targetState(props: Pick<MoveProps, 'locked' | 'aimed' | 'bounced'>, choiceId: string): TargetState {
  if (props.aimed === choiceId) return 'aimed';
  if (props.locked) return 'locked';
  return props.bounced === choiceId ? 'bounced' : 'idle';
}

export const MoveTarget = forwardRef<
  HTMLButtonElement,
  {
    kind: 'shield' | 'orb' | 'slot' | 'rune';
    choice: { id: string; text: string };
    en: string | undefined;
    fill: (text: string) => string;
    state: TargetState;
    /** Where it sits round the boss (CSS px from the boss), in the running world. */
    slot: { x: number; y: number };
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
    children?: ReactNode;
    style?: CSSProperties;
  }
>(function MoveTarget({ kind, choice, en, fill, state, slot, onClick, children, style }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`duel-target duel-target--${kind} duel-target--${state}`}
      data-id={`choice-${choice.id}`}
      data-state={state}
      disabled={state === 'locked' || state === 'aimed'}
      style={{ ...style, '--slot-x': `${slot.x}px`, '--slot-y': `${slot.y}px` } as CSSProperties}
      onClick={onClick}
    >
      {children}
      <span className="duel-target-text">
        <Bi {...mapBoth(twin(choice.text, en), fill)} />
      </span>
    </button>
  );
});

/** Where the targets sit round the boss: two beside it, a third under its feet (CSS px from its middle). */
export function slotsBeside(count: number): Array<{ x: number; y: number }> {
  if (count <= 2) return [{ x: -115, y: 0 }, { x: 115, y: 0 }];
  return [{ x: -115, y: -20 }, { x: 115, y: -20 }, { x: 0, y: 100 }, { x: 0, y: -110 }].slice(0, count);
}

/** The choices of a question with their English twins. */
export function choicesOf(turn: BossTurn): Array<{ choice: { id: string; text: string }; en: string | undefined }> {
  return turn.choices.map((choice, i) => ({ choice, en: turn.en?.choices[i] }));
}
