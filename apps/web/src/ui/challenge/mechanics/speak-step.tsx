// Nói và nghe: the book's speaking task with its "G:" prompts and pictures. The child records itself
// and listens back on this device (on by default; only the browser's microphone permission can stop
// it, and the sound never leaves the screen). Without a microphone the child tells a parent instead.
// Nothing is graded: "Mình nói xong rồi" finishes the step.
import { useRef } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import { speak, useLocalVoice } from '../../dialogue/speech';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { Modal } from '../../kit/modal';
import { Illustration } from '../illustrations/illustration';
import { useVoiceRecorder } from './use-voice-recorder';
import './mechanics.css';

type SpeakStep = Extract<QuestStepPublic, { kind: 'speak' }>;

export function SpeakStepScreen({
  step,
  fill,
  busy,
  onDone,
  onClose,
}: {
  step: SpeakStep;
  fill: (text: string) => string;
  busy: boolean;
  onDone: () => void;
  onClose: () => void;
}) {
  const voice = useLocalVoice();
  const recorder = useVoiceRecorder();
  const audio = useRef<HTMLAudioElement>(null);
  const prompt = fill(step.prompt);
  const canRecord = recorder.state !== 'unsupported' && recorder.state !== 'denied';
  return (
    <Modal title={fill(step.title)} onClose={onClose} dataId="speak-step" size="wide" variant="scene">
      <div className="scene-panel">
        <p className="challenge-prompt" data-id="speak-prompt">
          {prompt}
        </p>
        {step.pictureRefs?.length ? (
          <div className="speak-pictures">
            {step.pictureRefs.map((picture, i) => (
              <Illustration key={i} picture={picture} />
            ))}
          </div>
        ) : null}
        {step.hints.length > 0 ? (
          <ul className="speak-hints" data-id="speak-hints" aria-label="Gợi ý">
            {step.hints.map((hint, i) => (
              <li key={i}>{fill(hint)}</li>
            ))}
          </ul>
        ) : null}
        {canRecord ? (
          <div className="speak-recorder" data-id="speak-recorder">
            {recorder.state === 'recording' ? (
              <button type="button" className={buttonClass('secondary')} data-id="speak-stop" onClick={recorder.stop}>
                Dừng · còn {recorder.secondsLeft} giây
              </button>
            ) : (
              <button type="button" className={buttonClass('secondary')} data-id="speak-record" onClick={() => void recorder.start()}>
                <Icon name="speaker" size={24} />
                {recorder.state === 'recorded' ? 'Ghi lại' : 'Ghi âm giọng con'}
              </button>
            )}
            {recorder.url ? (
              <>
                <button type="button" className={buttonClass('ghost')} data-id="speak-playback" onClick={() => void audio.current?.play()}>
                  Nghe lại giọng con
                </button>
                <audio ref={audio} src={recorder.url} data-id="speak-audio" preload="auto" />
              </>
            ) : null}
            <p className="hint">Tiếng chỉ ở trên máy này, không gửi đi đâu.</p>
          </div>
        ) : (
          <p className="hint" data-id="speak-no-mic">
            Con hãy kể cho bố mẹ nghe nhé.
          </p>
        )}
        <div className="challenge-actions">
          {voice ? (
            <button type="button" className={buttonClass('ghost')} data-id="speak-listen" onClick={() => speak(prompt, voice)}>
              <Icon name="speaker" size={24} />
              Nghe câu hỏi
            </button>
          ) : null}
          <button type="button" className={buttonClass('primary')} data-id="speak-done" disabled={busy || recorder.state === 'recording'} onClick={onDone}>
            <Icon name="checkMark" size={28} />
            Mình nói xong rồi
          </button>
        </div>
      </div>
    </Modal>
  );
}
