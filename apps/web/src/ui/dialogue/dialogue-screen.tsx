// M3.3 (Hội thoại NPC), as a quest scene (mock "quest screens"): the NPC's portrait and its line in a
// speech bubble under its name tag, one line at a time; the story choices of the step as big cards
// (three or more read as a decision, mock "Lựa chọn hành động"), each may get a reply; "Xem nhiệm vụ";
// "Nghe lại" with an on-device voice. Every text goes through the player's character name; the step
// completes on the server when it ends.
import { useState } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { CharacterDto } from '@miu/schema/game';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import type { UiIcon } from '../kit/ui-art';
import { say } from '../player/player-data';
import { NpcPortrait } from './npc-portrait';
import { speak, useLocalVoice } from './speech';
import './dialogue.css';

type DialogueStep = Extract<QuestStepPublic, { kind: 'dialogue' }>;

interface Line {
  speaker: string;
  text: string;
}

/** Icons on the choice cards, in order: agree, ask more, then the rest (mock NPC and decision screens). */
const CHOICE_ICONS: readonly UiIcon[] = ['heart', 'sparkles', 'map', 'key', 'gift'];

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
  const decision = step.choices.length >= 3;

  return (
    <Modal title={shown.speaker} onClose={onClose} dataId="dialogue" placement="bottom" variant="scene" titleClass="ribbon ribbon--small">
      <div className="dialogue-scene">
        <div className="npc-say">
          <NpcPortrait name={shown.speaker} target={step.target} size={96} />
          <p className="parchment npc-bubble dialogue-line" aria-live="polite" data-id="dialogue-line">
            {shown.text}
          </p>
        </div>
        {showQuest ? (
          <p className="parchment npc-bubble" data-id="dialogue-quest">
            {questSummary}
          </p>
        ) : null}
        {atChoices ? (
          <div className={`dialogue-choices${decision ? ' dialogue-choices--decision' : ''}`}>
            {step.choices.map((choice, i) => (
              <button
                key={choice.text}
                type="button"
                className={`dialogue-choice${i === 0 && !decision ? ' dialogue-choice--main' : ''}`}
                data-id={`dialogue-choice-${i}`}
                disabled={busy}
                // A choice with a reply shows it first; the step completes after "Tiếp tục".
                onClick={() => (choice.reply ? setReply({ speaker, text: say(choice.reply, character) }) : onDone())}
              >
                <Icon name={CHOICE_ICONS[i % CHOICE_ICONS.length] ?? 'heart'} size={decision ? 48 : 32} />
                {say(choice.text, character)}
              </button>
            ))}
            <button type="button" className="dialogue-choice" data-id="dialogue-quest-button" aria-pressed={showQuest} onClick={() => setShowQuest(!showQuest)}>
              <Icon name="scroll" size={decision ? 48 : 32} />
              Xem nhiệm vụ
            </button>
          </div>
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
          ) : atChoices ? null : (
            <button type="button" className={buttonClass('primary')} data-id="dialogue-done" disabled={busy} onClick={onDone}>
              Tiếp tục
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
