import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReportView } from '@miu/schema/moderation';
import { ModerationScreen } from './moderation-screen';

type Call = { method: string; url: string; body: unknown };

const REPORT: ReportView = {
  id: '00000000-0000-4000-8000-000000000001',
  reason: 'harassment',
  mapId: 'trung-tam',
  createdAt: '2026-10-19T02:00:00.000Z',
  status: 'open',
  handledAt: null,
  note: null,
  reporter: { displayName: 'Mây', species: 'cat' },
  reported: { displayName: 'Bông', species: 'fox', openReports: 3, restriction: { kind: 'hidden', until: null } },
  incident: { witnesses: [{ displayName: 'Tôm', species: 'bear' }], lines: [{ by: 'reported', text: 'Hẹn gặp lại nhé!', secondsBefore: 12 }] },
};

/** The moderation API behind `fetch` (404 for everything when `moderator` is false). */
function stubServer(moderator = true) {
  const calls: Call[] = [];
  let mode = 'on';
  let open = [REPORT];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, url, body });
      if (!moderator) return new Response(JSON.stringify({ error: 'not-found' }), { status: 404 });
      if (url === '/api/moderation/me') return new Response(JSON.stringify({ onlineMode: mode }));
      if (url === '/api/moderation/online-mode') {
        mode = (body as { mode: string }).mode;
        return new Response(JSON.stringify({ onlineMode: mode }));
      }
      if (url.startsWith('/api/moderation/reports?')) return new Response(JSON.stringify({ reports: url.endsWith('open') ? open : [] }));
      if (url.endsWith('/action')) {
        open = [];
        return new Response(JSON.stringify({ report: { ...REPORT, status: 'warned', reported: { ...REPORT.reported, openReports: 0, restriction: null } } }));
      }
      return new Response(JSON.stringify({ error: 'not-found' }), { status: 404 });
    }),
  );
  return calls;
}

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/kiem-duyet']}>
      <Routes>
        <Route path="/kiem-duyet" element={<ModerationScreen />} />
        <Route path="/" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the moderation screen', () => {
  it('sends anyone the server does not name a moderator home', async () => {
    const calls = stubServer(false);
    renderScreen();
    await waitFor(() => expect(screen.getByText('home')).toBeTruthy());
    expect(calls.map((c) => c.url)).toEqual(['/api/moderation/me']);
  });

  it('lists a waiting report with what was around it, and sends a decision only after it is confirmed', async () => {
    const calls = stubServer();
    renderScreen();
    const card = await waitFor(() => {
      const found = document.querySelector(`[data-id="moderation-report-${REPORT.id}"]`);
      if (!(found instanceof HTMLElement)) throw new Error('not yet');
      return found;
    });
    expect(card.textContent).toContain('Bông');
    expect(card.textContent).toContain('Làm phiền, trêu chọc');
    expect(card.textContent).toContain('Tôm');
    expect(card.textContent).toContain('Hẹn gặp lại nhé!');
    expect(card.textContent).toContain('Đang ẩn tự động');
    // Species read in Vietnamese, never as their ids.
    expect(card.textContent).toContain('Bông (Cáo)');
    expect(card.textContent).toContain('Mây (Mèo)');
    expect(card.textContent).not.toMatch(/\((fox|cat)\)/);
    // The setting is named in plain words, not by its variable.
    expect(document.querySelector('[data-id="moderation-switch"]')?.textContent).not.toContain('ONLINE_MODE');
    fireEvent.change(within(card).getByRole('textbox'), { target: { value: 'lần đầu' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Cảnh cáo' }));
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
    fireEvent.click(within(card).getByRole('button', { name: 'Đồng ý' }));
    await waitFor(() => expect(document.querySelector('[data-id="moderation-empty"]')).toBeTruthy());
    expect(calls.find((c) => c.method === 'POST')).toEqual({ method: 'POST', url: `/api/moderation/reports/${REPORT.id}/action`, body: { action: 'warn', note: 'lần đầu' } });
  });

  it('has a way back out of the screen', async () => {
    stubServer();
    renderScreen();
    fireEvent.click(await screen.findByRole('link', { name: 'Quay lại' }));
    await waitFor(() => expect(screen.getByText('home')).toBeTruthy());
  });

  it('asks for a temporary lock with its days', async () => {
    const calls = stubServer();
    renderScreen();
    const card = await waitFor(() => {
      const found = document.querySelector(`[data-id="moderation-report-${REPORT.id}"]`);
      if (!(found instanceof HTMLElement)) throw new Error('not yet');
      return found;
    });
    fireEvent.click(within(card).getByRole('button', { name: 'Khóa 7 ngày' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Đồng ý' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ action: 'lock-temp', lockDays: 7 }));
  });

  it('flips the emergency switch after a confirmation', async () => {
    const calls = stubServer();
    renderScreen();
    const off = await waitFor(() => {
      const found = document.querySelector('[data-id="moderation-switch-off"]');
      if (!(found instanceof HTMLElement)) throw new Error('not yet');
      return found;
    });
    fireEvent.click(off);
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
    fireEvent.click(document.querySelector('[data-id="moderation-switch-yes"]') as HTMLElement);
    await waitFor(() => expect(document.querySelector('[data-id="moderation-switch-now"]')?.textContent).toContain('Tắt online'));
    expect(calls.find((c) => c.method === 'PUT')).toEqual({ method: 'PUT', url: '/api/moderation/online-mode', body: { mode: 'off' } });
  });
});
