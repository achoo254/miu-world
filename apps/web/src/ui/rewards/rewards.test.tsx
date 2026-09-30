import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterDto, QuestCompletion } from '@miu/schema/game';
import { BackpackPanel } from '../backpack/backpack-panel';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList } from '../player/test-fixtures';
import { ProfileScreen } from '../profile/profile-screens';
import type { ActiveQuestView } from '../quest/quest-flow';
import { CompletionSequence, completionScreens } from './completion-sequence';

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [] };
const QUEST = questList(2).quests[0]?.quest as ActiveQuestView;
const DATA: PlayerData = {
  character: CHARACTER,
  progress: {
    ...PROGRESS,
    items: { 'la-than': 1 },
    subjects: [{ subjectId: 'toan', name: 'Toán', xp: 4, level: 1, skills: [{ skillId: 'phep-cong', name: 'Phép cộng', xp: 2, level: 1 }] }],
  },
  quests: questList(2).quests,
};
const REWARD = { xp: 100, coin: 20, skillXp: { 'phep-cong': 2 }, items: { 'la-than': 1 } };
const completion = (over: Partial<QuestCompletion> = {}): QuestCompletion => ({
  stars: 3,
  xpAwarded: 100,
  levelBefore: 1,
  levelAfter: 2,
  unlocked: ['forest-ch2'],
  skillLevels: [{ skillId: 'phep-cong', levelBefore: 1, levelAfter: 1 }],
  ...over,
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('completion screens', () => {
  it('shows Level Up only when the level went up, Unlock only when something opened, and at most three screens', () => {
    expect(completionScreens(completion())).toEqual(['reward', 'level', 'unlock']);
    expect(completionScreens(completion({ xpAwarded: 90, levelAfter: 1 }))).toEqual(['reward', 'unlock']);
    expect(completionScreens(completion({ levelAfter: 1, unlocked: [] }))).toEqual(['reward']);
  });

  it('shows the server\'s numbers, then Level Up and the unlocked chapter, each skippable with one tap', () => {
    const onMap = vi.fn();
    render(<CompletionSequence completion={completion({ stars: 2 })} reward={REWARD} quest={QUEST} data={DATA} onMap={onMap} onExplore={() => undefined} />);
    expect(document.querySelector('[data-id="reward-stars"]')?.getAttribute('data-stars')).toBe('2');
    expect(screen.getByText(/\+100 XP/)).toBeTruthy();
    expect(screen.getByText(/\+20 Xu/)).toBeTruthy();
    expect(screen.getByText(/Lá thần ×1/)).toBeTruthy();
    expect(screen.getByText(/Phép cộng \+2/)).toBeTruthy();
    expect(document.querySelector('[data-id="reward-encourage"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(screen.getByText('Lv.1 → Lv.2')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); // one tap (or Esc) skips on
    expect(document.querySelector('[data-id="unlock-forest-ch2"]')?.textContent).toContain('Sắp có');
    fireEvent.click(screen.getByRole('button', { name: /Về bản đồ/ }));
    expect(onMap).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toMatch(/phạt|Kim cương/i);
  });

  it('after seeing an answer: 90 XP with a kind word, and no Level Up', () => {
    render(<CompletionSequence completion={completion({ xpAwarded: 90, levelAfter: 1, unlocked: [] })} reward={REWARD} quest={QUEST} data={DATA} onMap={() => undefined} onExplore={() => undefined} />);
    expect(screen.getByText(/\+90 XP/)).toBeTruthy();
    expect(screen.getByText(/Mochi tự giải hết để nhận trọn 100 XP/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tiếp' })).toBeNull();
    expect(screen.getByRole('button', { name: /Tiếp tục khám phá/ })).toBeTruthy();
  });
});

describe('backpack and profile', () => {
  it('lists what the server says the child owns, by tab, with the item details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ items: [{ itemId: 'la-than', qty: 1 }] }), { status: 200 })));
    render(<BackpackPanel data={DATA} />);
    fireEvent.click(await screen.findByRole('button', { name: /Lá thần/ }));
    expect(screen.getByText(/Chiếc lá biết phát sáng/)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Vật phẩm' }));
    expect(screen.queryByRole('button', { name: /Lá thần/ })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Nhiệm vụ' }));
    expect(screen.getByRole('button', { name: /Lá thần/ })).toBeTruthy();
  });

  it('shows skills by subject and the collection, owned items lit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body = url === '/api/character' ? CHARACTER : url === '/api/progress' ? DATA.progress : { quests: DATA.quests };
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );
    render(
      <MemoryRouter>
        <ProfileScreen />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Kỹ năng của Mochi')).toBeTruthy();
    expect(screen.getByText('Toán · Lv.1')).toBeTruthy();
    expect(document.querySelector('[data-id="collection-la-than"]')?.getAttribute('data-owned')).toBe('true');
    expect(screen.getAllByText('Sắp có')).toHaveLength(2);
  });
});
