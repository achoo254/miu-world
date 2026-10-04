import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillCheckResult } from '@miu/schema/game';
import { SkillCheckModal } from './skill-check-modal';

afterEach(() => {
  cleanup();
});

describe('SkillCheckModal', () => {
  const failedCheck: SkillCheckResult = {
    targetId: 'ruong-khoa',
    targetName: 'Rương Bí Mật Rừng Sâu',
    hasSkillCheck: true,
    passed: false,
    skill: 'doc-hieu',
    skillName: 'Đọc hiểu',
    currentLevel: 1,
    requiredLevel: 3,
    hintQuestId: 'forest-ch1',
  };

  it('renders target name, required level, and current level', () => {
    render(<SkillCheckModal check={failedCheck} onPractice={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getAllByText('Rương Bí Mật Rừng Sâu').length).toBeGreaterThan(0);
    expect(screen.getByText(/Để mở hoặc vượt qua/)).toBeDefined();
    expect(screen.getByText(/Cấp 1/)).toBeDefined();
    expect(screen.getByText(/Cấp 3/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Luyện tập ngay' })).toBeDefined();
  });

  it('triggers onPractice when clicking practice button', () => {
    const handlePractice = vi.fn();
    const handleClose = vi.fn();

    render(<SkillCheckModal check={failedCheck} onPractice={handlePractice} onClose={handleClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Luyện tập ngay' }));

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handlePractice).toHaveBeenCalledWith('forest-ch1');
  });

  it('hides practice button when no hintQuestId is provided', () => {
    const checkWithoutHint: SkillCheckResult = {
      ...failedCheck,
      hintQuestId: undefined,
    };

    render(<SkillCheckModal check={checkWithoutHint} onClose={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Luyện tập ngay' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Để sau' })).toBeDefined();
  });

  it('triggers onClose when clicking close button', () => {
    const handleClose = vi.fn();

    render(<SkillCheckModal check={failedCheck} onClose={handleClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Để sau' }));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
