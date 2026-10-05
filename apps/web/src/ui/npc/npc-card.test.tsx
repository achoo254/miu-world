import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterDto } from '@miu/schema/game';
import type { NpcDto } from '@miu/schema/npc';
import { createGameStore } from '../../game-bridge/game-store';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList } from '../player/test-fixtures';
import { QuestLayer } from '../quest/quest-layer';

const CHARACTER: CharacterDto = { species: 'rabbit', name: 'Mochi', equipped: [], pet: null };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const bi = (vi: string, en = vi) => ({ vi, en });
const line = (vi: string, extra: object = {}) => ({ vi, en: `${vi} (en)`, ...extra });

const HOA_MI: NpcDto = {
  id: 'hoa-mi-rung',
  name: 'Họa Mi Rừng Xanh',
  region: 'khu-rung-bi-mat',
  targets: ['hoa-mi-rung'],
  role: bi('Ca sĩ của rừng'),
  personality: bi('Vui'),
  voice: bi('Líu lo'),
  dream: bi('Hát ở hội'),
  habit: bi('Dậy sớm'),
  fear: null,
  secret: null,
  likes: ['hat-de-rung'],
  climate: 'mild',
  // Untagged lines only: whatever the clock says, she says one of them.
  lines: [line('Chào {name}, nghe tớ hát không?')],
  relations: [],
  arcs: [{ id: 'bai-ca', title: bi('Bài ca'), teaser: bi('Nghe nhé'), chapters: [{ questId: 'quest-b', part: 1, title: bi('Chương 1: Lông vũ'), hearts: 0, state: 'open' }] }],
  friendship: { npc: 'hoa-mi-rung', points: 0, hearts: 0, nextHeartAt: 2, talkedToday: false, giftedToday: false },
  offer: { questId: 'quest-b', arcId: 'bai-ca', part: 1, ready: true, hearts: 0 },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(onPlayQuest = vi.fn()) {
  const posts: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/npcs?')) return json({ npcs: [HOA_MI] });
      if (url.endsWith('/talk')) {
        posts.push(url);
        return json({ friendship: { ...HOA_MI.friendship, points: 1, talkedToday: true }, raised: true, offer: HOA_MI.offer });
      }
      if (url.endsWith('/gift')) {
        posts.push(`${url} ${String(init?.body)}`);
        return json({ friendship: { ...HOA_MI.friendship, points: 4, hearts: 1, giftedToday: true }, itemId: 'hat-de-rung', left: 1, offer: HOA_MI.offer });
      }
      if (url.includes('category=side')) return json({ quests: [] });
      if (url.includes('skill-check')) return json({ hasSkillCheck: false, passed: true, targetId: '', targetName: '' });
      return json({});
    }),
  );
  const store = createGameStore();
  const data: PlayerData = { character: CHARACTER, progress: { ...PROGRESS, items: { 'hat-de-rung': 2 } }, quests: questList(0).quests };
  render(
    <MemoryRouter>
      <QuestLayer store={store} data={data} questId="forest-ch1" region="khu-rung-bi-mat" onResponse={() => undefined} onOverlayChange={() => undefined} onPlayQuest={onPlayQuest} />
    </MemoryRouter>,
  );
  const touch = (targetId: string, name: string) =>
    act(async () => {
      store.emit({ type: 'interaction-prompt', prompt: { targetId, kind: 'npc', name, label: 'Nói chuyện' } });
      store.emit({ type: 'interaction', targetId });
    });
  return { posts, touch };
}

describe('a character of the map', () => {
  it('shows its card with its line and hearts, counts the chat, and offers its story', async () => {
    const onPlayQuest = vi.fn();
    const { posts, touch } = setup(onPlayQuest);
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/npcs?region=khu-rung-bi-mat', expect.anything()));
    await act(async () => undefined);
    await touch('hoa-mi-rung', 'Họa Mi Rừng Xanh');
    expect(screen.getByText('Chào Mochi, nghe tớ hát không?')).toBeTruthy();
    expect(document.querySelector('[data-id="npc-card-hearts"]')?.getAttribute('data-hearts')).toBe('0');
    await vi.waitFor(() => expect(document.querySelector('[data-id="npc-card-raised"]')).toBeTruthy());
    expect(posts).toEqual(['/api/npcs/hoa-mi-rung/talk']);
    fireEvent.click(document.querySelector('[data-id="npc-card-story"]') as Element);
    expect(onPlayQuest).toHaveBeenCalledWith('quest-b', 'hoa-mi-rung');
  });

  it('gives a spare of something it likes, once a day', async () => {
    const { posts, touch } = setup();
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/npcs?region=khu-rung-bi-mat', expect.anything()));
    await act(async () => undefined);
    await touch('hoa-mi-rung', 'Họa Mi Rừng Xanh');
    fireEvent.click(document.querySelector('[data-id="npc-card-gift"]') as Element);
    await act(async () => {
      fireEvent.click(document.querySelector('[data-id="npc-gift-hat-de-rung"]') as Element);
    });
    await vi.waitFor(() => expect(document.querySelector('[data-id="npc-card-hearts"]')?.getAttribute('data-hearts')).toBe('1'));
    expect(posts.some((p) => p.startsWith('/api/npcs/hoa-mi-rung/gift') && p.includes('hat-de-rung'))).toBe(true);
    expect((document.querySelector('[data-id="npc-card-gift"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('leaves a character the map does not profile to the lesson', async () => {
    const { posts, touch } = setup();
    await act(async () => undefined);
    await touch('animal-beaver', 'Hải ly');
    expect(document.querySelector('[data-id="npc-card"]')).toBeNull();
    expect(posts).toEqual([]);
  });
});
