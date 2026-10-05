// M3.3 (Hội thoại NPC), as a quest scene (mock "quest screens"): the NPC's portrait and its line in a
// speech bubble under its name tag, one line at a time; the story choices of the step as big cards
// (three or more read as a decision, mock "Lựa chọn hành động"), each may get a reply; "Xem nhiệm vụ";
// "Nghe lại" with an on-device voice (listen-button.tsx). Every text goes through the player's character name; the step
// completes on the server when it ends.
import { useState } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { CharacterDto } from '@miu/schema/game';
import { mapBoth, type Bilingual } from '../i18n/i18n';
import { Bi, T } from '../i18n/use-t';
import { twin } from '../quest/content-text';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import type { UiIcon } from '../kit/ui-art';
import { say } from '../player/player-data';
import { NpcPortrait } from './npc-portrait';
import { ListenButton } from './listen-button';
import './dialogue.css';
import { isCount, useDraftState } from '../quest/step-draft';

type DialogueStep = Extract<QuestStepPublic, { kind: 'dialogue' }>;

interface Line {
  speaker: string;
  /** The line in both languages (its English twin when the content has one), the player's name filled in. */
  text: Bilingual;
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
  /** Shown by "Xem nhiệm vụ" (a plain line shows in Vietnamese in every mode). */
  questSummary: string | Bilingual;
  busy: boolean;
  onDone: () => void;
  onClose: () => void;
}) {
  const fill = (text: string): string => say(text, character);
  const lines: Line[] = step.lines.map((l, i) => ({ speaker: fill(l.speaker), text: mapBoth(twin(l.text, step.en?.lines[i]), fill) }));
  const summary = typeof questSummary === 'string' ? twin(questSummary, null) : questSummary;
  const [index, setIndex] = useDraftState('line', 0, (v): v is number => isCount(v) && v < Math.max(1, step.lines.length));
  const [reply, setReply] = useState<Line | null>(null);
  const [showQuest, setShowQuest] = useState(false);
  const speaker = lines[0]?.speaker ?? '';
  const shown = reply ?? lines[index] ?? { speaker, text: twin('', null) };
  const lastLine = index >= lines.length - 1;
  const atChoices = lastLine && reply === null && step.choices.length > 0;
  const decision = step.choices.length >= 3;

  return (
    <Modal title={shown.speaker} onClose={onClose} dataId="dialogue" placement="bottom" variant="scene" titleClass="ribbon ribbon--small">
      <div className="dialogue-scene">
        <div className="npc-say">
          <NpcPortrait name={shown.speaker} target={step.target} size={96} reaction="speak" reactionKey={`${index}-${reply ? 'reply' : 'line'}`} />
          <p className="parchment npc-bubble dialogue-line" aria-live="polite" data-id="dialogue-line">
            <Bi vi={shown.text.vi} en={shown.text.en} />
          </p>
        </div>
        {showQuest ? (
          <p className="parchment npc-bubble" data-id="dialogue-quest">
            <Bi {...mapBoth(summary, fill)} />
          </p>
        ) : null}
        {atChoices ? (
          <div className={`dialogue-choices${decision ? ' dialogue-choices--decision' : ''}`}>
            {step.choices.map((choice, i) => {
              const en = step.en?.choices[i];
              const reply = choice.reply;
              return (
                <button
                  key={choice.text}
                  type="button"
                  className={`dialogue-choice${i === 0 && !decision ? ' dialogue-choice--main' : ''}`}
                  data-id={`dialogue-choice-${i}`}
                  disabled={busy}
                  // A choice with a reply shows it first; the step completes after "Tiếp tục".
                  onClick={() => (reply ? setReply({ speaker, text: mapBoth(twin(reply, en?.reply), fill) }) : onDone())}
                >
                  <Icon name={CHOICE_ICONS[i % CHOICE_ICONS.length] ?? 'heart'} size={decision ? 48 : 32} />
                  <Bi {...mapBoth(twin(choice.text, en?.text), fill)} />
                </button>
              );
            })}
            <button type="button" className="dialogue-choice" data-id="dialogue-quest-button" aria-pressed={showQuest} onClick={() => setShowQuest(!showQuest)}>
              <Icon name="scroll" size={decision ? 48 : 32} />
              <T k="dialogue.seeQuest" />
            </button>
          </div>
        ) : null}
        <div className="dialogue-actions">
          <ListenButton text={shown.text.en === shown.text.vi ? { vi: shown.text.vi } : shown.text} dataId="dialogue-listen" label="speech.listenAgain" />
          {!lastLine ? (
            <button type="button" className={buttonClass('primary')} data-id="dialogue-next" onClick={() => setIndex(index + 1)}>
              <T k="common.next" />
            </button>
          ) : atChoices ? null : (
            <button type="button" className={buttonClass('primary')} data-id="dialogue-done" disabled={busy} onClick={onDone}>
              <T k="common.continue" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
