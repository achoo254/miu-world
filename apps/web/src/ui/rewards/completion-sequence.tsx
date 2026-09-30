// M2.9 / M3.11 reward moment, then Level Up and Unlock (NEW SCREEN, MVP): at most three screens, each
// skippable with one tap. Every number is the server's (the last step's response): stars, the XP
// actually given (90 instead of 100 after seeing an answer, said kindly), coins, items, skill XP.
import { useState } from 'react';
import type { QuestCompletion, StepCompleteResponse } from '@miu/schema/game';
import { ITEMS, itemIcon } from '../backpack/items';
import { Icon, MiuPortrait } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { say, type PlayerData } from '../player/player-data';
import type { ActiveQuestView } from '../quest/quest-flow';
import './rewards.css';

type Screen = 'reward' | 'level' | 'unlock';
/** What the finishing step paid (server). */
export type GrantedReward = NonNullable<StepCompleteResponse['reward']>;

export function completionScreens(completion: QuestCompletion): Screen[] {
  return ['reward', ...(completion.levelAfter > completion.levelBefore ? (['level'] as const) : []), ...(completion.unlocked.length > 0 ? (['unlock'] as const) : [])];
}

export function CompletionSequence({
  completion,
  reward,
  quest,
  data,
  onMap,
  onExplore,
}: {
  completion: QuestCompletion;
  reward: GrantedReward;
  quest: ActiveQuestView;
  data: PlayerData;
  onMap: () => void;
  onExplore: () => void;
}) {
  const screens = completionScreens(completion);
  const [index, setIndex] = useState(0);
  const screen = screens[index] ?? 'reward';
  const last = index === screens.length - 1;
  const fill = (text: string) => say(text, data.character);
  const skillName = (id: string) => data.progress.subjects.flatMap((s) => s.skills).find((k) => k.skillId === id)?.name ?? id;
  const title = screen === 'reward' ? 'Hoàn thành nhiệm vụ!' : screen === 'level' ? 'Lên cấp!' : 'Mở khóa!';

  return (
    <Modal title={title} onClose={last ? onExplore : () => setIndex(index + 1)} dataId={`completion-${screen}`}>
      {screen === 'reward' ? (
        <div className="reward-body">
          <p className="hint">{fill(quest.title)}</p>
          <p className="reward-stars" aria-label={`${completion.stars} trên 3 sao`} data-id="reward-stars" data-stars={completion.stars}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={n <= completion.stars ? 'reward-star' : 'reward-star reward-star--off'}>
                <Icon name="glowingStar" size={56} />
              </span>
            ))}
          </p>
          <ul className="reward-list">
            <li data-id="reward-xp">
              <Icon name="sparkles" size={32} /> +{completion.xpAwarded} XP
            </li>
            <li data-id="reward-coin">
              <Icon name="coin" size={32} /> +{reward.coin} Xu
            </li>
            {Object.entries(reward.items).map(([id, qty]) => (
              <li key={id} data-id={`reward-item-${id}`}>
                <Icon name={itemIcon(ITEMS.get(id))} size={32} /> {ITEMS.get(id)?.name ?? id} ×{qty}
              </li>
            ))}
            {completion.skillLevels.map((s) => (
              <li key={s.skillId} data-id={`reward-skill-${s.skillId}`}>
                <Icon name="books" size={32} /> {skillName(s.skillId)} +{reward.skillXp[s.skillId] ?? 0}
                {s.levelAfter > s.levelBefore ? <span className="badge">Kỹ năng lên cấp {s.levelAfter}!</span> : null}
              </li>
            ))}
          </ul>
          {completion.xpAwarded < quest.reward.xp ? (
            <p className="hint" data-id="reward-encourage">
              Giỏi lắm! Lần sau {data.character.name} tự giải hết để nhận trọn {quest.reward.xp} XP nhé.
            </p>
          ) : null}
        </div>
      ) : screen === 'level' ? (
        <div className="reward-body" data-id="level-up">
          <MiuPortrait pose="cheer" size="9rem" />
          <p className="reward-level">
            Lv.{completion.levelBefore} → Lv.{completion.levelAfter}
          </p>
          <p>{data.character.name} mạnh hơn rồi! Đồ mới có thể đã mở trong tủ đồ.</p>
        </div>
      ) : (
        <div className="reward-body" data-id="unlock">
          <Icon name="unlocked" size={72} />
          <ul className="reward-list">
            {completion.unlocked.map((id) => {
              const next = data.quests.find((q) => q.quest.id === id);
              return (
                <li key={id} data-id={`unlock-${id}`}>
                  {next ? fill(next.quest.title) : id}
                  {next?.quest.status === 'stub' ? <span className="badge">Sắp có</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="modal-actions">
        {last ? (
          <>
            <button type="button" className={buttonClass('primary', { block: true })} data-id="completion-map" onClick={onMap}>
              <Icon name="map" size={28} />
              Về bản đồ
            </button>
            <button type="button" className={buttonClass('secondary', { block: true })} data-id="completion-explore" onClick={onExplore}>
              Tiếp tục khám phá
            </button>
          </>
        ) : (
          <button type="button" className={buttonClass('primary', { block: true })} data-id="completion-next" onClick={() => setIndex(index + 1)}>
            Tiếp
          </button>
        )}
      </div>
    </Modal>
  );
}
