// Chạm cầu: the answers are orbs drifting slowly round the boss (a lap takes 12 s; with less motion they stand still);
// a finger put down anywhere on the field stops the ring, and tapping an orb sends the blow at it. Keyboard: Tab, Enter.
import { useState } from 'react';
import { MoveField } from './move-field';
import { MoveTarget, centreOf, choicesOf, targetState, type MoveProps } from './move-target';

/** Radius of the ring round the boss (CSS px). */
const RING = 105;

/** Where each orb starts on the ring: evenly round it, the first at the top (two: one each side). */
export function orbitSlots(count: number): Array<{ x: number; y: number }> {
  const start = count === 2 ? Math.PI : -Math.PI / 2;
  return Array.from({ length: count }, (_, i) => {
    const a = start + (i / count) * Math.PI * 2;
    return { x: Math.round(Math.cos(a) * RING), y: Math.round(Math.sin(a) * RING) };
  });
}

export function OrbsMove(props: MoveProps) {
  const [held, setHeld] = useState(false);
  const slots = orbitSlots(props.turn.choices.length);
  return (
    <MoveField
      props={props}
      held={held}
      onHold={setHeld}
      targets={
        <div className="duel-ring">
          {choicesOf(props.turn).map(({ choice, en }, i) => (
            <div key={choice.id} className="duel-orbit" style={{ left: `${slots[i]?.x ?? 0}px`, top: `${slots[i]?.y ?? 0}px` }}>
              <div className="duel-orbit-upright">
                <MoveTarget
                  kind="orb"
                  choice={choice}
                  en={en}
                  fill={props.fill}
                  state={targetState(props, choice.id)}
                  slot={{ x: 0, y: 0 }}
                  onClick={(e) => props.onPick(choice.id, centreOf(e.currentTarget))}
                />
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}
