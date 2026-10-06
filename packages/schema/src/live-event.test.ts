import { describe, expect, it } from 'vitest';
import { LiveEvent, liveEventIssues, type LiveEventContext } from './live-event';

const base = {
  version: 1,
  id: 'test-fair',
  name: { vi: 'Hội chợ', en: 'Fair' },
  tagline: { vi: 'Một dòng', en: 'One line' },
  description: { vi: 'Mô tả', en: 'About it' },
  greeting: { vi: 'Chào {name}', en: 'Hello {name}' },
  icon: 'trophy',
  region: 'khu-rung-bi-mat',
  windows: [
    { kind: 'live', startsAt: '2030-01-01T00:00:00+07:00', endsAt: '2030-02-01T00:00:00+07:00' },
    { kind: 'commemorative', startsAt: '2031-01-01T00:00:00+07:00', endsAt: '2031-02-01T00:00:00+07:00' },
  ],
  quests: ['wonder-a'],
  practice: 'olympic-math',
  rewards: [
    { id: 'badge', kind: 'badge', item: 'b-1', commemorativeItem: 'b-2', name: { vi: 'Huy hiệu', en: 'Badge' }, goal: { kind: 'exam-score', score: 20 } },
    { id: 'hat', kind: 'wearable', item: 'hat-1', commemorativeItem: 'hat-2', name: { vi: 'Mũ', en: 'Hat' }, goal: { kind: 'quests' } },
  ],
  scene: {
    characters: [{ id: 'fair-fox', kind: 'npc', name: 'Cáo', nameEn: 'Fox', label: 'Nói chuyện', position: [1, 13, 1], yaw: 0, radius: 3, model: 'packs/kenney-cube-pets/2.0/animal-fox.glb', scale: 0.6, animation: 'idle' }],
    meetAt: 'fair-fox',
  },
};

const ctx: LiveEventContext = {
  quests: new Map([['wonder-a', { category: 'event', region: 'khu-rung-bi-mat' }], ['toan2-x', { category: 'main', region: 'khu-rung-bi-mat' }]]),
  items: new Set(['b-1', 'b-2']),
  wearables: new Map([['hat-1', { award: true }], ['hat-2', { award: true }], ['hat-shop', { award: false }]]),
  regions: new Set(['khu-rung-bi-mat']),
  icons: new Set(['trophy']),
};

const issuesOf = (patch: object): string[] => liveEventIssues(LiveEvent.parse({ ...base, ...patch }), ctx);

describe('live event files', () => {
  it('accepts a complete event', () => {
    expect(issuesOf({})).toEqual([]);
  });

  it('only takes times written in Vietnam time', () => {
    expect(LiveEvent.safeParse({ ...base, windows: [{ kind: 'live', startsAt: '2030-01-01T00:00:00Z', endsAt: '2030-02-01T00:00:00+07:00' }] }).success).toBe(false);
  });

  it('wants windows in order, the live one first, none ending before it starts', () => {
    const [live, later] = base.windows;
    expect(issuesOf({ windows: [later, live] })).toContain('window 2 starts before the window before it ends (windows are in order and never overlap)');
    expect(issuesOf({ windows: [later] })[0]).toMatch(/first window is the live event/);
    expect(issuesOf({ windows: [{ ...live, endsAt: live?.startsAt }] })).toContain('window 1 ends before it starts');
  });

  it('opens event quests of its own region only', () => {
    expect(issuesOf({ quests: ['toan2-x'] })).toContain('quest toan2-x is not an event quest ("category": "event")');
    expect(issuesOf({ quests: ['missing'] })).toContain('quest missing is not in content/quests');
  });

  it('gives badges that exist and wearables that are never sold', () => {
    const [badge, hat] = base.rewards;
    expect(issuesOf({ rewards: [{ ...badge, item: 'nope' }, hat] })).toContain('reward badge: badge nope is not in content/items');
    expect(issuesOf({ rewards: [badge, { ...hat, item: 'hat-shop' }] })[0]).toMatch(/must say "unlock": \{ "award": true \}/);
    expect(issuesOf({ rewards: [badge, { ...hat, commemorativeItem: 'hat-1' }] })[0]).toMatch(/given by two rewards/);
    expect(issuesOf({ practice: undefined })[0]).toMatch(/exam-score goal needs the event's practice/);
  });

  it('meets the player at one of its own characters', () => {
    expect(issuesOf({ scene: { ...base.scene, meetAt: 'someone' } })).toContain("scene.meetAt someone is not one of the scene's characters");
  });
});
