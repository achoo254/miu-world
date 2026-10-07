// Short message over the game (found a clue, a line from an NPC): announced politely to screen
// readers, gone after a few seconds or when the next one replaces it. A bilingual line shows in the chosen
// display mode (both lines in Song ngữ).
import { useEffect } from 'react';
import type { Bilingual } from '../i18n/i18n';
import { Bi } from '../i18n/use-t';
import './toast.css';

/**
 * The owner's update that clears `shown` only while it is still the line on screen. A line's timer can fire after the
 * owner has set the next line but before the screen has drawn it (a busy page): clearing whatever is current then
 * would drop the new line unseen.
 */
export function clearShown<T>(shown: T): (current: T | null) => T | null {
  return (current) => (current === shown ? null : current);
}

/** `onDone` gets the line whose time ran out; clear it with `clearShown`, never by setting nothing. */
export function Toast<T extends string | Bilingual>({ message, onDone, ms = 3200 }: { message: T; onDone: (shown: T) => void; ms?: number }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDone(message), ms);
    return () => window.clearTimeout(timer);
  }, [message, onDone, ms]);
  return (
    <p className="toast" role="status" aria-live="polite" data-id="toast">
      {typeof message === 'string' ? message : <Bi vi={message.vi} en={message.en} />}
    </p>
  );
}
