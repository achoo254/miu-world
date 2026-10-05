// Co-op challenges for the server's tests, one per kind of play, built through the content schema (so they obey every
// rule a shipped challenge does). Not in the fixture quest folder: the quest lists of other tests stay as they are.
import { QuestDefinition, type ActiveQuest, type CoopMode } from '@miu/schema/content';

const feedback = {
  right: ['Đúng rồi, cả đội giỏi quá!', 'Chuẩn luôn, đi tiếp nào!', 'Tuyệt, thêm một bước nữa!'],
  wrong: ['Chưa đúng, thử lại nhé!', 'Gần rồi, nghĩ thêm chút!', 'Không sao, cùng nghĩ lại!'],
  en: {
    right: ['Right, what a team!', 'Spot on, let us go on!', 'Great, one more step!'],
    wrong: ['Not yet, try again!', 'Close, think a bit more!', 'No worries, think again together!'],
  },
};

const task = (id: string, prompt: string, right: string, damage?: number) => ({
  id,
  prompt,
  skill: 'cong-tru-pham-vi-100',
  choices: [
    { id: 'a', text: right },
    { id: 'b', text: `${right} và một` },
  ],
  answer: { choice: 'a' },
  hint: `Gợi ý cho ${id}`,
  explain: `Giải thích cho ${id}`,
  ...(damage ? { damage } : {}),
  en: { prompt: `${prompt} (en)`, choices: [`${right} (en)`, `${right} and one (en)`], hint: `Hint for ${id}`, explain: `Why for ${id}` },
});

function coopStep(mode: CoopMode): Record<string, unknown> {
  const base = {
    id: 'cung-choi',
    title: 'Cùng chơi',
    kind: 'coop',
    trigger: 'auto',
    prompt: 'Cả đội cùng làm nhé.',
    guide: ['Mỗi bạn làm phần của mình.'],
    seats: 3,
    feedback,
    en: { title: 'Play together', prompt: 'The team plays together.', guide: ['Each friend does a part.'] },
  };
  if (mode === 'pieces') {
    return {
      ...base,
      mode,
      rounds: [
        { id: 'r1', pieces: ['Mảnh một', 'Mảnh hai', 'Mảnh ba'], task: task('t1', 'Câu một?', 'Một'), en: { pieces: ['Piece one', 'Piece two', 'Piece three'] } },
        { id: 'r2', pieces: ['Mảnh bốn', 'Mảnh năm'], task: task('t2', 'Câu hai?', 'Hai'), en: { pieces: ['Piece four', 'Piece five'] } },
      ],
    };
  }
  if (mode === 'together') {
    return {
      ...base,
      mode,
      rounds: [
        { id: 'r1', title: 'Kéo nhịp một', tasks: [task('t1', 'Câu một?', 'Một'), task('t2', 'Câu hai?', 'Hai')], en: { title: 'Pull span one' } },
        { id: 'r2', title: 'Kéo nhịp hai', tasks: [task('t3', 'Câu ba?', 'Ba')], en: { title: 'Pull span two' } },
      ],
    };
  }
  return {
    ...base,
    mode,
    boss: { name: 'Trùm Thử', maxHp: 300, intro: 'Trùm tới!', win: 'Trùm chịu thua!', en: { name: 'Test Boss', intro: 'Here it comes!', win: 'It gives up!' } },
    turns: [task('t1', 'Đòn một?', 'Một', 100), task('t2', 'Đòn hai?', 'Hai', 100), task('t3', 'Đòn ba?', 'Ba', 100), task('t4', 'Đòn bốn?', 'Bốn', 100)],
  };
}

/** A co-op challenge of `mode` (id `with-test-<mode>`), hosted by the target `chu-tro`. */
export function coopQuest(mode: CoopMode): ActiveQuest {
  const id = `with-test-${mode}`;
  const quest = QuestDefinition.parse({
    id,
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: `Thử thách ${mode}`,
    summary: 'Cả đội cùng làm.',
    category: 'coop',
    status: 'active',
    review: 'teacher-pending',
    sevenQuestions: { who: 'Đội', where: 'Rừng', goal: 'Thắng', play: 'Cùng chơi', learn: 'Cộng', reward: 'Xu', next: 'Về rừng' },
    phases: { hook: 'gap', explore: 'gap', learn: 'gap', challenge: 'cung-choi', decision: 'cung-choi', finale: 'ket', reward: 'thuong', next: 'tiep' },
    steps: [
      { id: 'gap', title: 'Gặp chủ trò', kind: 'dialogue', target: 'chu-tro', trigger: 'interact', lines: [{ speaker: 'Chủ trò', text: 'Cùng chơi nhé {name}!' }], en: { title: 'Meet the host', lines: ['Play together, {name}!'] } },
      coopStep(mode),
      { id: 'ket', title: 'Xong', kind: 'dialogue', trigger: 'auto', lines: [{ speaker: 'Chủ trò', text: 'Giỏi lắm!' }], en: { title: 'Done', lines: ['Well done!'] } },
      { id: 'thuong', title: 'Thưởng', kind: 'reward', trigger: 'auto', text: 'Nhận thưởng.', en: { title: 'Reward', text: 'Your reward.' } },
      { id: 'tiep', title: 'Tiếp', kind: 'next', trigger: 'auto', text: 'Đi tiếp.', en: { title: 'Next', text: 'Go on.' } },
    ],
    reward: { xp: 40, coin: 15, skillXp: { 'cong-tru-pham-vi-100': 10 }, items: {} },
    en: { title: `Challenge ${mode}`, summary: 'The team plays together.' },
  });
  if (quest.status !== 'active') throw new Error('fixture must be active');
  return quest;
}
