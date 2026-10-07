// Ném bùa: the answers are shields round the boss; the child pulls the charm in her hand back like a slingshot and lets
// go toward a shield (a dotted line shows the aim), or drops it right on a shield, or simply taps a shield (the charm
// flies there by itself). Keyboard: Tab to a shield, Enter.
import { useRef } from 'react';
import { useT } from '../../../i18n/use-t';
import { MoveField } from './move-field';
import { MoveTarget, centreOf, choicesOf, isOver, slotsBeside, targetState, type MoveProps, type ScreenPoint } from './move-target';
import { useDrag, type DragOffset } from './use-drag';

/** A pull shorter than this (px) is no throw. */
const MIN_PULL = 24;
/** The shield thrown at lies within this angle of the aim (radians, about 35°). */
const AIM_CONE = 0.61;
/** The charm follows the pull this far at most (px). */
const MAX_PULL = 60;

/** The shield a release picks: the one under the finger, else the one the pull aims at. */
export function flingTarget(shields: ReadonlyMap<string, Element>, from: ScreenPoint, end: ScreenPoint, pull: DragOffset): string | null {
  for (const [id, el] of shields) if (isOver(el, end, 8)) return id;
  if (Math.hypot(pull.dx, pull.dy) < MIN_PULL) return null;
  const aim = Math.atan2(-pull.dy, -pull.dx);
  let best: { id: string; off: number } | null = null;
  for (const [id, el] of shields) {
    const c = centreOf(el);
    const toward = Math.atan2(c.y - from.y, c.x - from.x);
    const off = Math.abs(Math.atan2(Math.sin(toward - aim), Math.cos(toward - aim)));
    if (off <= AIM_CONE && (!best || off < best.off)) best = { id, off };
  }
  return best?.id ?? null;
}

export function FlingMove(props: MoveProps) {
  const { t } = useT();
  const shields = useRef(new Map<string, HTMLButtonElement>());
  const pick = (id: string): void => {
    const el = shields.current.get(id);
    if (el) props.onPick(id, centreOf(el));
  };
  // Aimed from where the finger went down on the charm.
  const drag = useDrag(
    (end, pull) => {
      const id = flingTarget(shields.current, { x: end.x - pull.dx, y: end.y - pull.dy }, end, pull);
      if (id) pick(id);
    },
    props.locked,
    {
      reach: MAX_PULL,
      // The dotted aim, the way the charm would fly (none with less motion).
      onMove: (pull, charm) => {
        const aim = charm.querySelector<HTMLElement>('.duel-aim');
        if (!aim) return;
        const length = pull ? Math.min(220, Math.hypot(pull.dx, pull.dy) * 2.5) : 0;
        aim.hidden = props.calm || !pull || length <= MIN_PULL;
        if (pull) {
          aim.style.width = `${length}px`;
          aim.style.rotate = `${Math.atan2(-pull.dy, -pull.dx)}rad`;
        }
      },
    },
  );
  const slots = slotsBeside(props.turn.choices.length);
  return (
    <MoveField
      props={props}
      targets={choicesOf(props.turn).map(({ choice, en }, i) => (
        <MoveTarget
          key={choice.id}
          ref={(el) => {
            if (el) shields.current.set(choice.id, el);
            else shields.current.delete(choice.id);
          }}
          kind="shield"
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
          className={`duel-piece duel-piece--charm${props.locked ? ' duel-piece--locked' : ''}`}
          data-id="boss-charm"
          role="img"
          aria-label={t('boss.charm')}
          {...drag}
        >
          <span className="duel-aim" hidden />
        </div>
      }
    />
  );
}
