import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PartyView } from '@miu/schema/multiplayer';
import { createSocialStore, type SocialCommand } from '../../game-bridge/social-store';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList } from '../player/test-fixtures';
import { PartyQuestCard } from './party-quest-card';

afterEach(cleanup);

const DATA: PlayerData = { character: { species: 'cat', name: 'Mochi', equipped: [], pet: null }, progress: PROGRESS, quests: questList(0).quests };
const QUEST = DATA.quests[0]?.quest.id ?? '';
const PARTY: PartyView = {
  id: 'party-1',
  leader: 'p-me',
  members: [
    { id: 'p-me', displayName: 'Mochi', isBot: false, species: 'cat', pet: null, mapId: 'forest-ch1' },
    { id: 'p-b', displayName: 'Bông', isBot: false, species: 'fox', pet: null, mapId: 'forest-ch1' },
  ],
};

function setup(selfId = 'p-me') {
  const social = createSocialStore();
  const sent: SocialCommand[] = [];
  social.onCommand((c) => sent.push(c));
  social.update({ party: PARTY, selfId });
  const onPlay = vi.fn();
  render(<PartyQuestCard social={social} data={DATA} questId={QUEST} onPlay={onPlay} />);
  return { social, sent, onPlay };
}

describe('a quest played by the party', () => {
  it('lets the leader ask the party to play the quest on her screen', () => {
    const { sent } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Cả đội cùng chơi bài này/ }));
    expect(sent).toEqual([{ type: 'party-quest', message: { type: 'party-quest-start', questId: QUEST } }]);
  });

  it('asks a member, who joins (her map loads that quest) or says not now', () => {
    const { social, sent, onPlay } = setup('p-b');
    expect(screen.queryByRole('button', { name: /Cả đội cùng chơi/ })).toBeNull();
    act(() =>
      social.update({
        partyQuest: { questId: QUEST, leader: 'p-me', turn: null, members: [{ id: 'p-me', displayName: 'Mochi', joined: true, done: 0, waiting: false, finished: false }, { id: 'p-b', displayName: 'Bông', joined: false, done: 0, waiting: false, finished: false }] },
      }),
    );
    expect(screen.getByRole('alertdialog').textContent).toMatch(/Mochi rủ cả đội chơi/);
    fireEvent.click(screen.getByRole('button', { name: 'Chơi cùng' }));
    expect(sent.at(-1)).toEqual({ type: 'party-quest', message: { type: 'party-quest-join', questId: QUEST } });
    expect(onPlay).toHaveBeenCalledWith(QUEST);
  });

  it('says whom the party waits for and whose boss blow it is; cheers and nudges send fixed lines only', () => {
    const { social, sent } = setup();
    act(() =>
      social.update({
        partyQuest: { questId: QUEST, leader: 'p-me', turn: 'p-b', members: [{ id: 'p-me', displayName: 'Mochi', joined: true, done: 3, waiting: false, finished: false }, { id: 'p-b', displayName: 'Bông', joined: true, done: 2, waiting: true, finished: false }] },
      }),
    );
    expect(screen.getByText('Chờ Bông trả lời')).toBeTruthy();
    expect(screen.getByText('Lượt đánh trùm: Bông')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Cổ vũ/ }));
    fireEvent.click(screen.getByRole('button', { name: /Nhắc xem Gợi ý/ }));
    expect(sent).toEqual([
      { type: 'party-say', text: 'Cố lên nào!' },
      { type: 'party-say', text: 'Thử bấm Gợi ý xem!' },
    ]);
  });

  it('shows a companion bot\'s ask and its place in the party\'s play, labelled as a bot', () => {
    const social = createSocialStore();
    social.update({
      party: {
        ...PARTY,
        members: [
          { id: 'p-me', displayName: 'Mochi', isBot: false, species: 'cat', pet: null, mapId: 'forest-ch1' },
          { id: 'bot-tt-1', displayName: 'Bé Bông', isBot: true, species: 'rabbit', pet: null, mapId: 'forest-ch1' },
        ],
      },
      selfId: 'p-me',
    });
    render(<PartyQuestCard social={social} data={DATA} questId={QUEST} onPlay={vi.fn()} />);
    act(() =>
      social.update({
        partyQuest: { questId: QUEST, leader: 'bot-tt-1', turn: null, members: [{ id: 'bot-tt-1', displayName: 'Bé Bông', joined: true, done: 0, waiting: false, finished: false }, { id: 'p-me', displayName: 'Mochi', joined: false, done: 0, waiting: false, finished: false }] },
      }),
    );
    expect(screen.getByRole('alertdialog').textContent).toMatch(/🤖 Bé Bông rủ cả đội chơi/);
    act(() =>
      social.update({
        partyQuest: { questId: QUEST, leader: 'bot-tt-1', turn: 'bot-tt-1', members: [{ id: 'bot-tt-1', displayName: 'Bé Bông', joined: true, done: 2, waiting: true, finished: false }, { id: 'p-me', displayName: 'Mochi', joined: true, done: 3, waiting: false, finished: false }] },
      }),
    );
    expect(screen.getByText('Chờ 🤖 Bé Bông trả lời')).toBeTruthy();
    expect(screen.getByText('Lượt đánh trùm: 🤖 Bé Bông')).toBeTruthy();
    expect(document.querySelector('[data-id="party-quest-member-bot-tt-1"]')?.textContent).toMatch(/^🤖 Bé Bông/);
  });
});
