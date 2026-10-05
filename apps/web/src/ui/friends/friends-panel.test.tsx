import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SocialView } from '@miu/schema/friends';
import { createSocialStore, type SocialCommand } from '../../game-bridge/social-store';
import { FriendAskCard } from './friend-ask-card';
import type { SocialSource } from './friends-api';
import { FriendsPanel } from './friends-panel';

const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const AT = '2026-10-05T03:00:00.000Z';

const VIEW: SocialView = {
  friends: [
    { id: id(1), displayName: 'Tôm', species: 'fox', isBot: false, since: AT, online: true, publicId: 'p-tom', mapId: 'trung-tam' },
    { id: id(2), displayName: 'Bé Bông', species: 'rabbit', isBot: true, since: AT, online: false, publicId: null, mapId: null },
  ],
  incoming: [{ id: id(3), displayName: 'Gấu Con', species: 'bear', isBot: false, sentAt: AT }],
  outgoing: [{ id: id(4), displayName: 'Mèo Mun', species: 'cat', isBot: false, sentAt: AT }],
  blocks: [{ id: id(5), displayName: 'Cáo Nâu', species: 'fox', since: AT }],
  max: 50,
};

function fakeSource(withAnswers = true) {
  const calls: string[] = [];
  const source: SocialSource = {
    load: async () => VIEW,
    removeFriend: async (f) => void calls.push(`remove ${f}`),
    unblock: async (b) => void calls.push(`unblock ${b}`),
    ...(withAnswers
      ? {
          answer: async (r: string, accept: boolean) => {
            calls.push(`answer ${r} ${accept}`);
            return VIEW;
          },
          cancel: async (r: string) => void calls.push(`cancel ${r}`),
        }
      : {}),
  };
  return { source, calls };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('friends list', () => {
  it('lists friends with where they are, bots labelled, and goes to an online friend', async () => {
    const social = createSocialStore();
    const sent: SocialCommand[] = [];
    social.onCommand((c) => sent.push(c));
    const onGo = vi.fn();
    render(<FriendsPanel source={fakeSource().source} social={social} onGo={onGo} />);
    expect(await screen.findByText('Tôm')).toBeTruthy();
    expect(screen.getByText('🤖 [Bạn máy] Bé Bông')).toBeTruthy();
    expect(screen.getByText('Không online')).toBeTruthy();
    fireEvent.click(document.querySelector(`[data-id="friend-goto-${id(1)}"]`) as HTMLElement);
    expect(sent).toEqual([{ type: 'goto', id: 'p-tom' }]);
    expect(onGo).toHaveBeenCalled();
    // An offline friend cannot be gone to.
    expect(document.querySelector(`[data-id="friend-goto-${id(2)}"]`)).toBeNull();
  });

  it('removes a friend only after a confirmation', async () => {
    const { source, calls } = fakeSource();
    render(<FriendsPanel source={source} />);
    await screen.findByText('Tôm');
    fireEvent.click(document.querySelector(`[data-id="friend-remove-${id(1)}"]`) as HTMLElement);
    expect(calls).toEqual([]);
    fireEvent.click(document.querySelector(`[data-id="friend-remove-yes-${id(1)}"]`) as HTMLElement);
    await waitFor(() => expect(calls).toEqual([`remove ${id(1)}`]));
  });

  it('answers and takes back requests, and lifts a block', async () => {
    const { source, calls } = fakeSource();
    render(<FriendsPanel source={source} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Lời mời (2)' }));
    fireEvent.click(document.querySelector(`[data-id="friend-accept-${id(3)}"]`) as HTMLElement);
    fireEvent.click(document.querySelector(`[data-id="friend-cancel-${id(4)}"]`) as HTMLElement);
    fireEvent.click(screen.getByRole('tab', { name: 'Đã chặn' }));
    fireEvent.click(document.querySelector(`[data-id="friend-unblock-${id(5)}"]`) as HTMLElement);
    await waitFor(() => expect(calls).toEqual([`answer ${id(3)} true`, `cancel ${id(4)}`, `unblock ${id(5)}`]));
  });

  it('shows the account owner the requests without answering for the player', async () => {
    render(<FriendsPanel source={fakeSource(false).source} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Lời mời (2)' }));
    expect(document.querySelector(`[data-id="friend-accept-${id(3)}"]`)).toBeNull();
    expect(screen.getAllByText('Đang chờ trả lời').length).toBeGreaterThan(0);
    // Outside the game there is no room to list.
    expect(screen.queryByRole('tab', { name: 'Cùng phòng' })).toBeNull();
  });

  it('lists who else is in the room in the game, to add as a friend', async () => {
    const social = createSocialStore();
    const sent: SocialCommand[] = [];
    social.onCommand((c) => sent.push(c));
    social.update({
      room: [
        { id: 'p-tom', name: 'Tôm', isBot: false, species: 'fox' },
        { id: 'p-new', name: 'Thỏ Trắng', isBot: false, species: 'rabbit' },
      ],
    });
    render(<FriendsPanel source={fakeSource().source} social={social} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Cùng phòng' }));
    expect(document.querySelector('[data-id="friends-room-add-p-tom"]')).toBeNull();
    fireEvent.click(document.querySelector('[data-id="friends-room-add-p-new"]') as HTMLElement);
    expect(sent).toEqual([{ type: 'befriend', to: 'p-new' }]);
  });
});

describe('a friend request in the game', () => {
  it('is answered through the API and leaves the card', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
        return new Response(JSON.stringify(VIEW), { status: 200 });
      }),
    );
    const social = createSocialStore();
    social.update({ friendAsks: [{ id: id(9), from: { id: id(9), name: 'Bé Bông', isBot: true, species: 'rabbit' } }] });
    render(<FriendAskCard social={social} />);
    expect(screen.getByText(/🤖 \[Bạn máy\] Bé Bông muốn kết bạn với bạn/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đồng ý' }));
    await waitFor(() => expect(social.getSnapshot().friendAsks).toEqual([]));
    expect(calls).toEqual([{ url: `/api/friends/requests/${id(9)}`, body: { accept: true } }]);
    expect(social.getSnapshot().toast).toMatchObject({ kind: 'friend', added: true, name: 'Bé Bông' });
  });
});
