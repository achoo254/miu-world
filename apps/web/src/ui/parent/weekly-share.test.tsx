import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerProgressDto } from '@miu/schema/progress';
import { resetTrackForTest } from '../../analytics/track';
import { ProgressView } from '../profile/progress-panel';
import { weeklyFacts } from './weekly-share';

const PROGRESS: PlayerProgressDto = {
  subjects: [],
  strong: [],
  weak: [],
  suggestions: [],
  weeks: [
    { weekStart: '2026-09-14', minutes: 10 },
    { weekStart: '2026-09-21', minutes: 20 },
    { weekStart: '2026-09-28', minutes: 30 },
    { weekStart: '2026-10-05', minutes: 95 },
  ],
  counts: { playerLevel: 3, lessonsDone: 12, lessonsTotal: 70, threeStars: 5, minigameRuns: 2, regionsComplete: 1, collectibles: 4 },
};

let posted: Array<Record<string, unknown>>;
let downloads: string[];
let copied: string[];
let shared: Array<{ files?: File[]; text?: string }>;

beforeEach(() => {
  posted = [];
  downloads = [];
  copied = [];
  shared = [];
  resetTrackForTest();
  // jsdom draws nothing: a context that accepts every call and a canvas that hands back a PNG-typed blob are enough.
  const context = new Proxy({}, { get: (_target, name) => (name === 'measureText' ? () => ({ width: 1 }) : name === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })));
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:card'), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async (text: string) => void copied.push(text)) }, configurable: true });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      posted.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(null, { status: 204 });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
});

const open = async (): Promise<void> => {
  fireEvent.click(screen.getByRole('button', { name: /Chia sẻ tuần này/ }));
  await screen.findByRole('img', { name: /Thẻ tổng kết tuần/ });
};

describe('the week’s card', () => {
  it('takes this week’s minutes (the last of the weeks) and the lessons done so far, nothing more', () => {
    expect(weeklyFacts(PROGRESS)).toEqual({ minutes: 95, lessonsDone: 12, lessonsTotal: 70 });
  });

  it('is offered in the account owner’s view of progress, not in the player’s own', () => {
    const own = render(<ProgressView progress={PROGRESS} playable dataId="own" />);
    expect(screen.queryByRole('button', { name: /Chia sẻ tuần này/ })).toBeNull();
    own.unmount();
    render(<ProgressView progress={PROGRESS} playable={false} dataId="owner" shareWeek />);
    expect(screen.getByRole('button', { name: /Chia sẻ tuần này/ })).toBeTruthy();
  });

  it('is saved as a picture on a computer, with the link copied to go with it, and the share is counted', async () => {
    render(<ProgressView progress={PROGRESS} playable={false} dataId="owner" shareWeek />);
    await open();
    expect(screen.getByRole('img', { name: 'Thẻ tổng kết tuần: 95 phút chơi, đã xong 12 trên 70 bài' })).toBeTruthy();
    expect(screen.getByText('Thẻ chỉ có số phút chơi và số bài đã xong, không có tên.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tải ảnh' }));
    expect(await screen.findByText('Đã tải ảnh về máy, link Miu World cũng đã được sao chép.')).toBeTruthy();
    expect(downloads).toEqual(['miu-world-tuan-nay.png']);
    expect(copied).toEqual(['http://localhost:3000/?utm_source=share&utm_medium=share&utm_campaign=weekly']);
    expect(posted).toEqual([expect.objectContaining({ name: 'share', method: 'download', content_type: 'weekly' })]);
  });

  it('goes through the share sheet as a file on a phone', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('coarse'), media: query }));
    Object.defineProperty(navigator, 'share', { value: vi.fn(async (data: { files?: File[]; text?: string }) => void shared.push(data)), configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    render(<ProgressView progress={PROGRESS} playable={false} dataId="owner" shareWeek />);
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ thẻ' }));
    await waitFor(() => expect(shared).toHaveLength(1));
    expect(shared[0]?.files?.map((f) => f.name)).toEqual(['miu-world-tuan-nay.png']);
    expect(shared[0]?.text).toBe('Một tuần vừa chơi vừa học cùng Miu World! http://localhost:3000/?utm_source=share&utm_medium=share&utm_campaign=weekly');
    expect(downloads).toEqual([]);
    expect(posted).toEqual([expect.objectContaining({ name: 'share', method: 'web-share', content_type: 'weekly' })]);
  });

  it('says so when the card cannot be drawn', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    render(<ProgressView progress={PROGRESS} playable={false} dataId="owner" shareWeek />);
    fireEvent.click(screen.getByRole('button', { name: /Chia sẻ tuần này/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('Chưa tạo được thẻ. Bạn thử lại sau nhé.');
  });
});
