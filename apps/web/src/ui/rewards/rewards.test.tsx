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
  it('shows Level Up and Skill Up when levels increase', () => {
    expect(completionScreens(completion())).toEqual(['reward', 'level']);
    expect(completionScreens(completion({ levelAfter: 1 }))).toEqual(['reward']);
    // Skill up only
    expect(
      completionScreens(
        completion({
          levelAfter: 1,
          skillLevels: [{ skillId: 'phep-cong', levelBefore: 1, levelAfter: 2 }],
        }),
      ),
    ).toEqual(['reward', 'skill']);
    // Both level up and skill up
    expect(
      completionScreens(
        completion({
          levelAfter: 2,
          skillLevels: [{ skillId: 'phep-cong', levelBefore: 1, levelAfter: 2 }],
        }),
      ),
    ).toEqual(['reward', 'level', 'skill']);
    // Answers to copy come first: once she has played, she writes them into her vở.
    expect(completionScreens(completion({ levelAfter: 1 }), 3)).toEqual(['notebook', 'reward']);
  });

  it('shows Skill Up screen with skill name and level transition', () => {
    const onMap = vi.fn();
    render(
      <CompletionSequence
        completion={completion({
          levelAfter: 1, // no character level up
          skillLevels: [{ skillId: 'phep-cong', levelBefore: 1, levelAfter: 2 }],
        })}
        reward={REWARD}
        quest={QUEST}
        data={DATA}
        onMap={onMap}
        onExplore={() => undefined}
      />,
    );
    // On reward screen
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    // On skill up screen
    expect(document.querySelector('[data-id="skill-up"]')).toBeTruthy();
    expect(document.querySelector('[data-id="skill-up-phep-cong"]')).toBeTruthy();
    expect(screen.getByText('Phép cộng')).toBeTruthy();
    expect(screen.getByText('Lv.1 → Lv.2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Về bản đồ/ }));
    expect(onMap).toHaveBeenCalledTimes(1);
  });

  it('shows the skill level gifts on the Skill Up screen, even without a level-up in this run', () => {
    const gifts = [
      { skillId: 'phep-cong', level: 2, coin: 10, item: null },
      { skillId: 'phep-cong', level: 3, coin: 15, item: { id: 'glasses-ky-nang-doc-sach', name: 'Kính đọc sách', slot: 'glasses' } },
    ];
    const done = completion({ levelAfter: 1, skillLevels: [{ skillId: 'phep-cong', levelBefore: 3, levelAfter: 3 }], skillGifts: gifts });
    expect(completionScreens(done)).toEqual(['reward', 'skill']);
    render(<CompletionSequence completion={done} reward={REWARD} quest={QUEST} data={DATA} onMap={() => undefined} onExplore={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(document.querySelector('[data-id="skill-gift-phep-cong-2"]')?.textContent).toContain('+10');
    const third = document.querySelector('[data-id="skill-gift-phep-cong-3"]');
    expect(third?.textContent).toContain('Quà Lv.3');
    expect(third?.querySelector('[data-id="skill-gift-item-glasses-ky-nang-doc-sach"]')?.textContent).toContain('Kính đọc sách');
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

  it('shows the skill tree by subject, the collection with owned items lit, and the way to the journey and achievements', async () => {
    const gifts = (skillId: string) =>
      Array.from({ length: 9 }, (_, i) => ({ skillId, level: i + 2, coin: 10, item: i === 1 ? { id: 'glasses-ky-nang-doc-sach', name: 'Kính đọc sách', slot: 'glasses' } : null, received: i === 0 }));
    const tree = {
      subjects: [
        { subjectId: 'toan', name: 'Toán', xp: 3, level: 2, skills: [{ skillId: 'phep-cong', name: 'Phép cộng', xp: 3, level: 2, maxLevel: 10, xpIntoLevel: 1, xpForNextLevel: 3, gifts: gifts('phep-cong') }] },
        { subjectId: 'tieng-viet', name: 'Tiếng Việt', xp: 0, level: 1, skills: [{ skillId: 'doc-hieu', name: 'Đọc hiểu', xp: 0, level: 1, maxLevel: 10, xpIntoLevel: 0, xpForNextLevel: 2, gifts: gifts('doc-hieu') }] },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body = url === '/api/character' ? CHARACTER : url === '/api/progress' ? DATA.progress : url === '/api/skill-tree' ? tree : { quests: DATA.quests };
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );
    render(
      <MemoryRouter>
        <ProfileScreen />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Cây kỹ năng của Mochi')).toBeTruthy();
    expect(await screen.findByRole('tab', { name: 'Toán · Lv.2' })).toBeTruthy();
    const row = document.querySelector('[data-id="skill-tree-phep-cong"]');
    expect(row?.getAttribute('data-level')).toBe('2');
    expect(screen.getByRole('img', { name: '2 trên 10 lá đã sáng' })).toBeTruthy();
    expect(row?.textContent).toContain('Còn 2 điểm kỹ năng tới Lv.3');
    expect(document.querySelector('[data-id="skill-tree-gift-phep-cong"]')?.querySelector('img[alt="Kính đọc sách"]')).toBeTruthy();
    expect(document.querySelector('[data-id="skill-tree-received-phep-cong"]')?.textContent).toBe('Đã nhận 1 món quà');
    fireEvent.click(screen.getByRole('tab', { name: 'Tiếng Việt · Lv.1' }));
    expect(document.querySelector('[data-id="skill-tree-doc-hieu"]')).toBeTruthy();
    expect(document.querySelector('[data-id="collection-la-than"]')?.getAttribute('data-owned')).toBe('true');
    expect(document.querySelector('[data-id="profile-journey"]')?.getAttribute('href')).toBe('/journey');
    expect(document.querySelector('[data-id="profile-achievements"]')?.getAttribute('href')).toBe('/achievements');
  });

  it('shows earned region chest titles in a dedicated panel', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/character') return new Response(JSON.stringify(CHARACTER), { status: 200 });
        if (url === '/api/progress') return new Response(JSON.stringify(DATA.progress), { status: 200 });
        if (url === '/api/region-rewards') return new Response(JSON.stringify({ regions: [], titles: ['Nhà thám hiểm rừng xanh', 'Bạn thân của dòng sông'] }), { status: 200 });
        return new Response(JSON.stringify({ quests: DATA.quests }), { status: 200 });
      }),
    );
    render(
      <MemoryRouter>
        <ProfileScreen />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Danh hiệu')).toBeTruthy();
    expect(screen.getByText('Nhà thám hiểm rừng xanh')).toBeTruthy();
    expect(screen.getByText('Bạn thân của dòng sông')).toBeTruthy();
  });
});

