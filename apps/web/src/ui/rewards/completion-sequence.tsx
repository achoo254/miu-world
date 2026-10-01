// M2.9 / M3.11 reward moment, then Level Up and Unlock (NEW SCREEN, MVP): at most three screens, each
// skippable with one tap. Every number is the server's (the last step's response): stars, the XP
// actually given (90 instead of 100 after seeing an answer, said kindly), coins, items, skill XP.
// The reward screen unfolds in order: the quest's character and the child's cheer, the stars light
// one by one, then XP and coins count up; rewards worth nothing are left out. Under reduced motion
// everything shows at once.
import { useEffect, useState, type CSSProperties } from 'react';
import type { QuestCompletion, StepCompleteResponse } from '@miu/schema/game';
import { ITEMS, itemIcon } from '../backpack/items';
import { lastSpeakerOf, NpcPortrait } from '../dialogue/npc-portrait';
import { Icon, MiuPortrait } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { say, type PlayerData } from '../player/player-data';
import type { ActiveQuestView } from '../quest/quest-flow';
import { playCue } from '../sound/sfx';
import './rewards.css';

/** Time between two stars lighting up; the counters start once the last star is lit. */
const STAR_GAP_MS = 400;
const COUNT_MS = 900;

type Screen = 'reward' | 'level';
/** What the finishing step paid (server). */
export type GrantedReward = NonNullable<StepCompleteResponse['reward']>;

export function completionScreens(completion: QuestCompletion): Screen[] {
  return ['reward', ...(completion.levelAfter > completion.levelBefore ? (['level'] as const) : [])];
}

/** The counter's value `elapsedMs` into a count-up of `durationMs`: from 0, easing out, ending exactly on `target`. */
export function countUpValue(target: number, elapsedMs: number, durationMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= durationMs) return target;
  const t = elapsedMs / durationMs;
  return Math.round(target * (1 - (1 - t) ** 3));
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Counts up to `target` after `delayMs`; shows `target` straight away under reduced motion. */
function useCountUp(target: number, delayMs: number): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now() + delayMs;
    let frame = requestAnimationFrame(function tick(now) {
      setValue(countUpValue(target, now - start, COUNT_MS));
      if (now - start < COUNT_MS) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, delayMs]);
  return value;
}

/** A chime as the screen opens, then a ting for each star as it lights (stars light at once under reduced motion: chime only). */
function useRewardSounds(stars: number): void {
  useEffect(() => {
    playCue('complete');
    if (prefersReducedMotion()) return;
    const timers = Array.from({ length: stars }, (_, i) => window.setTimeout(() => playCue('star'), (i + 1) * STAR_GAP_MS));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [stars]);
}

/** A counter that counts up on screen; screen readers get the final number only. */
function CountedReward({ value, delayMs, unit, icon, dataId }: { value: number; delayMs: number; unit: string; icon: 'sparkles' | 'coin'; dataId: string }) {
  const shown = useCountUp(value, delayMs);
  return (
    <li data-id={dataId} data-value={value}>
      <Icon name={icon} size={32} />
      <span aria-hidden="true">
        +{shown} {unit}
      </span>
      <span className="visually-hidden">
        +{value} {unit}
      </span>
    </li>
  );
}

function RewardScreen({ completion, reward, quest, data }: { completion: QuestCompletion; reward: GrantedReward; quest: ActiveQuestView; data: PlayerData }) {
  useRewardSounds(completion.stars);
  const fill = (text: string) => say(text, data.character);
  const skillName = (id: string) => data.progress.subjects.flatMap((s) => s.skills).find((k) => k.skillId === id)?.name ?? id;
  const cheerer = lastSpeakerOf(quest.steps);
  const countFrom = (completion.stars + 1) * STAR_GAP_MS;
  const items = Object.entries(reward.items).filter(([, qty]) => qty > 0);
  const skills = completion.skillLevels.filter((s) => (reward.skillXp[s.skillId] ?? 0) > 0 || s.levelAfter > s.levelBefore);
  // One clock for the CSS: stars light every --star-gap, the other rows slide in (by --reveal) once the counters stop.
  const timing = { '--star-gap': `${STAR_GAP_MS}ms`, '--reveal-from': `${countFrom + COUNT_MS}ms` } as CSSProperties;
  const reveal = (i: number) => ({ '--reveal': i }) as CSSProperties;

  return (
    <div className="reward-body" style={timing}>
      <div className="reward-cheer" data-id="reward-cheer">
        {cheerer ? <NpcPortrait name={fill(cheerer.name)} target={cheerer.target} size={72} reaction="cheer" /> : null}
        <MiuPortrait pose="cheer" size="6rem" species={data.character.species} />
      </div>
      <p className="hint">{fill(quest.title)}</p>
      <p className="reward-stars" aria-label={`${completion.stars} trên 3 sao`} data-id="reward-stars" data-stars={completion.stars}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= completion.stars ? 'reward-star' : 'reward-star reward-star--off'} style={{ '--star': n } as CSSProperties}>
            <Icon name="glowingStar" size={56} />
          </span>
        ))}
      </p>
      <ul className="reward-list">
        {completion.xpAwarded > 0 ? <CountedReward value={completion.xpAwarded} delayMs={countFrom} unit="XP" icon="sparkles" dataId="reward-xp" /> : null}
        {reward.coin > 0 ? <CountedReward value={reward.coin} delayMs={countFrom} unit="Xu" icon="coin" dataId="reward-coin" /> : null}
        {items.map(([id, qty], i) => (
          <li key={id} data-id={`reward-item-${id}`} className="reward-reveal" style={reveal(i)}>
            <Icon name={itemIcon(ITEMS.get(id))} size={32} /> {fill(ITEMS.get(id)?.name ?? id)} ×{qty}
          </li>
        ))}
        {skills.map((s, i) => (
          <li key={s.skillId} data-id={`reward-skill-${s.skillId}`} className="reward-reveal" style={reveal(items.length + i)}>
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
  );
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
  const title = screen === 'reward' ? 'Hoàn thành nhiệm vụ!' : 'Lên cấp!';

  return (
    <Modal title={title} onClose={last ? onExplore : () => setIndex(index + 1)} dataId={`completion-${screen}`} variant="scene">
      {screen === 'reward' ? (
        <RewardScreen completion={completion} reward={reward} quest={quest} data={data} />
      ) : (
        <div className="reward-body" data-id="level-up">
          <MiuPortrait pose="cheer" size="9rem" species={data.character.species} />
          <p className="reward-level">
            Lv.{completion.levelBefore} → Lv.{completion.levelAfter}
          </p>
          <p>{data.character.name} mạnh hơn rồi! Đồ mới có thể đã mở trong tủ đồ.</p>
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
              Tiếp tục khám phá →
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
