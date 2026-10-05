import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillCheckResult } from '@miu/schema/game';
import { GateOpenedBanner, SkillCheckModal, gateOpenedLine } from './skill-check-modal';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('knowledge gate panel', () => {
  const short: SkillCheckResult = {
    targetId: 'dba-ruong-vui-cat',
    targetName: 'Rương vùi trong cát',
    hasSkillCheck: true,
    passed: false,
    skill: 'so-sanh-so',
    skillName: 'So sánh số',
    currentLevel: 1,
    requiredLevel: 2,
    hintQuestId: 'toan2-cd1-b01',
    reward: { coin: 30, xp: 20 },
  };

  it('says what the gate asks for, her level and the treasure inside', () => {
    render(<SkillCheckModal check={short} name="Bông" onPractice={vi.fn()} onGoOn={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Cổng tri thức' })).toBeDefined();
    expect(screen.getByText(/Muốn mở Rương vùi trong cát, Bông cần kỹ năng/)).toBeDefined();
    expect(screen.getByText('Lv.2')).toBeDefined();
    expect(screen.getByText('Hiện tại: Lv.1')).toBeDefined();
    expect(document.querySelector('[data-id="skill-check-treasure"]')?.textContent).toContain('+30');
    expect(screen.getByText(/Bông luyện thêm So sánh số/)).toBeDefined();
  });

  it('leads to the practice quest, or goes on with the step', () => {
    const practice = vi.fn();
    const goOn = vi.fn();
    render(<SkillCheckModal check={short} name="Bông" onPractice={practice} onGoOn={goOn} />);
    fireEvent.click(screen.getByRole('button', { name: /Đến luyện tập So sánh số/ }));
    expect(practice).toHaveBeenCalledWith('toan2-cd1-b01');
    fireEvent.click(screen.getByRole('button', { name: 'Đi tiếp, để sau mở' }));
    expect(goOn).toHaveBeenCalledTimes(1);
  });

  it('offers no practice button without a practice quest', () => {
    render(<SkillCheckModal check={{ ...short, hintQuestId: undefined }} name="Bông" onPractice={vi.fn()} onGoOn={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Đến luyện tập/ })).toBeNull();
  });
});

describe('opened gate banner', () => {
  const gate = { targetId: 'dba-ruong-vui-cat', skill: 'so-sanh-so', level: 2, coin: 30, xp: 20 };

  it('never says the same line twice in a row, with the server treasure and her name', () => {
    const lines = Array.from({ length: 6 }, () => gateOpenedLine(gate, 'Bông').vi);
    for (let i = 1; i < lines.length; i += 1) expect(lines[i]).not.toBe(lines[i - 1]);
    for (const line of lines) expect(line).toMatch(/Bông.*\+30 Xu.*\+20 XP|\+30 Xu.*\+20 XP.*Bông/);
  });

  it('goes away by itself', () => {
    vi.useFakeTimers();
    const done = vi.fn();
    render(<GateOpenedBanner gates={[gate]} name="Bông" onDone={done} />);
    expect(screen.getByRole('status').textContent).toContain('+30');
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(done).toHaveBeenCalledTimes(1);
  });
});
