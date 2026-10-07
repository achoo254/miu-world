// A lesson for the party quest's tests: a shared talk, a question each member answers, another talk, a team boss of
// two turns, and the ending each member plays herself.
import { QuestDefinition, type ActiveQuest } from '@miu/schema/content';

/** A boss question's three support layers, its answer layer naming the right choice. */
const support = (answer: string) => ({
  guide: ['Đọc câu hỏi.'],
  hint: 'Đếm lại.',
  answer: { text: answer, explanation: `Đáp án là ${answer}.` },
  en: { guide: ['Read the question.'], hint: 'Count again.', answer: { text: answer, explanation: `The answer is ${answer}.` } },
});

/** A lesson with every kind of step a party meets: a shared talk, a question each answers, another talk, a boss, the end. */
export const PARTY_QUEST = QuestDefinition.parse({
  id: 'party-test',
  region: 'khu-rung-bi-mat',
  chapter: 1,
  title: 'Cả đội',
  summary: 'Cả đội cùng chơi.',
  status: 'active',
  review: 'teacher-pending',
  sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', next: 'g' },
  phases: { hook: 'gap', explore: 'gap', learn: 'do', challenge: 'do', decision: 'sau', finale: 'trum', reward: 'thuong', next: 'tiep' },
  steps: [
    { id: 'gap', title: 'Gặp', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Chào cả đội!' }] },
    {
      id: 'do',
      title: 'Đố',
      kind: 'riddle',
      target: 'riddle-tree',
      question: 'Ba cộng bốn bằng mấy?',
      skill: 'phep-cong',
      answer: { value: 7 },
      support: { guide: ['Đếm'], hint: 'Cộng', answer: { text: '7', explanation: '3 + 4 = 7' } },
    },
    { id: 'sau', title: 'Sau', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Giỏi!' }] },
    {
      id: 'trum',
      title: 'Trùm',
      kind: 'boss',
      target: 'parrot-guide',
      bossId: 'trum-thu',
      bossName: 'Trùm',
      introDialogue: 'Tới đây!',
      winDialogue: 'Thua rồi!',
      maxHp: 200,
      damagePerTurn: 100,
      turns: [
        { id: 't1', prompt: 'Một?', skill: 'phep-cong', move: 'fling', damage: 100, choices: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }], answer: { choice: 'a' }, support: support('1') },
        { id: 't2', prompt: 'Hai?', skill: 'phep-cong', move: 'orbs', damage: 100, choices: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }], answer: { choice: 'b' }, support: support('2') },
      ],
    },
    { id: 'thuong', title: 'Thưởng', kind: 'reward', trigger: 'auto', text: 'Thưởng.' },
    { id: 'tiep', title: 'Tiếp', kind: 'next', trigger: 'auto', text: 'Tiếp.' },
  ],
  reward: { xp: 30, coin: 10 },
}) as ActiveQuest;
