// Nạp chiêu: the answers are runes round the boss. Tapping one picks it and fills a third of its ring; tapping it again
// (or "Nạp chiêu" at her hand) fills the rest, and the blow flies by itself once the ring is full. Nothing drains with
// time; picking another rune starts that one from the first third. Keyboard: Tab to a rune, Enter three times.
import { useRef, useState, type CSSProperties } from 'react';
import { T, useT } from '../../../i18n/use-t';
import { buttonClass } from '../../../kit/button';
import { MoveField } from './move-field';
import { MoveTarget, centreOf, choicesOf, slotsBeside, targetState, type MoveProps } from './move-target';

/** Taps that fill a rune. */
export const CHARGE_TAPS = 3;

export function ChargeMove(props: MoveProps) {
  const { t } = useT();
  const runes = useRef(new Map<string, HTMLButtonElement>());
  const [charging, setCharging] = useState<{ id: string; taps: number } | null>(null);
  const tap = (id: string): void => {
    if (props.locked) return;
    const taps = charging?.id === id ? charging.taps + 1 : 1;
    if (taps < CHARGE_TAPS) {
      setCharging({ id, taps });
      return;
    }
    setCharging(null);
    const el = runes.current.get(id);
    if (el) props.onPick(id, centreOf(el));
  };
  // A blow that bounced leaves no charge behind.
  const [seenBounce, setSeenBounce] = useState(props.bounced);
  if (seenBounce !== props.bounced) {
    setSeenBounce(props.bounced);
    setCharging(null);
  }
  const slots = slotsBeside(props.turn.choices.length);
  return (
    <MoveField
      props={props}
      targets={choicesOf(props.turn).map(({ choice, en }, i) => {
        const taps = charging?.id === choice.id ? charging.taps : 0;
        return (
          <MoveTarget
            key={choice.id}
            ref={(el) => {
              if (el) runes.current.set(choice.id, el);
              else runes.current.delete(choice.id);
            }}
            kind="rune"
            choice={choice}
            en={en}
            fill={props.fill}
            state={targetState(props, choice.id)}
            slot={slots[i] ?? { x: 0, y: 0 }}
            style={{ '--charge': taps / CHARGE_TAPS } as CSSProperties}
            onClick={() => tap(choice.id)}
          >
            <span className="duel-charge-ring" data-taps={taps} aria-hidden="true" />
          </MoveTarget>
        );
      })}
      source={
        <button
          type="button"
          className={buttonClass('primary')}
          data-id="boss-charge"
          disabled={props.locked || charging === null}
          aria-label={charging ? `${t('boss.charge')} · ${t('boss.charged', { n: charging.taps, max: CHARGE_TAPS })}` : t('boss.charge')}
          onClick={() => charging && tap(charging.id)}
        >
          <T k="boss.charge" />
        </button>
      }
    />
  );
}
