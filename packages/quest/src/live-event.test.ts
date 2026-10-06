import { describe, expect, it } from 'vitest';
import type { LiveEvent } from '@miu/schema/live-event';
import { DAY_MS, daysFor, eventStatus, inWindow, isEventOpen, vietnamDay, windowDays } from './live-event';

const event: Pick<LiveEvent, 'windows' | 'announceDays'> = {
  announceDays: 7,
  windows: [
    { kind: 'live', startsAt: '2026-10-06T00:00:00+07:00', endsAt: '2026-11-01T00:00:00+07:00' },
    { kind: 'commemorative', startsAt: '2027-09-01T00:00:00+07:00', endsAt: '2027-10-01T00:00:00+07:00' },
  ],
};

describe('event windows by the server clock', () => {
  it('is coming soon, and shown, within the announce days before it opens', () => {
    const status = eventStatus(event, new Date('2026-10-01T12:00:00+07:00'));
    expect(status.state).toBe('upcoming');
    expect(status.shown).toBe(true);
    expect(status.msUntilStart).toBe(4.5 * DAY_MS);
    expect(isEventOpen(event, new Date('2026-10-01T12:00:00+07:00'))).toBe(false);
  });

  it('is not shown long before it opens', () => {
    expect(eventStatus(event, new Date('2026-09-01T00:00:00+07:00')).shown).toBe(false);
  });

  it('opens at its start (Vietnam time) and closes at its end, exclusive', () => {
    expect(eventStatus(event, new Date('2026-10-05T23:59:59+07:00')).state).toBe('upcoming');
    expect(eventStatus(event, new Date('2026-10-06T00:00:00+07:00')).state).toBe('live');
    expect(eventStatus(event, new Date('2026-10-05T17:00:00Z')).state).toBe('live');
    expect(eventStatus(event, new Date('2026-10-31T23:59:59+07:00')).msLeft).toBe(1000);
    const after = eventStatus(event, new Date('2026-11-01T00:00:00+07:00'));
    expect(after.state).toBe('upcoming');
    expect(after.shown).toBe(false);
  });

  it('reopens as a commemorative window, then ends for good', () => {
    expect(eventStatus(event, new Date('2027-09-10T00:00:00+07:00')).state).toBe('commemorative');
    expect(isEventOpen(event, new Date('2027-09-10T00:00:00+07:00'))).toBe(true);
    expect(eventStatus(event, new Date('2027-10-01T00:00:00+07:00'))).toEqual({ state: 'ended', window: null, msLeft: null, msUntilStart: null, shown: false });
  });

  it('names the calendar days of a window in Vietnam time', () => {
    const [live] = event.windows;
    if (!live) throw new Error('no live window');
    expect(windowDays(live)).toEqual({ firstDay: '2026-10-06', lastDay: '2026-10-31' });
    expect(vietnamDay(Date.parse('2026-10-05T17:30:00Z'))).toBe('2026-10-06');
    expect(inWindow(live, new Date('2026-10-20T00:00:00+07:00'))).toBe(true);
  });

  it('counts any part of a day as a day', () => {
    expect(daysFor(1)).toBe(1);
    expect(daysFor(DAY_MS)).toBe(1);
    expect(daysFor(DAY_MS + 1)).toBe(2);
  });
});
