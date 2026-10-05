import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CoopLobbyView, CoopStateView } from '@miu/schema/coop';
import { QuestStepPublic } from '@miu/schema/content';
import type { CharacterDto } from '@miu/schema/game';
import { createSocialStore, type SocialCommand } from '../../game-bridge/social-store';
import type { PlayerData } from '../player/player-data';
import { PROGRESS } from '../player/test-fixtures';
import type { ActiveQuestView } from '../quest/quest-flow';
import { CoopLayer } from './coop-layer';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const CHARACTER: CharacterDto = { species: 'rabbit', name: 'Mochi', equipped: [], pet: null };
const DATA: PlayerData = { character: CHARACTER, progress: PROGRESS, quests: [] };

const QUEST: ActiveQuestView = {
  id: 'with-cau-tre',
  region: 'lang-ven-song',
  chapter: 1,
  title: 'Dựng cầu tre',
  status: 'active',
  category: 'coop',
  summary: 'Cả đội dựng cầu.',
  texts: {},
  steps: [
    QuestStepPublic.parse({ id: 'gap', title: 'Gặp bác lái đò', kind: 'dialogue', target: 'bac-lai-do', lines: [{ speaker: 'Bác', text: 'Dựng cầu nhé {name}!' }] }),
    QuestStepPublic.parse({ id: 'cung-choi', title: 'Dựng cầu', kind: 'coop', trigger: 'auto', mode: 'pieces', prompt: 'Mỗi bạn giữ một mảnh, {name} nhé.', guide: ['Cho cả đội xem mảnh của mình.'], seats: 3 }),
  ],
  reward: { xp: 40, coin: 15, skillXp: {}, items: {} },
};
const QUESTS = new Map([[QUEST.id, QUEST]]);

const LOBBY: CoopLobbyView = {
  questId: QUEST.id,
  leader: 'p-me',
  members: [{ id: 'p-me', displayName: 'Mochi', isBot: false, species: 'rabbit', ready: true }],
  seats: 3,
  botsFill: 2,
  startsInMs: null,
};

const PIECES: CoopStateView = {
  questId: QUEST.id,
  mode: 'pieces',
  self: 'p-me',
  status: 'playing',
  waitingFor: null,
  round: 0,
  rounds: 2,
  seats: [
    { id: 'p-me', displayName: 'Mochi', isBot: false, species: 'rabbit', standIn: null, away: false, greeting: null },
    { id: 'bot-tt-1@c1', displayName: 'Bé Bông', isBot: true, species: 'rabbit', standIn: null, away: false, greeting: null },
  ],
  turn: 'p-me',
  task: { id: 't1', prompt: 'Cầu dài mấy mét?', choices: [{ id: 'a', text: '12 m' }, { id: 'b', text: '21 m' }] },
  pieces: [
    { index: 0, seat: 'p-me', shared: false, text: 'Bờ bên này 5 m', en: null },
    { index: 1, seat: 'bot-tt-1@c1', shared: false, text: null, en: null },
  ],
  title: null,
  tasks: [],
  holds: [],
  boss: null,
  last: null,
};

function setup() {
  const social = createSocialStore();
  const sent: SocialCommand[] = [];
  social.onCommand((c) => sent.push(c));
  social.update({ selfId: 'p-me' });
  const onPaid = vi.fn();
  render(<CoopLayer social={social} quests={QUESTS} data={DATA} onPaid={onPaid} onMap={() => undefined} />);
  return { social, sent, onPaid };
}

describe('the co-op lobby', () => {
  it('shows the challenge, the team and the bots filling free places; the leader starts', () => {
    const { social, sent } = setup();
    act(() => social.update({ coopLobby: { lobby: LOBBY, at: Date.now() } }));
    expect(screen.getByText('Dựng cầu tre')).toBeTruthy();
    expect(screen.getByText('Mỗi bạn giữ một mảnh, Mochi nhé.')).toBeTruthy();
    expect(screen.getByText(/\+2 bạn máy vào chỗ trống/)).toBeTruthy();
    fireEvent.click(document.querySelector('[data-id="coop-lobby-start"]') as HTMLElement);
    expect(sent.at(-1)).toEqual({ type: 'coop', message: { type: 'coop-start' } });
    act(() => social.update({ coopLobby: { lobby: { ...LOBBY, startsInMs: 3_000 }, at: Date.now() } }));
    expect(screen.getByRole('status').textContent).toMatch(/Bắt đầu sau 3/);
  });

  it('lets a member say she is in, and anyone step out', () => {
    const { social, sent } = setup();
    act(() => social.update({ coopLobby: { lobby: { ...LOBBY, leader: 'p-other', botsFill: 0, members: [{ id: 'p-other', displayName: 'Tôm', isBot: false, species: 'fox', ready: true }, { ...LOBBY.members[0], ready: false } as CoopLobbyView['members'][number]] }, at: Date.now() } }));
    expect(document.querySelector('[data-id="coop-lobby-start"]')).toBeNull();
    fireEvent.click(document.querySelector('[data-id="coop-lobby-ready"]') as HTMLElement);
    expect(sent.at(-1)).toEqual({ type: 'coop', message: { type: 'coop-ready', ready: true } });
    fireEvent.click(document.querySelector('[data-id="coop-lobby-leave"]') as HTMLElement);
    expect(sent.at(-1)).toEqual({ type: 'coop', message: { type: 'coop-leave' } });
  });
});

describe('playing a co-op challenge', () => {
  it('shows her clue to share, the others hidden, and answers only when every clue is shown and it is her turn', () => {
    const { social, sent } = setup();
    act(() => social.update({ coopState: { state: PIECES, at: Date.now() } }));
    expect(screen.getByText('Bờ bên này 5 m')).toBeTruthy();
    expect(screen.getByText('Mảnh của Bé Bông')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Bạn máy' })).toBeTruthy();
    expect((document.querySelector('[data-id="coop-choice-t1-a"]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(document.querySelector('[data-id="coop-share-0"]') as HTMLElement);
    expect(sent.at(-1)).toEqual({ type: 'coop', message: { type: 'coop-act', action: { kind: 'share', piece: 0 } } });
    const shared = { ...PIECES, pieces: PIECES.pieces.map((p) => ({ ...p, shared: true, text: p.text ?? 'Bờ bên kia 7 m' })) };
    act(() => social.update({ coopState: { state: shared, at: Date.now() } }));
    fireEvent.click(document.querySelector('[data-id="coop-choice-t1-a"]') as HTMLElement);
    expect(sent.at(-1)).toEqual({ type: 'coop', message: { type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'a' } } });
    fireEvent.click(document.querySelector('[data-id="coop-help-hint"]') as HTMLElement);
    expect(sent.at(-1)).toEqual({ type: 'coop', message: { type: 'coop-help', task: 't1', layer: 'hint' } });
    // The host's line after a right answer, and the line to copy into the vở.
    act(() => social.update({ coopState: { state: { ...shared, last: { seq: 1, by: 'p-me', kind: 'right', line: 'Giỏi lắm {name}!', lineEn: null, copy: { step: 't1', question: 'Cầu dài mấy mét?', answer: '12 m' }, say: null } }, at: Date.now() } }));
    expect(screen.getByText('Giỏi lắm Mochi!')).toBeTruthy();
    expect(document.querySelector('[data-id="coop-copy"]')?.textContent).toContain('Cầu dài mấy mét? — 12 m');
  });

  it('shows what a bot says in its own voice, and greets a player it won with before', () => {
    const { social } = setup();
    const seats = PIECES.seats.map((seat) => (seat.isBot ? { ...seat, greeting: { runs: 2, lastQuestId: QUEST.id } } : seat));
    act(() => social.update({ coopState: { state: { ...PIECES, seats, last: { seq: 2, by: 'bot-tt-1@c1', kind: 'shared', line: null, lineEn: null, copy: null, say: { key: 'share', variant: 2 } } }, at: Date.now() } }));
    expect(screen.getByText('Tèn ten! Mảnh bí mật của tớ nè!')).toBeTruthy();
    expect(document.querySelector('[data-id="coop-greeting-bot-tt-1@c1"]')?.textContent).toContain('cùng thắng 2 lần, lần trước là «Dựng cầu tre»');
  });

  it('shows a help layer only under the question it is for', () => {
    const { social } = setup();
    const shared = { ...PIECES, pieces: PIECES.pieces.map((p) => ({ ...p, shared: true, text: p.text ?? 'Bờ bên kia 7 m' })) };
    act(() => social.update({ coopState: { state: shared, at: Date.now() }, coopHelp: { task: 't1', layer: 'hint', text: 'Cộng hai bờ lại nhé', textEn: null, explanation: null, explanationEn: null } }));
    expect(screen.getByText('Cộng hai bờ lại nhé')).toBeTruthy();
    act(() => social.update({ coopState: { state: { ...shared, task: { id: 't2', prompt: 'Câu khác?', choices: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }] } }, at: Date.now() } }));
    expect(screen.queryByText('Cộng hai bờ lại nhé')).toBeNull();
  });

  it('says who the team waits for, shows the boss HP, and steps out only after a confirmation', () => {
    const { social, sent } = setup();
    const boss: CoopStateView = { ...PIECES, mode: 'team-boss', pieces: [], turn: 'bot-tt-1@c1', boss: { name: 'Rồng Giấy', nameEn: null, hp: 300, maxHp: 500 }, status: 'paused', waitingFor: { id: 'p-x', displayName: 'Tôm', msLeft: 45_000 } };
    act(() => social.update({ coopState: { state: boss, at: Date.now() } }));
    expect(screen.getByText(/Chờ Tôm quay lại… 45 giây/)).toBeTruthy();
    expect(document.querySelector('[data-id="coop-boss-hp"]')?.getAttribute('data-hp')).toBe('300');
    fireEvent.click(document.querySelector('[data-id="coop-leave"]') as HTMLElement);
    expect(sent).toEqual([]);
    fireEvent.click(document.querySelector('[data-id="coop-leave-yes"]') as HTMLElement);
    expect(sent.at(-1)).toEqual({ type: 'coop', message: { type: 'coop-leave' } });
  });

  it('ends kindly when she stepped out, and with why nothing was paid', () => {
    const { social, onPaid } = setup();
    act(() => social.update({ coopEnd: { questId: QUEST.id, reason: 'left', result: null } }));
    expect(screen.getByText('Bạn đã rời thử thách. Không mất gì cả!')).toBeTruthy();
    fireEvent.click(document.querySelector('[data-id="coop-end-close"]') as HTMLElement);
    expect(social.getSnapshot().coopEnd).toBeNull();
    act(() => social.update({ coopEnd: { questId: QUEST.id, reason: 'done', result: { reward: null, completion: null, unpaid: 'no-part' } } }));
    expect(screen.getByText(/góp một phần để nhận thưởng/)).toBeTruthy();
    expect(onPaid).not.toHaveBeenCalled();
  });
});
