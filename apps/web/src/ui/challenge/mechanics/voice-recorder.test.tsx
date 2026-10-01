import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestDefinition, type QuestStepPublic } from '@miu/schema/content';
import { QuestView, type CharacterDto, type StepCompleteRequest, type StepCompleteResponse } from '@miu/schema/game';
import type { PlayerData } from '../../player/player-data';
import { PROGRESS } from '../../player/test-fixtures';
import type { ActiveQuestView } from '../../quest/quest-flow';
import questSgk from '../../../../../server/test/fixtures/quests/quest-sgk.json';
import { LearningStep } from '../learning-step';
import { pickMimeType } from './use-voice-recorder';

const view = QuestView.parse(QuestDefinition.parse(questSgk));
if (view.status !== 'active') throw new Error('quest-sgk is active');
const quest = view as ActiveQuestView;
const talk = quest.steps.find((s) => s.id === 'talk') as QuestStepPublic;
const DATA: PlayerData = { character: { species: 'cat', name: 'Mochi', equipped: [], pet: null } as CharacterDto, progress: PROGRESS, quests: [] };
const done: StepCompleteResponse = {
  correct: true,
  feedback: null,
  quest: { questId: 'quest-sgk', completedSteps: [], completed: false, found: {}, stars: null },
  reward: null,
  repeated: false,
  completion: null,
  progress: PROGRESS,
};

/** Minimal MediaRecorder: records until stopped, then hands one chunk over. */
class FakeRecorder {
  static isTypeSupported = (type: string) => type === 'audio/webm;codecs=opus';
  state: 'inactive' | 'recording' = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_stream: unknown, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? '';
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };
const getUserMedia = vi.fn(async () => ({ getTracks: () => [track] }));
const createObjectURL = vi.fn(() => 'blob:recording-1');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  track.stop.mockClear();
  getUserMedia.mockClear();
  revokeObjectURL.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderTalk() {
  const submit = vi.fn(async (_s: QuestStepPublic, _b: StepCompleteRequest) => done);
  const view = render(<LearningStep step={talk} quest={quest} data={DATA} busy={false} submit={submit} onClose={() => undefined} />);
  return { submit, view };
}
const byId = (id: string) => document.querySelector(`[data-id="${id}"]`);

describe('speaking step recorder', () => {
  it('records on the device, plays back, and drops everything when the step closes', async () => {
    const { submit, view } = renderTalk();
    await act(async () => {
      fireEvent.click(byId('speak-record') as Element);
    });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(byId('speak-stop')?.textContent).toMatch(/còn 60 giây/);
    expect((byId('speak-done') as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      fireEvent.click(byId('speak-stop') as Element);
    });
    expect(track.stop).toHaveBeenCalled();
    expect(byId('speak-audio')?.getAttribute('src')).toBe('blob:recording-1');
    expect(byId('speak-record')?.textContent).toMatch(/Ghi lại/);
    fireEvent.click(byId('speak-done') as Element);
    expect(submit.mock.calls.at(-1)?.[1]).toEqual({});
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:recording-1');
  });

  it('stops the microphone when the step closes mid-recording', async () => {
    const { view } = renderTalk();
    await act(async () => {
      fireEvent.click(byId('speak-record') as Element);
    });
    view.unmount();
    expect(track.stop).toHaveBeenCalled();
  });

  it('still finishes when the microphone is refused, asking the child to tell a parent', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { submit } = renderTalk();
    await act(async () => {
      fireEvent.click(byId('speak-record') as Element);
    });
    expect(screen.getByText('Con hãy kể cho bố mẹ nghe nhé.')).toBeTruthy();
    fireEvent.click(byId('speak-done') as Element);
    expect(submit.mock.calls.at(-1)?.[1]).toEqual({});
  });

  it('offers no recorder where the browser cannot record', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    renderTalk();
    expect(byId('speak-record')).toBeNull();
    expect(byId('speak-no-mic')).toBeTruthy();
  });

  it('picks webm/opus where supported, mp4 on Safari', () => {
    expect(pickMimeType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMimeType(() => false)).toBeUndefined();
  });
});
