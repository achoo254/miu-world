import { act, cleanup, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast, clearShown } from './toast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** A screen that shows one line at a time, the way the quest layer and the side quests do. */
function Owner({ show }: { show: (set: (line: string) => void) => void }) {
  const [toast, setToast] = useState<string | null>(null);
  show(setToast);
  return toast ? <Toast message={toast} onDone={(shown) => setToast(clearShown(shown))} /> : null;
}

describe('Toast', () => {
  it('says which line ran out of time', () => {
    const onDone = vi.fn();
    render(<Toast message="Xin chào" onDone={onDone} ms={1000} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(onDone).toHaveBeenCalledWith('Xin chào');
  });

  it('keeps a new line that arrives just as the last one runs out', () => {
    let set: (line: string) => void = () => undefined;
    render(<Owner show={(s) => (set = s)} />);
    act(() => set('Rương khóa chặt.'));
    act(() => vi.advanceTimersByTime(3199));
    // The next line is set, then the old line's timer fires before the screen has drawn the new one (a busy page).
    act(() => {
      set('Rương kêu cạch cạch.');
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('status').textContent).toBe('Rương kêu cạch cạch.');
    act(() => vi.advanceTimersByTime(3200));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
