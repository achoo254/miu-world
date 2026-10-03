// Nói và nghe: the book's speaking task with its "G:" prompts and pictures. The child records itself
// and listens back on this device (on by default; only the browser's microphone permission can stop
// it, and the sound never leaves the screen). Without a microphone the child tells a parent instead.
// Nothing is graded: "Mình nói xong rồi" finishes the step. The book's prompt and hints stay its Vietnamese
// (read aloud in Vietnamese); the screen's own words follow the display mode.
import { useRef } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import { ListenButton } from '../../dialogue/listen-button';
import { T, useT } from '../../i18n/use-t';
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
  const { t } = useT();
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
          <ul className="speak-hints" data-id="speak-hints" aria-label={t('speak.hints')}>
            {step.hints.map((hint, i) => (
              <li key={i}>{fill(hint)}</li>
            ))}
          </ul>
        ) : null}
        {canRecord ? (
          <div className="speak-recorder" data-id="speak-recorder">
            {recorder.state === 'recording' ? (
              <button type="button" className={buttonClass('secondary')} data-id="speak-stop" onClick={recorder.stop}>
                <T k="speak.stop" params={{ seconds: recorder.secondsLeft }} />
              </button>
            ) : (
              <button type="button" className={buttonClass('secondary')} data-id="speak-record" onClick={() => void recorder.start()}>
                <Icon name="speaker" size={24} />
                <T k={recorder.state === 'recorded' ? 'speak.recordAgain' : 'speak.record'} />
              </button>
            )}
            {recorder.url ? (
              <>
                <button type="button" className={buttonClass('ghost')} data-id="speak-playback" onClick={() => void audio.current?.play()}>
                  <T k="speak.playback" />
                </button>
                <audio ref={audio} src={recorder.url} data-id="speak-audio" preload="auto" />
              </>
            ) : null}
            <p className="hint">
              <T k="speak.private" />
            </p>
          </div>
        ) : (
          <p className="hint" data-id="speak-no-mic">
            <T k="speak.noMic" />
          </p>
        )}
        <div className="challenge-actions">
          <ListenButton text={{ vi: [prompt, ...step.hints.map(fill)].join('\n') }} dataId="speak-listen" label="speech.listenQuestion" small={false} />
          <button type="button" className={buttonClass('primary')} data-id="speak-done" disabled={busy || recorder.state === 'recording'} onClick={onDone}>
            <Icon name="checkMark" size={28} />
            <T k="speak.done" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
