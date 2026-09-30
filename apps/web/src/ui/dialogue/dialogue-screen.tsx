// M3.3 (Hội thoại NPC): name bubble with the NPC's picture, one line at a time, the story choices of
// the step (each may get a reply), "Xem nhiệm vụ", and "Nghe lại" with an on-device voice. Every
// text goes through the player's character name; the step completes on the server when it ends.
import { useState } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { CharacterDto } from '@miu/schema/game';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import type { UiIcon } from '../kit/ui-art';
import { say } from '../player/player-data';
import { speak, useLocalVoice } from './speech';
import './dialogue.css';

type DialogueStep = Extract<QuestStepPublic, { kind: 'dialogue' }>;

/** Picture for each speaking target on the chapter 1 map. */
const SPEAKER_ICON: Record<string, UiIcon> = { 'parrot-guide': 'parrot', 'animal-beaver': 'beaver', 'ancient-tree': 'tree' };

interface Line {
  speaker: string;
  text: string;
}

export function DialogueScreen({
  step,
  character,
  questSummary,
  busy,
  onDone,
  onClose,
}: {
  step: DialogueStep;
  character: CharacterDto;
  /** Shown by "Xem nhiệm vụ". */
  questSummary: string;
  busy: boolean;
  onDone: () => void;
  onClose: () => void;
}) {
  const voice = useLocalVoice();
  const lines: Line[] = step.lines.map((l) => ({ speaker: say(l.speaker, character), text: say(l.text, character) }));
  const [index, setIndex] = useState(0);
  const [reply, setReply] = useState<Line | null>(null);
  const [showQuest, setShowQuest] = useState(false);
  const speaker = lines[0]?.speaker ?? '';
  const shown = reply ?? lines[index] ?? { speaker, text: '' };
  const lastLine = index >= lines.length - 1;
  const atChoices = lastLine && reply === null && step.choices.length > 0;
  const icon = SPEAKER_ICON[step.target ?? ''];

  return (
    <Modal title={shown.speaker} onClose={onClose} dataId="dialogue" placement="bottom">
      <div className="dialogue-body">
        {icon ? <Icon name={icon} size={72} /> : null}
        <p className="dialogue-line" aria-live="polite" data-id="dialogue-line">
          {shown.text}
        </p>
      </div>
      {showQuest ? (
        <p className="hint" data-id="dialogue-quest">
          {questSummary}
        </p>
      ) : null}
      <div className="dialogue-actions">
        {voice ? (
          <button type="button" className={buttonClass('ghost', { small: true })} data-id="dialogue-listen" onClick={() => speak(shown.text, voice)}>
            <Icon name="speaker" size={24} />
            Nghe lại
          </button>
        ) : null}
        {!lastLine ? (
          <button type="button" className={buttonClass('primary')} data-id="dialogue-next" onClick={() => setIndex(index + 1)}>
            Tiếp
          </button>
        ) : atChoices ? (
          <>
            {step.choices.map((choice, i) => (
              <button
                key={choice.text}
                type="button"
                className={buttonClass(i === 0 ? 'primary' : 'secondary')}
                data-id={`dialogue-choice-${i}`}
                disabled={busy}
                // A choice with a reply shows it first; the step completes after "Tiếp tục".
                onClick={() => (choice.reply ? setReply({ speaker, text: say(choice.reply, character) }) : onDone())}
              >
                {say(choice.text, character)}
              </button>
            ))}
            <button type="button" className={buttonClass('ghost')} data-id="dialogue-quest-button" aria-pressed={showQuest} onClick={() => setShowQuest(!showQuest)}>
              Xem nhiệm vụ
            </button>
          </>
        ) : (
          <button type="button" className={buttonClass('primary')} data-id="dialogue-done" disabled={busy} onClick={onDone}>
            Tiếp tục
          </button>
        )}
      </div>
    </Modal>
  );
}
