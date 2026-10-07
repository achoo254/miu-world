// Where a move's answers and its charm or gem sit: round the boss in the running world (`stage`: two anchors the game
// keeps over the boss and the child's hand), or laid out on the fight's card (`card`: the same pieces, still).
import type { ReactNode } from 'react';
import { useT } from '../../../i18n/use-t';
import type { MoveProps } from './move-target';
import { useDuelAnchors } from './use-duel-anchors';

export function MoveField({
  props,
  targets,
  source = null,
  held = false,
  onHold,
}: {
  props: Pick<MoveProps, 'move' | 'mode' | 'calm'>;
  targets: ReactNode;
  /** What the child plays with (the charm, the gem), at her hand. */
  source?: ReactNode;
  /** A finger is down on the field (the orbs stop circling meanwhile). */
  held?: boolean;
  onHold?: (held: boolean) => void;
}) {
  const { t } = useT();
  const { boss: setBossAnchor, player: setPlayerAnchor } = useDuelAnchors(props.mode === 'stage');
  return (
    <div
      className={`duel-field duel-field--${props.mode}`}
      data-id="boss-move"
      data-move={props.move}
      data-mode={props.mode}
      data-calm={props.calm ? '1' : '0'}
      data-held={held ? '1' : '0'}
      role="group"
      aria-label={t('boss.answers')}
      onPointerDown={onHold ? () => onHold(true) : undefined}
      onPointerUp={onHold ? () => onHold(false) : undefined}
      onPointerCancel={onHold ? () => onHold(false) : undefined}
      onPointerLeave={onHold ? () => onHold(false) : undefined}
    >
      <div className="duel-anchor duel-anchor--boss" ref={setBossAnchor}>
        {targets}
      </div>
      {source ? (
        <div className="duel-anchor duel-anchor--player" ref={setPlayerAnchor}>
          {source}
        </div>
      ) : null}
    </div>
  );
}
