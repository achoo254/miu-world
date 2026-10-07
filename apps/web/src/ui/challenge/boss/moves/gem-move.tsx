// Kéo ngọc: the answers are slots under the boss's feet; the child carries the power gem from her hand onto a slot
// (it follows her finger), or taps a slot and the gem flies there by itself. Keyboard: Tab to a slot, Enter.
import { useRef } from 'react';
import { useT } from '../../../i18n/use-t';
import { MoveField } from './move-field';
import { MoveTarget, centreOf, choicesOf, isOver, targetState, type MoveProps } from './move-target';
import { useDrag } from './use-drag';

/** The slots in a row under the boss (CSS px from its middle). */
export function slotsUnder(count: number): Array<{ x: number; y: number }> {
  const gap = count <= 2 ? 140 : 115;
  return Array.from({ length: count }, (_, i) => ({ x: Math.round((i - (count - 1) / 2) * gap), y: 95 }));
}

export function GemMove(props: MoveProps) {
  const { t } = useT();
  const slotEls = useRef(new Map<string, HTMLButtonElement>());
  const pick = (id: string): void => {
    const el = slotEls.current.get(id);
    if (el) props.onPick(id, centreOf(el));
  };
  const drag = useDrag((end) => {
    for (const [id, el] of slotEls.current) {
      if (isOver(el, end, 24)) {
        pick(id);
        return;
      }
    }
  }, props.locked);
  const slots = slotsUnder(props.turn.choices.length);
  return (
    <MoveField
      props={props}
      targets={choicesOf(props.turn).map(({ choice, en }, i) => (
        <MoveTarget
          key={choice.id}
          ref={(el) => {
            if (el) slotEls.current.set(choice.id, el);
            else slotEls.current.delete(choice.id);
          }}
          kind="slot"
          choice={choice}
          en={en}
          fill={props.fill}
          state={targetState(props, choice.id)}
          slot={slots[i] ?? { x: 0, y: 0 }}
          onClick={() => pick(choice.id)}
        />
      ))}
      source={
        <div
          className={`duel-piece duel-piece--gem${props.locked ? ' duel-piece--locked' : ''}`}
          data-id="boss-gem"
          role="img"
          aria-label={t('boss.gem')}
          {...drag}
        />
      }
    />
  );
}
