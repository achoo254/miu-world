// When a limited-time event is on, from the server's clock (never the player's device): which window is open now,
// the next one, and how long until either. Pure, so the server and its tests share it.
import type { EventWindow, LiveEvent } from '@miu/schema/live-event';

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Vietnam is UTC+7 all year (no daylight saving). */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * `live` / `commemorative`: a window of that kind is open now; `upcoming`: none is open, a later one will be;
 * `ended`: no window is left.
 */
export type EventState = 'upcoming' | 'live' | 'commemorative' | 'ended';

export interface EventStatus {
  state: EventState;
  /** The open window, else the next one (null once every window is over). */
  window: EventWindow | null;
  /** Milliseconds until the open window closes (null when none is open). */
  msLeft: number | null;
  /** Milliseconds until the next window opens (null while one is open, or when none is left). */
  msUntilStart: number | null;
  /** Whether players see it now: a window is open, or the next one opens within the event's `announceDays`. */
  shown: boolean;
}

export function eventStatus(event: Pick<LiveEvent, 'windows' | 'announceDays'>, now: Date): EventStatus {
  const at = now.getTime();
  for (const window of event.windows) {
    const start = Date.parse(window.startsAt);
    const end = Date.parse(window.endsAt);
    if (at >= start && at < end) return { state: window.kind, window, msLeft: end - at, msUntilStart: null, shown: true };
  }
  const next = event.windows.find((w) => Date.parse(w.startsAt) > at) ?? null;
  if (!next) return { state: 'ended', window: null, msLeft: null, msUntilStart: null, shown: false };
  const msUntilStart = Date.parse(next.startsAt) - at;
  return { state: 'upcoming', window: next, msLeft: null, msUntilStart, shown: msUntilStart <= event.announceDays * DAY_MS };
}

/** Whether the event's quests may be played now (a live or commemorative window is open). */
export function isEventOpen(event: Pick<LiveEvent, 'windows' | 'announceDays'>, now: Date): boolean {
  const { state } = eventStatus(event, now);
  return state === 'live' || state === 'commemorative';
}

/** The calendar day (Vietnam time, `YYYY-MM-DD`) a moment falls on. */
export function vietnamDay(ms: number): string {
  return new Date(ms + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}

/** First and last calendar day of a window in Vietnam time (`endsAt` is exclusive: the last day is the one before it). */
export function windowDays(window: EventWindow): { firstDay: string; lastDay: string } {
  return { firstDay: vietnamDay(Date.parse(window.startsAt)), lastDay: vietnamDay(Date.parse(window.endsAt) - 1) };
}

/** Whole days to show for a span ("còn 3 ngày"): any part of a day counts as one, never below 1 while time is left. */
export function daysFor(ms: number): number {
  return Math.max(1, Math.ceil(ms / DAY_MS));
}

/** Whether a moment lies inside a window (start inclusive, end exclusive). */
export function inWindow(window: EventWindow, at: Date): boolean {
  const t = at.getTime();
  return t >= Date.parse(window.startsAt) && t < Date.parse(window.endsAt);
}
