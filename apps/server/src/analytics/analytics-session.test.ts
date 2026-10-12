import { describe, expect, it } from 'vitest';
import { AnalyticsSessions, IDS_IDLE_MS, MAX_SESSIONS } from './analytics-session';

const ids = (n: number) => ({ clientId: `${1_000_000_000 + n}.1760000000`, sessionId: 1_760_000_000 + n });

describe('GA ids kept per sign-in session', () => {
  it('finds the latest ids of an account and of a player', () => {
    const store = new AnalyticsSessions(() => 0);
    store.remember('s1', ids(1), { parentId: 'parent-a', childId: null });
    expect(store.forAccount('parent-a')).toEqual(ids(1));
    expect(store.forPlayer('child-a')).toBeNull();
    store.remember('s1', ids(2), { parentId: 'parent-a', childId: 'child-a' });
    expect(store.forAccount('parent-a')).toEqual(ids(2));
    expect(store.forPlayer('child-a')).toEqual(ids(2));
    expect(store.forAccount('parent-b')).toBeNull();
  });

  it('does not lend a session’s ids to a player it no longer plays as', () => {
    const store = new AnalyticsSessions(() => 0);
    store.remember('s1', ids(1), { parentId: 'parent-a', childId: 'child-a' });
    store.remember('s1', ids(1), { parentId: 'parent-a', childId: 'child-b' });
    expect(store.forPlayer('child-a')).toBeNull();
    expect(store.forPlayer('child-b')).toEqual(ids(1));
  });

  it('forgets ids unused for half an hour', () => {
    let now = 0;
    const store = new AnalyticsSessions(() => now);
    store.remember('s1', ids(1), { parentId: 'parent-a', childId: 'child-a' });
    now = IDS_IDLE_MS;
    expect(store.forPlayer('child-a')).toEqual(ids(1));
    now = IDS_IDLE_MS + 1;
    expect(store.forPlayer('child-a')).toBeNull();
    expect(store.forAccount('parent-a')).toBeNull();
  });

  it('keeps at most a bounded number of sessions, dropping the least recently seen', () => {
    const store = new AnalyticsSessions(() => 0);
    store.remember('first', ids(0), { parentId: 'parent-first', childId: null });
    for (let n = 1; n <= MAX_SESSIONS; n += 1) {
      store.remember(`s${n}`, ids(n), { parentId: `parent-${n}`, childId: null });
      // Seen again: the first stays the oldest only until it comes back.
      if (n === 1) store.remember('first', ids(0), { parentId: 'parent-first', childId: null });
    }
    expect(store.forAccount('parent-first')).toEqual(ids(0));
    expect(store.forAccount('parent-1')).toBeNull();
    expect(store.forAccount(`parent-${MAX_SESSIONS}`)).toEqual(ids(MAX_SESSIONS));
  });
});
