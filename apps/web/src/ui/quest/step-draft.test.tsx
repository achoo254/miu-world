import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StepDraftScope, clearDraft, isStringList, readDraft, updateDraft, useDraftState } from './step-draft';

const OWNER = 'child-1';
const QUEST = 'forest-ch1';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function Picker() {
  const [picked, setPicked] = useDraftState<string[]>('picked', [], isStringList);
  return (
    <button type="button" onClick={() => setPicked((p) => [...p, `x${p.length}`])}>
      {picked.join(',') || 'none'}
    </button>
  );
}

describe('step drafts', () => {
  it('keep what a step screen did, and give it back to the same step after a remount (a reload)', () => {
    const first = render(
      <StepDraftScope owner={OWNER} quest={QUEST} step="apples">
        <Picker />
      </StepDraftScope>,
    );
    act(() => screen.getByRole('button').click());
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('button').textContent).toBe('x0,x1');
    first.unmount();

    render(
      <StepDraftScope owner={OWNER} quest={QUEST} step="apples">
        <Picker />
      </StepDraftScope>,
    );
    expect(screen.getByRole('button').textContent).toBe('x0,x1');
  });

  it('start afresh on another step, without an owner, or once the step is done', () => {
    updateDraft(OWNER, QUEST, 'apples', (d) => ({ ...d, open: true, fields: { picked: ['a'] } }));
    expect(readDraft(OWNER, QUEST, 'apples')?.open).toBe(true);
    expect(readDraft(OWNER, QUEST, 'riddle')).toBeNull();
    expect(readDraft('child-2', QUEST, 'apples')).toBeNull();

    const other = render(
      <StepDraftScope owner={null} quest={QUEST} step="apples">
        <Picker />
      </StepDraftScope>,
    );
    expect(screen.getByRole('button').textContent).toBe('none');
    other.unmount();

    clearDraft(OWNER, QUEST);
    expect(readDraft(OWNER, QUEST, 'apples')).toBeNull();
  });

  it('forget a draft after two weeks and ignore one a newer build shaped differently', () => {
    const now = Date.now();
    updateDraft(OWNER, QUEST, 'apples', (d) => ({ ...d, fields: { picked: 'not a list' } }), now - 15 * 24 * 60 * 60 * 1000);
    expect(readDraft(OWNER, QUEST, 'apples', now)).toBeNull();

    updateDraft(OWNER, QUEST, 'apples', (d) => ({ ...d, fields: { picked: 'not a list' } }));
    render(
      <StepDraftScope owner={OWNER} quest={QUEST} step="apples">
        <Picker />
      </StepDraftScope>,
    );
    expect(screen.getByRole('button').textContent).toBe('none');
  });
});
