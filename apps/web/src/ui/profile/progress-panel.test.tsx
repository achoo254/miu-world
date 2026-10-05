import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlayerProgressDto } from '@miu/schema/progress';
import { ProgressLoader, ProgressView } from './progress-panel';

const PROGRESS: PlayerProgressDto = {
  subjects: [{ subjectId: 'tieng-viet', name: 'Tiếng Việt', level: 2, xp: 40, lessonsDone: 3, lessonsTotal: 10 }],
  strong: [{ skillId: 'doc-hieu', name: 'Đọc hiểu', subjectId: 'tieng-viet', level: 2, xp: 40 }],
  weak: [{ skillId: 'phep-cong', name: 'Phép cộng', subjectId: 'toan', level: 1, xp: 0 }],
  suggestions: [
    { questId: 'toan2-b01', title: 'Ôn tập các số đến 100', region: 'truong-hoc', reason: 'new', stars: null },
    { questId: 'tv2-b01', title: 'Tôi là học sinh lớp 2', region: 'truong-hoc', reason: 'improve', stars: 1 },
  ],
  weeks: [
    { weekStart: '2026-09-14', minutes: 0 },
    { weekStart: '2026-09-21', minutes: 30 },
    { weekStart: '2026-09-28', minutes: 60 },
    { weekStart: '2026-10-05', minutes: 15 },
  ],
  counts: { playerLevel: 3, lessonsDone: 3, lessonsTotal: 10, threeStars: 1, minigameRuns: 4, regionsComplete: 0, collectibles: 2 },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('progress view', () => {
  it('shows the counts, the strong and weak skills, the suggestions and the weeks', () => {
    render(
      <MemoryRouter>
        <ProgressView progress={PROGRESS} playable dataId="progress" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Bài đã học: 3/10')).toBeTruthy();
    expect(document.querySelector('[data-id="progress-strong-doc-hieu"]')).not.toBeNull();
    expect(document.querySelector('[data-id="progress-weak-phep-cong"]')).not.toBeNull();
    expect(screen.getByText('Chơi lại để thêm sao (1/3)')).toBeTruthy();
    expect(document.querySelector('[data-id="progress-play-toan2-b01"]')?.getAttribute('href')).toBe('/play?region=truong-hoc&quest=toan2-b01');
    expect(screen.getByLabelText('Tuần này: 15 phút')).toBeTruthy();
    expect(screen.getByLabelText('Tuần 28/09: 60 phút')).toBeTruthy();
  });

  it('leaves the lessons unlinked in the account owner’s view', () => {
    render(
      <MemoryRouter>
        <ProgressView progress={PROGRESS} playable={false} dataId="owner" />
      </MemoryRouter>,
    );
    expect(document.querySelector('[data-id^="owner-play-"]')).toBeNull();
  });

  it('offers a retry when the read fails', async () => {
    let calls = 0;
    const load = () => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('down')) : Promise.resolve(PROGRESS);
    };
    render(
      <MemoryRouter>
        <ProgressLoader load={load} playable dataId="progress" />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Bài đã học: 3/10')).toBeTruthy();
  });
});
