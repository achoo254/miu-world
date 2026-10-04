// Decision Screen: branch choice or moral/adventure decision for children.
// Big action cards with icons, clear prompt, and consequence narration.
import { useState, type ReactElement } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { T } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import type { UiIcon } from '../kit/ui-art';
import { say, type PlayerData } from '../player/player-data';
import { NpcPortrait } from '../dialogue/npc-portrait';
import { ListenButton } from '../dialogue/listen-button';
import '../dialogue/dialogue.css';

type DecisionStep = Extract<QuestStepPublic, { kind: 'decision' }>;

const DECISION_ICONS: readonly UiIcon[] = ['sparkles', 'heart', 'map', 'key', 'gift', 'star'];

export function DecisionScreen({
  step,
  data,
  busy,
  onAnswer,
  onClose,
}: {
  step: DecisionStep;
  data: PlayerData;
  busy: boolean;
  onAnswer: (answer: StepAnswer) => void;
  onClose: () => void;
}): ReactElement {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const speakerName = step.speaker ? say(step.speaker, data.character) : say(step.target ?? 'Bạn đồng hành', data.character);
  const promptText = say(step.prompt, data.character);

  const chosen = step.choices.find((c) => c.id === selectedChoiceId);

  const handleSelect = (choiceId: string) => {
    setSelectedChoiceId(choiceId);
    const c = step.choices.find((item) => item.id === choiceId);
    if (!c?.consequence) {
      onAnswer({ choice: choiceId });
    }
  };

  const handleContinueAfterConsequence = () => {
    if (selectedChoiceId) {
      onAnswer({ choice: selectedChoiceId });
    }
  };

  return (
    <Modal
      title={say(step.title, data.character)}
      onClose={onClose}
      dataId="decision-screen"
      placement="bottom"
      variant="scene"
      titleClass="ribbon ribbon--small"
    >
      <div className="dialogue-scene" data-id="decision-scene">
        <div className="npc-say">
          <NpcPortrait name={speakerName} target={step.target} size={96} reaction="speak" />
          <div className="npc-bubble">
            <span className="npc-tag">{speakerName}</span>
            <p className="npc-line">{chosen?.consequence ? say(chosen.consequence, data.character) : promptText}</p>
            <ListenButton text={{ vi: chosen?.consequence ? say(chosen.consequence, data.character) : promptText }} dataId="decision-listen" />
          </div>
        </div>

        {chosen?.consequence ? (
          <div className="dialogue-actions">
            <button
              type="button"
              className={buttonClass('primary', { block: true })}
              onClick={handleContinueAfterConsequence}
              disabled={busy}
              data-id="decision-continue"
            >
              <T k="common.continue" />
            </button>
          </div>
        ) : (
          <div className="dialogue-choices" role="menu" aria-label="Lựa chọn hành động">
            {step.choices.map((choice, i) => (
              <button
                key={choice.id}
                type="button"
                className="dialogue-choice"
                onClick={() => handleSelect(choice.id)}
                disabled={busy}
                data-id={`choice-${choice.id}`}
              >
                <Icon name={DECISION_ICONS[i % DECISION_ICONS.length] ?? 'star'} size={24} />
                <span>{say(choice.text, data.character)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
