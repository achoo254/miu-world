// Short message over the game (found a clue, a line from an NPC): announced politely to screen
// readers, gone after a few seconds or when the next one replaces it. A bilingual line shows in the chosen
// display mode (both lines in Song ngữ).
import { useEffect } from 'react';
import type { Bilingual } from '../i18n/i18n';
import { Bi } from '../i18n/use-t';
import './toast.css';

export function Toast({ message, onDone, ms = 3200 }: { message: string | Bilingual; onDone: () => void; ms?: number }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(timer);
  }, [message, onDone, ms]);
  return (
    <p className="toast" role="status" aria-live="polite" data-id="toast">
      {typeof message === 'string' ? message : <Bi vi={message.vi} en={message.en} />}
    </p>
  );
}
