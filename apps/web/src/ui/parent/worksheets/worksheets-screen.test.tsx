import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Worksheet, WorksheetListResponse } from '@miu/schema/worksheet';
import { AccountProvider } from '../../account/account-context';
import { AppRoutes } from '../../app-shell';

const me = (parentGateOpen: boolean) => ({
  parent: { id: '1b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d', email: 'p@example.vn' },
  consentAccepted: true,
  activeChildId: null,
  parentGateOpen,
  pinLocked: false,
  pinSet: true,
});

const LIST: WorksheetListResponse = {
  worksheets: [
    { lessonId: 'toan2-cd1-b01', bookId: 'toan2-t1', title: 'Bài 1: Ôn tập các số đến 100', pages: [6, 9], blockCount: 1 },
    { lessonId: 'tv2-t01-b01', bookId: 'tv2-t1', title: 'Bài 1: Tôi là học sinh lớp 2', week: 1, pages: [10, 13], blockCount: 3 },
  ],
};

const SHEET: Worksheet = {
  lessonId: 'tv2-t01-b01',
  bookId: 'tv2-t1',
  title: 'Bài 1: Tôi là học sinh lớp 2',
  week: 1,
  pages: [10, 13],
  blocks: [
    { kind: 'letter', prompt: 'Viết chữ hoa A', page: 12, curriculumRef: ['tv2-t01-b01-viet-1'] },
    { kind: 'copy-line', text: 'Anh em thuận hoà.', page: 12, curriculumRef: ['tv2-t01-b01-viet-2'] },
    { kind: 'dictation', prompt: 'Nghe – viết', title: 'Đoạn mẫu', text: 'Câu thứ nhất.\nCâu thứ hai.', page: 13, curriculumRef: ['tv2-t01-b01-viet-3'] },
    { kind: 'paragraph-prompt', prompt: 'Viết 2 – 3 câu', hints: ['Gợi ý một', 'Gợi ý hai'], lines: 5, page: 13, curriculumRef: ['tv2-t01-b01-viet-4'] },
    { kind: 'activity', prompt: 'Cùng bố mẹ đo', media: [], page: 13, curriculumRef: ['tv2-t01-b01-vd-1'] },
  ],
};

type Handler = () => { status: number; body?: unknown };

function stubApi(routes: Record<string, Handler>) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${url}`;
      calls.push(key);
      const out = routes[key]?.() ?? { status: 404, body: { error: 'not-found' } };
      return new Response(JSON.stringify(out.body), { status: out.status });
    }),
  );
  return calls;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AccountProvider>
        <AppRoutes />
      </AccountProvider>
    </MemoryRouter>,
  );
}
const byId = (id: string) => document.querySelector(`[data-id="${id}"]`);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('worksheets in the parent area', () => {
  it('asks for the parent PIN first and loads nothing before it', async () => {
    const calls = stubApi({ 'GET /api/auth/me': () => ({ status: 200, body: me(false) }) });
    renderAt('/parent/worksheets');
    expect(await screen.findByLabelText(/PIN/)).toBeTruthy();
    expect(byId('worksheets-gate')).toBeTruthy();
    expect(calls.some((c) => c.includes('/api/worksheets'))).toBe(false);
  });

  it('lists the sheets by book, with the week for Tiếng Việt, each linking to its sheet', async () => {
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me(true) }),
      'GET /api/worksheets': () => ({ status: 200, body: LIST }),
    });
    renderAt('/parent/worksheets');
    expect(await screen.findByRole('heading', { name: 'Tiếng Việt 2, tập một' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Tiếng Việt 2, tập một', 'Toán 2, tập một']);
    const tv = byId('worksheet-link-tv2-t01-b01');
    expect(tv?.getAttribute('href')).toBe('/parent/worksheets/tv2-t01-b01');
    expect(tv?.textContent).toMatch(/Tuần 1.*Bài 1: Tôi là học sinh lớp 2.*tr\. 10–13 · 3 phần/);
    expect(byId('worksheet-link-toan2-cd1-b01')?.textContent).not.toMatch(/Tuần/);
  });

  it('shows every block of a sheet in the book wording, and prints it', async () => {
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me(true) }),
      'GET /api/worksheets/tv2-t01-b01': () => ({ status: 200, body: SHEET }),
    });
    const print = vi.fn();
    vi.stubGlobal('print', print);
    renderAt('/parent/worksheets/tv2-t01-b01');
    expect(await screen.findByRole('heading', { level: 1, name: SHEET.title })).toBeTruthy();
    for (const id of ['block-letter', 'block-copy-line', 'block-dictation', 'block-paragraph', 'block-activity']) expect(byId(id)).toBeTruthy();
    expect(screen.getByText('Viết chữ hoa A')).toBeTruthy();
    expect(screen.getByText(/Tô theo mẫu chữ hoa trang 12/)).toBeTruthy();
    expect(screen.getByText('Anh em thuận hoà.')).toBeTruthy();
    expect(byId('block-dictation')?.querySelector('.sheet-passage')?.textContent).toBe('Câu thứ nhất.\nCâu thứ hai.');
    expect(screen.getByText('Gợi ý hai')).toBeTruthy();
    expect(byId('block-paragraph')?.querySelectorAll('.ruled-row')).toHaveLength(5);
    fireEvent.click(byId('worksheet-print') as Element);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('says so when a lesson has no sheet', async () => {
    stubApi({ 'GET /api/auth/me': () => ({ status: 200, body: me(true) }) });
    renderAt('/parent/worksheets/khong-co');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect((byId('worksheet-print') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('activities on a sheet', () => {
  it('prints a prompt shared by several pictures once, with a line per picture', async () => {
    const shared = 'Đọc cân nặng của mỗi đồ vật.';
    const sheet: Worksheet = {
      lessonId: 'toan2-t1-b15',
      bookId: 'toan2-t1',
      title: 'Bài 15',
      pages: [60, 62],
      blocks: [
        { kind: 'activity', prompt: shared, media: ['hình a'], page: 60, curriculumRef: ['a'] },
        { kind: 'activity', prompt: shared, media: ['hình b'], page: 60, curriculumRef: ['b'] },
        { kind: 'activity', prompt: 'Việc khác', media: [], page: 61, curriculumRef: ['c'] },
      ],
    };
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me(true) }),
      'GET /api/worksheets/toan2-t1-b15': () => ({ status: 200, body: sheet }),
    });
    renderAt('/parent/worksheets/toan2-t1-b15');
    expect(await screen.findAllByText(shared)).toHaveLength(1);
    const [grouped, single, ...rest] = [...document.querySelectorAll('[data-id="block-activity"]')];
    expect(rest).toHaveLength(0);
    expect([...(grouped?.querySelectorAll('.sheet-parts li') ?? [])].map((li) => li.querySelector('.sheet-label')?.textContent)).toEqual([
      'Hình trang 60 SGK: hình a',
      'Hình trang 60 SGK: hình b',
    ]);
    expect(single?.querySelectorAll('.ruled-row')).toHaveLength(3);
  });
});
