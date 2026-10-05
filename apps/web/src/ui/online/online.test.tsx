import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PartyView } from '@miu/schema/multiplayer';
import { createSocialStore, type SocialCommand } from '../../game-bridge/social-store';
import { PartyFrame, SocialLayer, toastText } from './social-layer';

afterEach(cleanup);

function setup() {
  const social = createSocialStore();
  const sent: SocialCommand[] = [];
  social.onCommand((c) => sent.push(c));
  return { social, sent };
}

const fill = (text: string) => text.replace('{name}', 'Miu');

describe('the interaction menu on another player', () => {
  it('waves, says a canned line, invites; every line is one of the fixed ones', () => {
    const { social, sent } = setup();
    render(<SocialLayer social={social} covered={false} fill={fill} />);
    act(() => social.update({ menu: { id: 'p-b', name: 'Bông', isBot: false } }));
    const menu = screen.getByRole('dialog');
    expect(within(menu).getByText('Bông')).toBeTruthy();
    fireEvent.click(within(menu).getByRole('button', { name: /Vẫy tay/ }));
    expect(sent.at(-1)).toEqual({ type: 'wave', to: 'p-b' });

    fireEvent.click(within(menu).getByRole('button', { name: /Câu có sẵn/ }));
    const lines = within(menu).getAllByRole('button').filter((b) => b.dataset.id?.startsWith('online-menu-lines-'));
    expect(lines).toHaveLength(8);
    expect(within(menu).queryByRole('textbox')).toBeNull();
    fireEvent.click(within(menu).getByRole('button', { name: 'Cùng chơi nhé!' }));
    expect(sent.at(-1)).toEqual({ type: 'say', to: 'p-b', text: 'Cùng chơi nhé!' });

    fireEvent.click(within(menu).getByRole('button', { name: /Quay lại/ }));
    fireEvent.click(within(menu).getByRole('button', { name: /Mời vào đội/ }));
    expect(sent.at(-1)).toEqual({ type: 'invite', to: 'p-b' });
  });

  it('blocks after a confirmation, and reports only with a picked reason (no free text)', () => {
    const { social, sent } = setup();
    render(<SocialLayer social={social} covered={false} fill={fill} />);
    act(() => social.update({ menu: { id: 'p-b', name: 'Bông', isBot: false } }));
    fireEvent.click(screen.getByRole('button', { name: /Chặn/ }));
    expect(sent).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /^Chặn$/ }));
    expect(sent.at(-1)).toEqual({ type: 'block', id: 'p-b' });

    fireEvent.click(screen.getByRole('button', { name: /Quay lại/ }));
    fireEvent.click(screen.getByRole('button', { name: /Báo cáo/ }));
    const send = screen.getByRole('button', { name: /Gửi báo cáo/ }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /Tên nhân vật không phù hợp/ }));
    fireEvent.click(send);
    expect(sent.at(-1)).toEqual({ type: 'report', id: 'p-b', reason: 'name' });
  });

  it('labels a companion bot and offers it only the friendly actions', () => {
    const { social } = setup();
    render(<SocialLayer social={social} covered={false} fill={fill} />);
    act(() => social.update({ menu: { id: 'bot-tt-1', name: 'Bé Bông', isBot: true } }));
    const menu = screen.getByRole('dialog');
    expect(within(menu).getByText(/\[Bạn máy\] Bé Bông/)).toBeTruthy();
    expect(within(menu).queryByRole('button', { name: /Chặn/ })).toBeNull();
    expect(within(menu).queryByRole('button', { name: /Báo cáo/ })).toBeNull();
    expect(within(menu).getByRole('button', { name: /Mời vào đội/ })).toBeTruthy();
  });
});

describe('the party frame', () => {
  const party: PartyView = {
    id: 'party-1',
    leader: 'p-me',
    members: [
      { id: 'p-me', displayName: 'Miu', isBot: false, species: 'cat', pet: 'cun-con', mapId: 'trung-tam' },
      { id: 'p-b', displayName: 'Bông', isBot: false, species: 'fox', pet: null, mapId: 'cho-phien' },
      { id: 'bot-tt-1', displayName: 'Bé Bông', isBot: true, species: 'rabbit', pet: null, mapId: null },
    ],
  };

  it('lists the members with the leader, where each is and the bot label; the leader removes and hands over', () => {
    const { social, sent } = setup();
    social.update({ party, selfId: 'p-me', mapId: 'trung-tam' });
    render(<PartyFrame social={social} fill={fill} />);
    const frame = screen.getByRole('region', { name: /Đội của bạn \(3\/4\)/ });
    expect(within(frame).getByText('Bạn')).toBeTruthy();
    expect(within(frame).getAllByLabelText('Trưởng đội')).toHaveLength(1);
    expect(within(frame).getByText(/\[Bạn máy\] Bé Bông/)).toBeTruthy();
    expect(within(frame).getByText('Đang chuyển bản đồ')).toBeTruthy();

    fireEvent.click(within(frame).getByRole('button', { name: /Việc với Bông/ }));
    fireEvent.click(within(frame).getByRole('button', { name: /Đến chỗ bạn/ }));
    expect(sent.at(-1)).toEqual({ type: 'goto', id: 'p-b' });
    fireEvent.click(within(frame).getByRole('button', { name: /Nhường trưởng đội/ }));
    expect(sent.at(-1)).toEqual({ type: 'promote', id: 'p-b' });
    fireEvent.click(within(frame).getByRole('button', { name: /Mời ra khỏi đội/ }));
    expect(sent.at(-1)).toEqual({ type: 'kick', id: 'p-b' });

    fireEvent.click(within(frame).getByRole('button', { name: /Nhắn đội/ }));
    fireEvent.click(within(frame).getByRole('button', { name: 'Hoan hô bạn!' }));
    expect(sent.at(-1)).toEqual({ type: 'party-say', text: 'Hoan hô bạn!' });
    fireEvent.click(within(frame).getByRole('button', { name: /Rời đội/ }));
    expect(sent.at(-1)).toEqual({ type: 'leave-party' });
  });

  it('gives a member who is not the leader no remove or hand-over', () => {
    const { social } = setup();
    social.update({ party: { ...party, leader: 'p-b' }, selfId: 'p-me', mapId: 'trung-tam' });
    render(<PartyFrame social={social} fill={fill} />);
    fireEvent.click(screen.getByRole('button', { name: /Việc với Bông/ }));
    expect(screen.queryByRole('button', { name: /Mời ra khỏi đội/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Đến chỗ bạn/ })).toBeTruthy();
  });

  it('shows nothing outside a party', () => {
    const { social } = setup();
    const { container } = render(<PartyFrame social={social} fill={fill} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('invites and the leader going through a gate', () => {
  it('answers an invite, and lets it lapse on its own', () => {
    vi.useFakeTimers();
    try {
      const { social, sent } = setup();
      render(<SocialLayer social={social} covered={false} fill={fill} />);
      act(() => social.update({ invites: [{ from: { id: 'p-b', name: 'Bông', isBot: false }, expiresAt: Date.now() + 60_000, ttlMs: 60_000 }] }));
      expect(screen.getByText(/Bông mời bạn vào đội/)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /Vào đội/ }));
      expect(sent.at(-1)).toEqual({ type: 'reply', from: 'p-b', accept: true });

      act(() => social.update({ invites: [{ from: { id: 'p-c', name: 'Tôm', isBot: false }, expiresAt: Date.now() + 60_000, ttlMs: 60_000 }] }));
      act(() => vi.advanceTimersByTime(60_001));
      expect(screen.queryByText(/Tôm mời bạn vào đội/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('asks to come along with the leader, by the place name', () => {
    const { social, sent } = setup();
    render(<SocialLayer social={social} covered={false} fill={fill} />);
    act(() => social.update({ travel: { from: { id: 'p-lead', name: 'Tôm', isBot: false }, region: 'cho-phien' } }));
    expect(screen.getByText(/Trưởng đội Tôm đi tới .+\. Cùng đi nhé\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Cùng đi/ }));
    expect(sent.at(-1)).toEqual({ type: 'travel-answer', accept: true });
  });

  it('keeps the cards away while another screen covers the game', () => {
    const { social } = setup();
    social.update({ travel: { from: { id: 'p-lead', name: 'Tôm', isBot: false }, region: 'cho-phien' } });
    render(<SocialLayer social={social} covered fill={fill} />);
    expect(screen.queryByRole('button', { name: /Cùng đi/ })).toBeNull();
  });
});

describe('toasts', () => {
  it('words every notice, with the player named or "bạn ấy"', () => {
    expect(toastText({ kind: 'notice', code: 'blocked', name: 'Bông', seq: 1 }).vi).toBe('Đã chặn Bông.');
    expect(toastText({ kind: 'notice', code: 'not-here', name: null, seq: 1 })).toEqual({ vi: 'Không còn ở gần bạn ấy nữa.', en: 'Not near them any more.' });
    expect(toastText({ kind: 'waved', name: 'Bông', seq: 1 }).en).toBe('Bông waves at you');
    expect(toastText({ kind: 'said', name: 'Bông', text: 'Xin chào bạn!', seq: 1 })).toEqual({ vi: 'Bông: Xin chào bạn!', en: 'Bông: Hello there!' });
  });
});
