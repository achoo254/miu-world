import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LiveEventDto } from '@miu/schema/live-event';
import { completionScreens } from '../rewards/completion-sequence';
import { nextEventQuest, shortDate } from './event-api';
import { EventBanner } from './event-banner';
import { EventPanel } from './event-panel';
import { nextTier } from './olympiad/exam-result';
import { newRunId } from './olympiad/olympiad-api';

const EVENT: LiveEventDto = {
  id: 'fixture-fair',
  name: { vi: 'Hội chợ thử', en: 'Trial fair' },
  tagline: { vi: 'Một sự kiện để kiểm tra', en: 'An event to test with' },
  description: { vi: 'Hội chợ thử mở một ngăn.', en: 'The trial fair opens one room.' },
  greeting: { vi: 'Chào {name}, hội chợ mở rồi.', en: 'Hello {name}, the fair is open.' },
  icon: 'trophy',
  region: 'khu-rung-bi-mat',
  state: 'live',
  firstDay: '2030-01-01',
  lastDay: '2030-01-31',
  daysLeft: 17,
  daysUntilStart: null,
  changesInMs: 1000,
  quests: [
    { id: 'wonder-a', title: { vi: 'Ngăn một', en: 'Room one' }, keeper: { vi: 'Cáo', en: 'Fox' }, keeperId: 'fair-fox', done: true },
    { id: 'wonder-b', title: { vi: 'Ngăn hai', en: 'Room two' }, keeper: { vi: 'Thỏ', en: 'Bunny' }, keeperId: 'fair-bunny', done: false },
  ],
  practice: 'olympic-math',
  bestExamScore: 24,
  rewards: [
    { id: 'hat', kind: 'wearable', item: 'hat-olympic-toan', commemorative: false, name: { vi: 'Mũ hội chợ', en: 'Fair hat' }, goal: { kind: 'quests' }, earned: false, progress: 1, target: 2 },
    { id: 'badge', kind: 'badge', item: 'huy-hieu-olympic-khuyen-khich', commemorative: false, name: { vi: 'Huy hiệu thi thử', en: 'Mock exam badge' }, goal: { kind: 'exam-score', score: 20 }, earned: true, progress: 20, target: 20 },
  ],
  scene: {
    characters: [{ id: 'fair-fox', kind: 'npc', name: 'Cáo Gác Cổng', label: 'Nói chuyện', position: [20.5, 13, 22.5], yaw: 90, radius: 3, model: 'packs/kenney-cube-pets/2.0/animal-fox.glb', scale: 0.59, animation: 'idle' }],
    decorations: [],
    meetAt: 'fair-fox',
  },
};
const UPCOMING: LiveEventDto = { ...EVENT, state: 'upcoming', daysLeft: null, daysUntilStart: 4 };

function serve(event: LiveEventDto) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = url === `/api/events/${event.id}` ? event : null;
      return new Response(JSON.stringify(body ?? { error: 'event-not-found' }), { status: body ? 200 : 404 });
    }),
  );
}

function renderPanel(onPractice = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<EventPanel eventId={EVENT.id} name="Mochi" onClose={() => undefined} onPractice={onPractice} />} />
        <Route path="/play" element={<p data-id="playing">Trong game</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('event banner', () => {
  it('says how many days are left while open, never a countdown in hours', () => {
    render(<EventBanner event={EVENT} onOpen={() => undefined} />);
    expect(document.querySelector('[data-id="event-when-fixture-fair"]')?.textContent).toBe('Còn 17 ngày');
    expect(document.querySelectorAll('.event-banner-rewards li')).toHaveLength(2);
  });

  it('says "coming soon" and the opening day before the event opens', () => {
    const open = vi.fn();
    render(<EventBanner event={UPCOMING} onOpen={open} />);
    expect(document.querySelector('[data-id="event-when-fixture-fair"]')?.textContent).toBe('Sắp mở · Mở từ ngày 1/1');
    fireEvent.click(screen.getByText('Xem sự kiện'));
    expect(open).toHaveBeenCalledOnce();
  });
});

describe('event page', () => {
  it('greets the player by her character name, lists the quests and how far each reward is', async () => {
    serve(EVENT);
    renderPanel();
    expect(await screen.findByText('Chào Mochi, hội chợ mở rồi.')).toBeTruthy();
    expect(document.querySelector('[data-id="event-quest-wonder-a"]')?.getAttribute('data-done')).toBe('true');
    expect(document.querySelector('[data-id="event-reward-row-hat"]')?.getAttribute('data-earned')).toBe('false');
    expect(document.querySelector('[data-id="event-reward-row-badge"]')?.textContent).toContain('Đã nhận');
    expect(document.querySelector('[data-id="event-best-score"]')?.textContent).toContain('24');
  });

  it('walks to the first quest not done yet', async () => {
    serve(EVENT);
    renderPanel();
    fireEvent.click(await screen.findByText('Tới cổng ngay'));
    expect(await screen.findByText('Trong game')).toBeTruthy();
  });

  it('opens the practice from the event', async () => {
    serve(EVENT);
    const practice = vi.fn();
    renderPanel(practice);
    fireEvent.click(await screen.findByText('Vào luyện tập'));
    expect(practice).toHaveBeenCalledOnce();
  });

  it('before it opens: says when, offers no way to play', async () => {
    serve(UPCOMING);
    renderPanel();
    expect((await screen.findByText(/Cổng chưa mở/)).textContent).toContain('1/1');
    expect(document.querySelector('[data-id="event-go"]')).toBeNull();
    expect(document.querySelector('[data-id="event-play-wonder-b"]')).toBeNull();
  });

  it('shows the error when the event is not on', async () => {
    serve({ ...EVENT, id: 'other' });
    renderPanel();
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});

describe('event helpers', () => {
  it('picks the first quest not done, else the first', () => {
    expect(nextEventQuest(EVENT)?.id).toBe('wonder-b');
    expect(nextEventQuest({ quests: EVENT.quests.map((q) => ({ ...q, done: true })) })?.id).toBe('wonder-a');
    expect(nextEventQuest({ quests: [] })).toBeNull();
  });

  it('writes a day as the player reads it', () => {
    expect(shortDate('2026-10-31')).toBe('31/10');
    expect(shortDate('2027-09-01')).toBe('1/9');
  });

  it('adds the Event Reward screen only when a run earned a limited reward', () => {
    const base = { stars: 3, xpAwarded: 10, levelBefore: 1, levelAfter: 1, skillLevels: [] };
    expect(completionScreens(base)).toEqual(['reward']);
    const grant = { eventId: 'fixture-fair', eventName: EVENT.name, rewardId: 'hat', kind: 'wearable' as const, item: 'hat-olympic-toan', name: { vi: 'Mũ', en: 'Hat' }, commemorative: false };
    expect(completionScreens({ ...base, eventRewards: [grant] })).toEqual(['reward', 'event']);
  });
});

describe('olympic math practice helpers', () => {
  it('names the next medal line and the points it needs', () => {
    expect(nextTier(0)).toEqual({ tier: 'consolation', points: 20 });
    expect(nextTier(52)).toEqual({ tier: 'silver', points: 8 });
    expect(nextTier(80)).toBeNull();
  });

  it('makes version-4 run ids the server accepts, a new one each time', () => {
    const id = newRunId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newRunId()).not.toBe(id);
  });
});
