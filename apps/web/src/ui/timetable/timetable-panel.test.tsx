import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyPeriodRow, emptyTimetable, type Timetable } from '@miu/schema/timetable';
import { TimetablePanel } from './timetable-panel';

// Local dates: 2 Sept 2030 is a Monday, 8 Sept a Sunday.
const MONDAY = new Date(2030, 8, 2, 7, 30);
const WEDNESDAY = new Date(2030, 8, 4, 7, 30);
const SUNDAY = new Date(2030, 8, 8, 9, 0);

/** Made-up values only: the repo is public, a real class's timetable never goes in. */
function sample(): Timetable {
  const t = emptyTimetable();
  t.header = { school: 'Trường Tiểu học Mây Hồng', className: '2b', schoolYear: '2030 - 2031', appliesFrom: '01/09/2030', teacher: 'Cô Lá – ĐT: 0000 000 000' };
  t.morning[0] = { ...emptyPeriodRow(), mon: 'Tiếng Việt', wed: 'Âm nhạc' };
  t.uniform = { ...t.uniform, mon: 'Bộ sơ mi trắng', fri: 'Bộ sơ mi trắng' };
  return t;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Answers GET /api/timetable with `stored` and records every PUT body (answered as the server would). */
function timetableApi(stored: Timetable | (() => Response)) {
  const puts: unknown[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url !== '/api/timetable') return json({ error: 'not-found' }, 404);
    if (init?.method === 'PUT') {
      const body: unknown = JSON.parse(String(init.body));
      puts.push(body);
      return json(body);
    }
    return typeof stored === 'function' ? stored() : json(stored);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { puts };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const byId = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-id="${id}"]`);
  if (!el) throw new Error(`no element with data-id ${id}`);
  return el;
};

describe('TimetablePanel', () => {
  it('shows the blank template like the class sheet: four morning periods, lunch, three afternoon ones, Monday to Friday', async () => {
    timetableApi(emptyTimetable());
    render(<TimetablePanel focus="timetable" onClose={() => undefined} now={MONDAY} />);
    expect(await screen.findByText(/Chưa có thời khóa biểu/)).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Thời khóa biểu' })).toBeTruthy();
    expect(byId('timetable-title').textContent).toBe('THỜI KHÓA BIỂU');
    const heads = within(byId('timetable-table')).getAllByRole('columnheader').map((th) => th.textContent);
    expect(heads).toEqual(['Buổi', 'Tiết', 'Thứ HaiHôm nay', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu']);
    expect(byId('timetable-session-morning').querySelectorAll('tr')).toHaveLength(4);
    expect(byId('timetable-lunch').textContent).toBe('NGHỈ TRƯA');
    expect(byId('timetable-session-afternoon').querySelectorAll('tr')).toHaveLength(3);
    expect(byId('timetable-uniform-today').textContent).toBe('Hôm nay chưa ghi đồng phục.');
  });

  it("lights today's column and says what to wear today; on Sunday no column and a day-off line", async () => {
    timetableApi(sample());
    render(<TimetablePanel focus="timetable" onClose={() => undefined} now={MONDAY} />);
    expect((await screen.findByText('THỜI KHÓA BIỂU - LỚP 2B – NĂM HỌC 2030 - 2031')).dataset.id).toBe('timetable-title');
    expect(screen.getByText('(Áp dụng từ ngày 01/09/2030)')).toBeTruthy();
    expect(screen.getByText('GVCN: Cô Lá – ĐT: 0000 000 000')).toBeTruthy();
    expect(byId('timetable-day-mon').getAttribute('aria-current')).toBe('date');
    expect(byId('timetable-day-tue').getAttribute('aria-current')).toBeNull();
    expect(byId('timetable-cell-morning-1-mon').closest('td')?.className).toBe('timetable-today');
    expect(byId('timetable-uniform-today').textContent).toBe('Hôm nay mặc: Bộ sơ mi trắng');
    expect(byId('timetable-uniform-mon').getAttribute('aria-current')).toBe('date');
    expect(byId('timetable-uniform-wed').textContent).toContain('Chưa ghi');
    cleanup();

    timetableApi(sample());
    render(<TimetablePanel focus="uniform" onClose={() => undefined} now={SUNDAY} />);
    expect(screen.getByRole('dialog', { name: 'Lịch mặc đồng phục' })).toBeTruthy();
    await vi.waitFor(() => expect(byId('timetable-uniform-today').textContent).toBe('Hôm nay được nghỉ học, mặc gì cũng được!'));
    expect(document.querySelector('[aria-current="date"]')).toBeNull();
  });

  it('opened from the uniform calendar, shows the uniforms first', async () => {
    timetableApi(sample());
    render(<TimetablePanel focus="uniform" onClose={() => undefined} now={WEDNESDAY} />);
    await vi.waitFor(() => byId('timetable-uniforms'));
    const sections = [...document.querySelectorAll('[data-id="timetable-uniforms"], [data-id="timetable-sheet"]')].map((el) => el.getAttribute('data-id'));
    expect(sections).toEqual(['timetable-uniforms', 'timetable-sheet']);
    expect(byId('timetable-uniform-today').textContent).toBe('Hôm nay chưa ghi đồng phục.');
  });

  it('edits a cell with a subject chip, a header line, a uniform and the period count, then saves the whole timetable', async () => {
    const { puts } = timetableApi(sample());
    render(<TimetablePanel focus="timetable" onClose={() => undefined} now={MONDAY} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));

    fireEvent.click(byId('timetable-cell-morning-2-tue'));
    expect(byId('timetable-cell-editor').textContent).toContain('Thứ Ba · Sáng · Tiết 2');
    fireEvent.click(screen.getByRole('button', { name: 'Toán' }));
    expect(byId('timetable-cell-morning-2-tue').textContent).toBe('Toán');
    // Typing works too, and "Xóa ô" empties a filled period.
    fireEvent.click(byId('timetable-cell-morning-1-wed'));
    fireEvent.click(byId('timetable-cell-clear'));
    fireEvent.click(byId('timetable-cell-afternoon-1-fri'));
    fireEvent.change(byId('timetable-cell-input'), { target: { value: 'Đọc sách' } });
    fireEvent.click(byId('timetable-cell-done'));
    expect(document.querySelector('[data-id="timetable-cell-editor"]')).toBeNull();

    fireEvent.change(byId('timetable-header-school'), { target: { value: 'Trường Tiểu học Sao Mai' } });
    const wednesday = within(byId('timetable-uniform-edit')).getByRole('group', { name: 'Chọn đồng phục Thứ Tư' });
    fireEvent.click(within(wednesday).getByRole('button', { name: 'Bộ áo phông xanh' }));
    fireEvent.click(byId('timetable-periods-afternoon-less'));
    expect(byId('timetable-periods-afternoon').textContent).toBe('2 tiết');

    fireEvent.click(byId('timetable-save'));
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Sửa' })).toBeTruthy());

    const expected = sample();
    expected.header.school = 'Trường Tiểu học Sao Mai';
    expected.morning[1] = { ...emptyPeriodRow(), tue: 'Toán' };
    expected.morning[0] = { ...emptyPeriodRow(), mon: 'Tiếng Việt' };
    expected.afternoon = [{ ...emptyPeriodRow(), fri: 'Đọc sách' }, emptyPeriodRow()];
    expected.uniform.wed = 'Bộ áo phông xanh';
    expect(puts).toEqual([expected]);
    // Back to looking: the saved text shows in the table.
    expect(byId('timetable-cell-morning-2-tue').textContent).toBe('Toán');
  });

  it('adds Saturday as a column and a uniform day when the class meets then', async () => {
    const { puts } = timetableApi(emptyTimetable());
    render(<TimetablePanel focus="timetable" onClose={() => undefined} now={MONDAY} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    fireEvent.click(byId('timetable-saturday'));
    fireEvent.click(byId('timetable-uniform-sat-3'));
    fireEvent.click(byId('timetable-save'));
    await vi.waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toMatchObject({ saturday: true, uniform: { sat: 'Tự do' } });
    await vi.waitFor(() => expect(byId('timetable-day-sat').textContent).toBe('Thứ Bảy'));
  });

  it('"Hủy" drops the changes without saving', async () => {
    const { puts } = timetableApi(sample());
    render(<TimetablePanel focus="timetable" onClose={() => undefined} now={MONDAY} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    fireEvent.click(byId('timetable-cell-morning-1-mon'));
    fireEvent.click(byId('timetable-cell-clear'));
    fireEvent.click(byId('timetable-cancel'));
    expect(byId('timetable-cell-morning-1-mon').textContent).toBe('Tiếng Việt');
    expect(puts).toEqual([]);
  });

  it('keeps the edits and says why when the save fails', async () => {
    let fail = true;
    const puts: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method !== 'PUT') return json(emptyTimetable());
        puts.push(JSON.parse(String(init.body)));
        if (fail) throw new TypeError('Failed to fetch');
        return json(JSON.parse(String(init.body)));
      }),
    );
    render(<TimetablePanel focus="timetable" onClose={() => undefined} now={MONDAY} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    fireEvent.click(byId('timetable-cell-morning-1-mon'));
    fireEvent.click(screen.getByRole('button', { name: 'Toán' }));
    fireEvent.click(byId('timetable-save'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Không kết nối được máy chủ/);
    expect(byId('timetable-cell-morning-1-mon').textContent).toBe('Toán');
    fail = false;
    fireEvent.click(byId('timetable-save'));
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Sửa' })).toBeTruthy());
    expect(puts).toHaveLength(2);
  });

  it('offers a retry when the timetable cannot be read, and closes from its buttons', async () => {
    let online = false;
    timetableApi(() => {
      if (!online) throw new TypeError('Failed to fetch');
      return json(sample());
    });
    const onClose = vi.fn();
    render(<TimetablePanel focus="timetable" onClose={onClose} now={MONDAY} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Không kết nối được máy chủ/);
    online = true;
    fireEvent.click(byId('timetable-retry'));
    expect(await screen.findByText('Hôm nay mặc: Bộ sơ mi trắng')).toBeTruthy();
    fireEvent.click(byId('timetable-done'));
    fireEvent.click(byId('timetable-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
