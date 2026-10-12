import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuestTextbook } from '@miu/schema/game';
import { resetTrackForTest } from '../../analytics/track';
import { ShareResult } from './share-result';

const TEXTBOOK: QuestTextbook = { book: 'Toán 2, tập một', lesson: 'Bài 1. Ôn tập các số đến 100', pages: [6, 8] };
const PAGE = 'http://localhost:3000/bai/toan-2-bai-1-on-tap-cac-so-den-100/?utm_source=share&utm_medium=share&utm_campaign=result';
const CODE = 'AbCdEfGhIjKlMnOpQrStUv';
const INVITE_ID = '3b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d';

let copied: string[];
let calls: Array<{ key: string; body: unknown }>;

beforeEach(() => {
  copied = [];
  calls = [];
  resetTrackForTest();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async (text: string) => void copied.push(text)) }, configurable: true });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ key: `${init?.method ?? 'GET'} ${url}`, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url === '/api/invites') {
        return new Response(JSON.stringify({ id: INVITE_ID, code: CODE, createdAt: '2026-10-12T06:00:00.000Z', expiresAt: '2026-10-19T06:00:00.000Z' }), { status: 201 });
      }
      return new Response(null, { status: 204 });
    }),
  );
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.unstubAllGlobals();
});

const shares = () => calls.filter((c) => c.key === 'POST /api/analytics/events').map((c) => c.body as Record<string, unknown>);

describe('showing a result off', () => {
  it('copies the lesson page link on a computer, without a name or a number, and counts the share', async () => {
    render(<ShareResult textbook={TEXTBOOK} />);
    fireEvent.click(screen.getByRole('button', { name: /Khoe kết quả/ }));
    expect(await screen.findByText('Đã sao chép link, dán cho bạn bè nhé.')).toBeTruthy();
    expect(copied).toEqual([PAGE]);
    expect(calls.some((c) => c.key === 'POST /api/invites')).toBe(false);
    expect(shares()).toEqual([expect.objectContaining({ name: 'share', method: 'copy-link', content_type: 'result', lesson_id: 'toan2-t1-b01' })]);
  });

  it('adds a fresh invite when asked, and the page link carries its code', async () => {
    render(<ShareResult textbook={TEXTBOOK} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Kèm lời mời kết bạn' }));
    fireEvent.click(screen.getByRole('button', { name: /Khoe kết quả/ }));
    await waitFor(() => expect(copied).toEqual([`${PAGE}&moi=${CODE}`]));
    expect(calls.filter((c) => c.key === 'POST /api/invites')).toHaveLength(1);
  });

  it('uses the share sheet on a phone, and withdraws a new invite nobody got when she cancels', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('coarse'), media: query }));
    const share = vi.fn(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    try {
      render(<ShareResult textbook={TEXTBOOK} />);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Kèm lời mời kết bạn' }));
      fireEvent.click(screen.getByRole('button', { name: /Khoe kết quả/ }));
      await waitFor(() => expect(calls.map((c) => c.key)).toContain(`DELETE /api/invites/${INVITE_ID}`));
      expect(share).toHaveBeenCalledWith({ title: 'Ôn bài trên Miu World', text: 'Mình vừa chơi và ôn xong một bài trên Miu World!', url: `${PAGE}&moi=${CODE}` });
      expect(copied).toEqual([]);
      expect(shares()).toEqual([]);
    } finally {
      Reflect.deleteProperty(navigator, 'share');
    }
  });

  it('says so when the invite cannot be made, and shares nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'invite-limit' }), { status: 409 })),
    );
    render(<ShareResult textbook={TEXTBOOK} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Kèm lời mời kết bạn' }));
    fireEvent.click(screen.getByRole('button', { name: /Khoe kết quả/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/5 link mời/);
    expect(copied).toEqual([]);
  });

  it('points a quest with no textbook lesson at the home page, and counts it without a lesson', async () => {
    render(<ShareResult textbook={undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Khoe kết quả/ }));
    await waitFor(() => expect(copied).toEqual(['http://localhost:3000/?utm_source=share&utm_medium=share&utm_campaign=result']));
    await waitFor(() => expect(shares()).toHaveLength(1));
    expect(shares()[0]).toMatchObject({ method: 'copy-link', content_type: 'result' });
    expect(shares()[0]).not.toHaveProperty('lesson_id');
  });
});
