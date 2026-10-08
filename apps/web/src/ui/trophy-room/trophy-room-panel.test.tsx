import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrophyRoomResponse } from '@miu/schema/trophy-room';
import { BOOK_SETS } from '../collection/collection-catalog';
import { TrophyRoomPanel } from './trophy-room-panel';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const byId = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-id="${id}"]`);
  if (!el) throw new Error(`no element with data-id ${id}`);
  return el;
};

const [firstSet, secondSet] = BOOK_SETS.map((s) => s.mapId);
const ROOM: TrophyRoomResponse = {
  badges: [
    { itemId: 'huy-hieu-olympic-vang', earnedAt: '2026-10-06T08:00:00.000Z' },
    { itemId: 'huy-hieu-olympic-bac', earnedAt: null },
  ],
  cups: [
    { mapId: firstSet ?? 'forest-ch1', earnedAt: '2026-10-05T09:30:00.000Z' },
    { mapId: secondSet ?? 'lang-ven-song', earnedAt: null },
  ],
  plaques: [
    { category: 'hoc-tap', claimed: 7, total: 13, stars: 2, lastAt: '2026-10-07T20:00:00.000Z' },
    { category: 'su-kien', claimed: 0, total: 5, stars: 0, lastAt: null },
  ],
};

describe('TrophyRoomPanel', () => {
  it('lists her badges, cups and plaques with the day each was earned, the rest faded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => (url === '/api/trophies' ? json(ROOM) : json({ error: 'not-found' }, 404))),
    );
    render(<TrophyRoomPanel onClose={() => undefined} />);
    expect(await screen.findByRole('dialog', { name: 'Phòng truyền thống' })).toBeTruthy();
    expect(byId('trophy-summary').textContent).toBe('Đã có 1/2 huy hiệu · 1/2 cúp · 2/6 sao');
    expect(byId('trophy-badge-huy-hieu-olympic-vang').textContent).toContain('Huy hiệu Olympic Toán · Vàng');
    expect(byId('trophy-badge-when-huy-hieu-olympic-vang').textContent).toBe('Nhận ngày 06/10/2026');
    expect(byId('trophy-badge-huy-hieu-olympic-bac').className).toContain('trophy-card--missing');
    expect(byId('trophy-badge-when-huy-hieu-olympic-bac').textContent).toBe('Chưa có');
    expect(byId(`trophy-cup-${secondSet}`).className).toContain('trophy-card--missing');
    // 20:00 UTC on the 7th is already the 8th in Vietnam: the day shown is Vietnam's.
    expect(byId('trophy-plaque-when-hoc-tap').textContent).toBe('Nhận ngày 08/10/2026');
    expect(byId('trophy-plaque-stars-hoc-tap').getAttribute('aria-label')).toBe('2/3');
    expect(byId('trophy-plaque-hoc-tap').textContent).toContain('Đã nhận 7/13 thành tích');
  });

  it('says when the room cannot be read and tries again', async () => {
    const fetch = vi.fn(async () => json({ error: 'server' }, 500));
    vi.stubGlobal('fetch', fetch);
    render(<TrophyRoomPanel onClose={() => undefined} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    byId('trophy-retry').click();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});
