// Nói và nghe: the book's speaking task with its "G:" prompts and pictures. The child talks (to the
// character, a parent, or later into the device recorder, which never sends sound anywhere); nothing
// is graded, "Mình nói xong rồi" finishes the step.
import type { QuestStepPublic } from '@miu/schema/content';
import { speak, useLocalVoice } from '../../dialogue/speech';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { Modal } from '../../kit/modal';
import { Illustration } from '../illustrations/illustration';
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
  const prompt = fill(step.prompt);
  return (
    <Modal title={fill(step.title)} onClose={onClose} dataId="speak-step" size="wide">
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
      <div className="challenge-actions">
        {voice ? (
          <button type="button" className={buttonClass('ghost')} data-id="speak-listen" onClick={() => speak(prompt, voice)}>
            <Icon name="speaker" size={24} />
            Nghe câu hỏi
          </button>
        ) : null}
        <button type="button" className={buttonClass('primary')} data-id="speak-done" disabled={busy} onClick={onDone}>
          <Icon name="checkMark" size={28} />
          Mình nói xong rồi
        </button>
      </div>
    </Modal>
  );
}
