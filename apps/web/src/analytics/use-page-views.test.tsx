import { act, cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Navigate, Route, Routes, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_SETTLE_MS, usePageViews } from './use-page-views';

function Tracker() {
  usePageViews();
  return null;
}

let go: (path: string) => void = () => undefined;
function Navigator() {
  const navigate = useNavigate();
  useEffect(() => {
    go = (path) => void navigate(path);
  }, [navigate]);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubFetch(): string[] {
  const paths: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      paths.push(String((JSON.parse(String(init?.body)) as { path: string }).path));
      return new Response(null, { status: 204 });
    }),
  );
  return paths;
}

describe('page views', () => {
  it('counts the page a redirect lands on, not the one it left', () => {
    const paths = stubFetch();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Tracker />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={null} />
        </Routes>
      </MemoryRouter>,
    );
    act(() => {
      vi.advanceTimersByTime(PAGE_SETTLE_MS);
    });
    expect(paths).toEqual(['/login']);
  });

  it('counts each new page once', () => {
    const paths = stubFetch();
    render(
      <MemoryRouter initialEntries={['/play']}>
        <Tracker />
        <Navigator />
      </MemoryRouter>,
    );
    act(() => {
      vi.advanceTimersByTime(PAGE_SETTLE_MS);
    });
    act(() => go('/home'));
    act(() => {
      vi.advanceTimersByTime(PAGE_SETTLE_MS);
    });
    act(() => go('/home?tab=x'));
    act(() => {
      vi.advanceTimersByTime(PAGE_SETTLE_MS);
    });
    expect(paths).toEqual(['/play', '/home']);
  });

  it('counts an invite link as /moi: the code never goes to the server', () => {
    const paths = stubFetch();
    render(
      <MemoryRouter initialEntries={['/moi/AAAAAAAAAAAAAAAAAAAAAA']}>
        <Tracker />
        <Navigator />
      </MemoryRouter>,
    );
    act(() => {
      vi.advanceTimersByTime(PAGE_SETTLE_MS);
    });
    expect(paths).toEqual(['/moi']);
  });
});
