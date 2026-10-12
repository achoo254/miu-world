import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountProvider } from '../account/account-context';
import { AppRoutes } from '../app-shell';
import viLocale from '../i18n/locales/vi.json';

function stubSession(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => (url === '/api/auth/me' ? new Response(JSON.stringify(body), { status }) : new Response(JSON.stringify({ error: 'not-found' }), { status: 404 }))),
  );
}

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AccountProvider>
        <AppRoutes />
      </AccountProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the introduction at /', () => {
  it('greets a visitor who is not signed in, with a way to play and to the lesson pages', async () => {
    stubSession(401, { error: 'unauthenticated' });
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: viLocale['landing.title'] })).toBeTruthy();
    expect(screen.getByText(viLocale['landing.benefitFree'])).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Chơi ngay' }).getAttribute('href')).toBe('/login');
    // The lesson pages are static files: plain links with a trailing slash, not routes of the app.
    expect(screen.getByRole('link', { name: 'Các bài Toán 2' }).getAttribute('href')).toBe('/bai/toan-2/');
    expect(screen.getByRole('link', { name: 'Các bài Tiếng Việt 2' }).getAttribute('href')).toBe('/bai/tieng-viet-2/');
    expect(screen.getByRole('img', { name: viLocale['landing.imageAlt'] })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Đăng nhập' })).toBeNull();
  });

  it('leads to the sign-in screen from the play button', async () => {
    stubSession(401, { error: 'unauthenticated' });
    renderAt('/');
    (await screen.findByRole('link', { name: 'Chơi ngay' })).click();
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeTruthy();
  });

  it('still sends a signed-out visitor of any other private screen to sign in', async () => {
    stubSession(401, { error: 'unauthenticated' });
    renderAt('/home');
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeTruthy();
  });
});
