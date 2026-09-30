// A right answer: stars and sparkles burst from the middle of the screen over the world and fade, the
// moment the step screen closes. Decorative only (hidden from screen readers); gone after a second.
import { useEffect, type CSSProperties } from 'react';
import { Icon } from '../kit/art';

const PIECES = 12;

export function AnswerBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1000);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="answer-burst" aria-hidden="true" data-id="answer-burst">
      {Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * Math.PI * 2 + (i % 2) * 0.2;
        const reach = i % 3 === 0 ? 30 : 22;
        const style = {
          '--burst-x': `${Math.cos(angle) * reach}vmin`,
          '--burst-y': `${Math.sin(angle) * reach}vmin`,
          '--burst-turn': `${(i % 2 ? 1 : -1) * (120 + i * 15)}deg`,
          animationDelay: `${(i % 4) * 30}ms`,
        } as CSSProperties;
        return (
          <span key={i} style={style}>
            <Icon name={i % 3 === 0 ? 'sparkles' : 'glowingStar'} size={i % 3 === 0 ? 40 : 56} />
          </span>
        );
      })}
    </div>
  );
}
