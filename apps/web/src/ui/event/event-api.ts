// Limited-time events as the server sees them now (its clock decides every state, never this device's): the list for
// Home and the play screen, one event for its page, refreshed when the server says the state changes next.
import { useCallback, useEffect, useState } from 'react';
import { LiveEventDto, LiveEventListResponse } from '@miu/schema/live-event';
import { api, errorMessage } from '../api-client';

export const loadEvents = (): Promise<LiveEventListResponse> => api('GET', '/events', LiveEventListResponse);
export const loadEvent = (id: string): Promise<LiveEventDto> => api('GET', `/events/${encodeURIComponent(id)}`, LiveEventDto);

/** The longest wait before asking again (a timer is never set for days). */
const MAX_WAIT_MS = 60 * 60 * 1000;
/** A little after the server's moment, so its clock has passed it when we ask. */
const AFTER_CHANGE_MS = 2000;

/** Whether an event's quests may be played now. */
export const isOpen = (event: Pick<LiveEventDto, 'state'>): boolean => event.state === 'live' || event.state === 'commemorative';

/**
 * The events shown now, asked for again when one opens or closes (`changesInMs`, from the server) and on `refresh()`.
 * `null` until the first answer; an error leaves the last list (Home simply shows no banner).
 */
export function useLiveEvents(): { events: LiveEventDto[] | null; error: string | null; refresh: () => void } {
  const [events, setEvents] = useState<LiveEventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const refresh = useCallback(() => setRound((r) => r + 1), []);
  useEffect(() => {
    let alive = true;
    loadEvents().then(
      (res) => {
        if (!alive) return;
        setEvents(res.events);
        setError(null);
      },
      (err: unknown) => alive && setError(errorMessage(err)),
    );
    return () => {
      alive = false;
    };
  }, [round]);
  useEffect(() => {
    if (!events || events.length === 0) return;
    const wait = Math.min(MAX_WAIT_MS, Math.min(...events.map((e) => e.changesInMs)) + AFTER_CHANGE_MS);
    const timer = window.setTimeout(refresh, wait);
    return () => window.clearTimeout(timer);
  }, [events, refresh]);
  return { events, error, refresh };
}

/** `YYYY-MM-DD` as the player reads a date ("31/10"). */
export function shortDate(day: string): string {
  const [, month, date] = day.split('-');
  return `${Number(date)}/${Number(month)}`;
}

/** The event's next quest to play: the first not done in this window, else the first. */
export function nextEventQuest(event: Pick<LiveEventDto, 'quests'>): LiveEventDto['quests'][number] | null {
  return event.quests.find((q) => !q.done) ?? event.quests[0] ?? null;
}
