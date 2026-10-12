import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST_LOGIN_TTL_MS, isAllowedNext, playTarget, savePostLoginTarget, takePostLoginTarget } from './post-login-target';

const NOW = 1_760_000_000_000;
const QUEST = playTarget('truong-hoc', 'toan2-cd1-b01');

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('isAllowedNext', () => {
  it('accepts a quest of a known region and a region screen', () => {
    expect(QUEST).toBe('/play?region=truong-hoc&quest=toan2-cd1-b01');
    expect(isAllowedNext(QUEST)).toBe(true);
    expect(isAllowedNext('/region/truong-hoc')).toBe(true);
  });

  it('refuses another site, an unknown region, a stray parameter and everything else', () => {
    for (const next of [
      'https://evil.example/play?region=truong-hoc&quest=a',
      '//evil.example/play?region=truong-hoc&quest=a',
      '/\\evil.example',
      'javascript:alert(1)',
      '/play?region=nowhere&quest=a',
      '/play?region=truong-hoc',
      '/play?quest=a&region=truong-hoc',
      '/play?region=truong-hoc&quest=a&x=1',
      '/play?region=truong-hoc&quest=A_B',
      '/play?region=truong-hoc&quest=a#top',
      '/play?region=truong-hoc&quest=a%20b',
      '/region/nowhere',
      '/region/truong-hoc/extra',
      '/region/truong-hoc?x=1',
      '/parent',
      '/login',
      '',
      42,
      null,
      undefined,
    ]) {
      expect(isAllowedNext(next), String(next)).toBe(false);
    }
  });
});

describe('the saved destination', () => {
  it('is read once and then forgotten', () => {
    savePostLoginTarget({ next: QUEST, inviteCode: 'AbC_12-xyz' }, NOW);
    expect(takePostLoginTarget(NOW + 1000)).toEqual({ next: QUEST, inviteCode: 'AbC_12-xyz' });
    expect(takePostLoginTarget(NOW + 1000)).toBeNull();
  });

  it('keeps only the allowed parts, and nothing when none is', () => {
    savePostLoginTarget({ next: 'https://evil.example', inviteCode: 'AbC_12' }, NOW);
    expect(takePostLoginTarget(NOW)).toEqual({ inviteCode: 'AbC_12' });
    savePostLoginTarget({ next: QUEST }, NOW);
    savePostLoginTarget({ next: '/parent', inviteCode: 'a.b' }, NOW);
    expect(window.localStorage.length).toBe(0);
    expect(takePostLoginTarget(NOW)).toBeNull();
  });

  it('is forgotten after an hour, and removed even then', () => {
    savePostLoginTarget({ next: QUEST }, NOW);
    expect(takePostLoginTarget(NOW + POST_LOGIN_TTL_MS + 1)).toBeNull();
    expect(window.localStorage.length).toBe(0);
    savePostLoginTarget({ next: QUEST }, NOW);
    expect(takePostLoginTarget(NOW + POST_LOGIN_TTL_MS)).toEqual({ next: QUEST });
  });

  it('does not trust what storage holds', () => {
    for (const raw of ['not json', 'null', '[]', JSON.stringify({ next: QUEST }), JSON.stringify({ next: '/parent', savedAt: NOW }), JSON.stringify({ next: QUEST, savedAt: NOW + 10 * POST_LOGIN_TTL_MS })]) {
      window.localStorage.setItem('miu.postLogin', raw);
      expect(takePostLoginTarget(NOW), raw).toBeNull();
      expect(window.localStorage.length).toBe(0);
    }
  });

  it('lets the visitor sign in as usual when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => savePostLoginTarget({ next: QUEST }, NOW)).not.toThrow();
    expect(takePostLoginTarget(NOW)).toBeNull();
  });
});
