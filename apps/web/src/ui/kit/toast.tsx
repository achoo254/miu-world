// Short message over the game (found a clue, a line from an NPC): announced politely to screen
// readers, gone after a few seconds or when the next one replaces it.
import { useEffect } from 'react';
import './toast.css';

export function Toast({ message, onDone, ms = 3200 }: { message: string; onDone: () => void; ms?: number }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(timer);
  }, [message, onDone, ms]);
  return (
    <p className="toast" role="status" aria-live="polite" data-id="toast">
      {message}
    </p>
  );
}
