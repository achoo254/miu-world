import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InviteDto } from '@miu/schema/invites';
import type { SocialView } from '@miu/schema/friends';
import { resetTrackForTest } from '../../analytics/track';
import type { SocialSource } from './friends-api';
import { FriendsPanel } from './friends-panel';

const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const CODE = 'AbCdEfGhIjKlMnOpQrStUv';
const LINK = `http://localhost:3000/moi/${CODE}?utm_source=share&utm_medium=share&utm_campaign=invite`;
const VIEW: SocialView = { friends: [], incoming: [], outgoing: [], blocks: [], max: 50 };
const SOURCE: SocialSource = { load: async () => VIEW, removeFriend: async () => undefined, unblock: async () => undefined };
const invite = (n: number): InviteDto => ({ id: id(n), createdAt: '2026-10-12T06:00:00.000Z', expiresAt: '2026-10-19T06:00:00.000Z' });

let live: InviteDto[];
let calls: string[];
let copied: string[];

beforeEach(() => {
  live = [];
  calls = [];
  copied = [];
  resetTrackForTest();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async (text: string) => void copied.push(text)) }, configurable: true });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${url}`;
      calls.push(key);
      if (key === 'GET /api/invites') return new Response(JSON.stringify({ invites: live, max: 5 }), { status: 200 });
      if (key === 'POST /api/invites') {
        if (live.length >= 5) return new Response(JSON.stringify({ error: 'invite-limit' }), { status: 409 });
        const made = invite(live.length + 1);
        live = [...live, made];
        return new Response(JSON.stringify({ ...made, code: CODE }), { status: 201 });
      }
      if (key.startsWith('DELETE /api/invites/')) {
        live = live.filter((i) => `DELETE /api/invites/${i.id}` !== key);
        return new Response(null, { status: 204 });
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

const openInviteTab = async (): Promise<void> => {
  fireEvent.click(await screen.findByRole('tab', { name: 'Mời bạn' }));
  await screen.findByRole('button', { name: 'Tạo link mời' });
};

describe('inviting a friend by a link', () => {
  it('is a tab of the player’s own list only, not of the account owner’s view of a player', async () => {
    const own = render(<FriendsPanel source={SOURCE} invites />);
    expect(await screen.findByRole('tab', { name: 'Mời bạn' })).toBeTruthy();
    own.unmount();
    render(<FriendsPanel source={SOURCE} />);
    await screen.findByRole('tab', { name: /Bạn bè/ });
    expect(screen.queryByRole('tab', { name: 'Mời bạn' })).toBeNull();
  });

  it('makes a link, shows it once, copies it on a computer and lists it as live', async () => {
    render(<FriendsPanel source={SOURCE} invites />);
    await openInviteTab();
    expect(screen.getByText('Chưa có link nào đang dùng được.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo link mời' }));
    const field = await screen.findByRole('textbox', { name: 'Link mời bạn chơi Miu World' });
    expect((field as HTMLInputElement).value).toBe(LINK);
    expect(screen.getByRole('heading', { name: 'Link còn hiệu lực (1/5)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép link' }));
    await waitFor(() => expect(copied).toEqual([LINK]));
    expect(await screen.findByText('Đã sao chép link, dán cho bạn nhé.')).toBeTruthy();
  });

  it('keeps the new link’s code while the list is open, but a link from before has none to send', async () => {
    live = [invite(9)];
    render(<FriendsPanel source={SOURCE} invites />);
    await openInviteTab();
    await screen.findByRole('heading', { name: 'Link còn hiệu lực (1/5)' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText(/Link chỉ hiện lúc vừa tạo/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo link mời' }));
    await screen.findByRole('textbox');
    // Another tab and back: the link made here is still there to send.
    fireEvent.click(screen.getByRole('tab', { name: /Bạn bè/ }));
    fireEvent.click(await screen.findByRole('tab', { name: 'Mời bạn' }));
    expect(await screen.findByRole('textbox')).toBeTruthy();
  });

  it('withdraws a link', async () => {
    live = [invite(1)];
    render(<FriendsPanel source={SOURCE} invites />);
    await openInviteTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }));
    await waitFor(() => expect(calls).toContain(`DELETE /api/invites/${id(1)}`));
    expect(await screen.findByText('Chưa có link nào đang dùng được.')).toBeTruthy();
  });

  it('stops at five live links and says what to do', async () => {
    live = [1, 2, 3, 4, 5].map(invite);
    render(<FriendsPanel source={SOURCE} invites />);
    await openInviteTab();
    await screen.findByText(/Đã đủ 5 link/);
    expect((screen.getByRole('button', { name: 'Tạo link mời' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the server’s refusal when it is full after all', async () => {
    render(<FriendsPanel source={SOURCE} invites />);
    await openInviteTab();
    live = [1, 2, 3, 4, 5].map(invite);
    fireEvent.click(screen.getByRole('button', { name: 'Tạo link mời' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/5 link mời/);
  });
});
