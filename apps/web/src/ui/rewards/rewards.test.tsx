import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterDto, QuestCompletion } from '@miu/schema/game';
import { BackpackPanel } from '../backpack/backpack-panel';
import { lastSpeakerOf, presenterOf } from '../dialogue/npc-portrait';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList } from '../player/test-fixtures';
import { ProfileScreen } from '../profile/profile-screens';
import type { ActiveQuestView } from '../quest/quest-flow';
import { CompletionSequence, completionScreens, countUpValue } from './completion-sequence';

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [], pet: null };
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
/** Reduced motion: the counters show their final number at once. */
const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }));
const rowText = (id: string) => document.querySelector(`[data-id="${id}"] .visually-hidden`)?.textContent;
const completion = (over: Partial<QuestCompletion> = {}): QuestCompletion => ({
  stars: 3,
  xpAwarded: 100,
  levelBefore: 1,
  levelAfter: 2,
  skillLevels: [{ skillId: 'phep-cong', levelBefore: 1, levelAfter: 1 }],
  ...over,
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('completion screens', () => {
  it('shows Level Up only when the level went up; nothing is ever unlocked', () => {
    expect(completionScreens(completion())).toEqual(['reward', 'level']);
    expect(completionScreens(completion({ levelAfter: 1 }))).toEqual(['reward']);
  });

  it('shows the server\'s numbers, then Level Up, each skippable with one tap', () => {
    const onMap = vi.fn();
    render(<CompletionSequence completion={completion({ stars: 2 })} reward={REWARD} quest={QUEST} data={DATA} onMap={onMap} onExplore={() => undefined} />);
    expect(document.querySelector('[data-id="reward-stars"]')?.getAttribute('data-stars')).toBe('2');
    expect(rowText('reward-xp')).toBe('+100 XP');
    expect(rowText('reward-coin')).toBe('+20 Xu');
    expect(screen.getByText(/Lá thần ×1/)).toBeTruthy();
    expect(screen.getByText(/Phép cộng \+2/)).toBeTruthy();
    expect(document.querySelector('[data-id="reward-encourage"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(screen.getByText('Lv.1 → Lv.2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Về bản đồ/ }));
    expect(onMap).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toMatch(/phạt|Kim cương/i);
  });

  it('after seeing an answer: 90 XP with a kind word, and no Level Up', () => {
    render(<CompletionSequence completion={completion({ xpAwarded: 90, levelAfter: 1 })} reward={REWARD} quest={QUEST} data={DATA} onMap={() => undefined} onExplore={() => undefined} />);
    expect(rowText('reward-xp')).toBe('+90 XP');
    expect(screen.getByText(/Mochi tự giải hết để nhận trọn 100 XP/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tiếp' })).toBeNull();
    expect(screen.getByRole('button', { name: /Tiếp tục khám phá/ })).toBeTruthy();
  });
});

describe('the reward moment unfolds in order', () => {
  it('counts up from zero, easing out, and lands exactly on the server\'s number', () => {
    expect(countUpValue(100, 0, 900)).toBe(0);
    expect(countUpValue(100, 450, 900)).toBeGreaterThan(50);
    expect(countUpValue(100, 450, 900)).toBeLessThan(100);
    expect(countUpValue(100, 900, 900)).toBe(100);
    expect(countUpValue(7, 5_000, 900)).toBe(7);
  });

  it('starts the counters at zero on screen while screen readers get the final number', () => {
    render(<CompletionSequence completion={completion()} reward={REWARD} quest={QUEST} data={DATA} onMap={() => undefined} onExplore={() => undefined} />);
    expect(document.querySelector('[data-id="reward-xp"] [aria-hidden="true"]')?.textContent).toBe('+0 XP');
    expect(rowText('reward-xp')).toBe('+100 XP');
  });

  it('shows the final numbers at once under reduced motion', () => {
    reduceMotion();
    render(<CompletionSequence completion={completion()} reward={REWARD} quest={QUEST} data={DATA} onMap={() => undefined} onExplore={() => undefined} />);
    expect(document.querySelector('[data-id="reward-xp"] [aria-hidden="true"]')?.textContent).toBe('+100 XP');
    expect(document.querySelector('[data-id="reward-coin"] [aria-hidden="true"]')?.textContent).toBe('+20 Xu');
  });

  it('picks the last character who spoke in the quest to cheer, as a challenge picks who asks it', () => {
    expect(lastSpeakerOf(QUEST.steps)).toEqual({ name: 'Vẹt', target: 'parrot-guide' });
    expect(presenterOf(QUEST.steps, 'find-clues')).toEqual({ name: 'Vẹt', target: 'parrot-guide' });
    expect(presenterOf(QUEST.steps, 'meet-parrot')).toBeNull();
    expect(lastSpeakerOf([])).toBeNull();
  });

  it('lets the child\'s character cheer, and leaves out rewards worth nothing', () => {
    reduceMotion();
    const nothing = { xp: 0, coin: 0, skillXp: { 'phep-cong': 0 }, items: { 'la-than': 0 } };
    render(<CompletionSequence completion={completion({ xpAwarded: 0, levelAfter: 1 })} reward={nothing} quest={QUEST} data={DATA} onMap={() => undefined} onExplore={() => undefined} />);
    expect(document.querySelector('[data-id="reward-cheer"] .miu-portrait')).toBeTruthy();
    for (const id of ['reward-xp', 'reward-coin', 'reward-item-la-than', 'reward-skill-phep-cong']) expect(document.querySelector(`[data-id="${id}"]`), id).toBeNull();
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
