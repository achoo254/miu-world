import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QuestStepPublic } from '@miu/schema/content';
import type { ChallengeContext } from '../challenge-frame';
import { BossScreen } from './boss-screen';
import { setLangMode } from '../../i18n/i18n';

const bossStep: Extract<QuestStepPublic, { kind: 'boss' }> = {
  id: 'boss-forest',
  title: 'Trùm Vui Rừng Xanh',
  goTo: 'Gặp Trùm Vui',
  trigger: 'auto',
  kind: 'boss',
  bossId: 'golem-tree',
  bossName: 'Người Cây Rừng Già',
  introDialogue: 'Muốn qua đây, bé hãy giải đố với ta!',
  winDialogue: 'Bé thông minh quá, khu rừng mở lối cho bé!',
  maxHp: 240,
  damagePerTurn: 80,
  turns: [
    {
      id: 'turn-1',
      prompt: 'Con mèo kêu như thế nào?',
      skill: 'tieng-viet',
      choices: [
        { id: 'meo', text: 'Meo meo' },
        { id: 'gau', text: 'Gâu gâu' },
      ],
      damage: 80,
    },
    {
      id: 'turn-2',
      prompt: '10 cộng 10 bằng mấy?',
      skill: 'toan',
      choices: [
        { id: 'c20', text: '20' },
        { id: 'c30', text: '30' },
      ],
      damage: 80,
    },
  ],
};

const context: ChallengeContext = {
  questId: 'quest-forest',
  stepId: 'boss-forest',
  title: { vi: 'Trùm Vui Rừng Xanh', en: 'Trùm Vui Rừng Xanh' },
  position: { index: 1, total: 1 },
  xp: 100,
  fill: (t) => t,
  say: (vi, en) => ({ vi, en: en ?? vi }),
  busy: false,
  tryAgain: null,
  wrongTries: 0,
  onClose: () => undefined,
};

afterEach(cleanup);

describe('BossScreen', () => {
  it('renders boss health bar, intro dialogue, and turn 1 question', () => {
    const onAnswer = vi.fn();
    render(<BossScreen step={bossStep} context={context} onAnswer={onAnswer} onClose={() => undefined} />);

    expect(screen.getByText('Người Cây Rừng Già')).not.toBeNull();
    expect(screen.getByText('240 / 240 HP')).not.toBeNull();
    expect(screen.getByText('Muốn qua đây, bé hãy giải đố với ta!')).not.toBeNull();
    expect(screen.getByText('Con mèo kêu như thế nào?')).not.toBeNull();
  });

  it('allows selecting choice and submitting boss attack turn answer', () => {
    const onAnswer = vi.fn();
    render(<BossScreen step={bossStep} context={context} onAnswer={onAnswer} onClose={() => undefined} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Meo meo' }));
    fireEvent.click(screen.getByRole('button', { name: /Giải đố/ }));

    expect(onAnswer).toHaveBeenCalledWith({ turnId: 'turn-1', choice: 'meo' });
  });

  it('renders victory screen when boss is defeated (0 HP)', () => {
    const onAnswer = vi.fn();
    render(
      <BossScreen
        step={bossStep}
        context={context}
        bossState={{ hp: 0, answered: ['turn-1', 'turn-2', 'turn-3'] }}
        onAnswer={onAnswer}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText('0 / 240 HP')).not.toBeNull();
    expect(screen.getByText('Đã vượt qua thử thách trùm vui!')).not.toBeNull();
    expect(screen.getAllByText('Bé thông minh quá, khu rừng mở lối cho bé!').length).toBeGreaterThan(0);
  });

  it("says the server's line after a blow or a miss, and the HP left when it has none", () => {
    const state = { hp: 160, answered: ['turn-1'] };
    const { rerender } = render(<BossScreen step={bossStep} context={context} bossState={state} line={{ vi: 'Úi, trúng rồi!', en: 'Ouch, a hit!' }} onAnswer={() => undefined} onClose={() => undefined} />);
    expect(screen.getByText('Úi, trúng rồi!')).not.toBeNull();
    rerender(<BossScreen step={bossStep} context={context} bossState={state} onAnswer={() => undefined} onClose={() => undefined} />);
    expect(screen.getByText('Cố lên nào! Ta vẫn còn 160 HP đấy!')).not.toBeNull();
  });

  it('speaks English when the boss has its twins: its name, its lines, the question and the choices', () => {
    setLangMode('en', false);
    try {
      const step = {
        ...bossStep,
        en: { title: 'Forest fight', bossName: 'Old Tree Golem', introDialogue: 'Solve my riddles!', winDialogue: 'Clever you!' },
        turns: bossStep.turns.map((t, i) => (i === 0 ? { ...t, en: { prompt: 'What does a cat say?', choices: ['Meow', 'Woof'] } } : t)),
      };
      render(<BossScreen step={step} context={context} onAnswer={() => undefined} onClose={() => undefined} />);
      expect(screen.getByText('Old Tree Golem')).not.toBeNull();
      expect(screen.getByText('Solve my riddles!')).not.toBeNull();
      expect(screen.getByText('What does a cat say?')).not.toBeNull();
      expect(screen.getByRole('radio', { name: 'Meow' })).not.toBeNull();
      expect(screen.getByRole('button', { name: /Answer \(-80 HP\)/ })).not.toBeNull();
    } finally {
      setLangMode('vi', false);
    }
  });
});
