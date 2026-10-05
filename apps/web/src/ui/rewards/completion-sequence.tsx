// M2.9 / M3.11 reward moment, then Level Up and Unlock (NEW SCREEN, MVP): at most three screens, each
// skippable with one tap. Every number is the server's (the last step's response): stars, the XP
// actually given (90 instead of 100 after seeing an answer, said kindly), coins, items, skill XP, and after a
// lesson how far the region's chest is (`GET /regions/:id/rewards`).
// The reward screen unfolds in order: the quest's character and the child's cheer, the stars light
// one by one, then XP and coins count up; rewards worth nothing are left out. Under reduced motion
// everything shows at once.
import { useEffect, useState, type CSSProperties } from 'react';
import type { NotebookLine, QuestCompletion, StepCompleteResponse } from '@miu/schema/game';
import type { SkillGiftDto } from '@miu/schema/progression';
import { ITEMS, itemIcon } from '../backpack/items';
import { CollectibleDropNote } from '../collection/collectible-drop';
import { lastSpeakerOf, NpcPortrait } from '../dialogue/npc-portrait';
import { pairOf, type TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon, MiuPortrait } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { ProgressBar } from '../kit/progress-bar';
import { assetUrl, REGION_CHEST } from '../kit/ui-art';
import { say, type PlayerData } from '../player/player-data';
import { NotebookLines } from '../quest/notebook-card';
import type { ActiveQuestView } from '../quest/quest-flow';
import { regionGoalLine, rewardItemArt, useRegionRewards } from '../region/region-rewards';
import { findRegion } from '../region/regions';
import { playCue } from '../sound/sfx';
import { Say, titleOf } from '../quest/content-text';
import { Hearts } from '../npc/hearts';
import './rewards.css';

/** Time between two stars lighting up; the counters start once the last star is lit. */
const STAR_GAP_MS = 400;
const COUNT_MS = 900;

type Screen = 'notebook' | 'reward' | 'level' | 'skill';
/** What the finishing step paid (server). */
export type GrantedReward = NonNullable<StepCompleteResponse['reward']>;

function skillNameOf(data: PlayerData, id: string): string {
  return data.progress.subjects.flatMap((s) => s.skills).find((k) => k.skillId === id)?.name ?? id;
}

/**
 * The screens after a quest, in order: first what to copy into the vở when the quest had answers (owner,
 * 03/10/2026: once she has played, she writes it down), then the reward, then the level-up and skill-up if any.
 */
export function completionScreens(completion: QuestCompletion, notebook = 0): Screen[] {
  const hasLevelUp = completion.levelAfter > completion.levelBefore;
  // A gift can come without a level-up in this run: a level reached before gifts existed is paid now.
  const hasSkillUp = completion.skillLevels.some((s) => s.levelAfter > s.levelBefore) || (completion.skillGifts?.length ?? 0) > 0;
  return [
    ...(notebook > 0 ? (['notebook'] as const) : []),
    'reward',
    ...(hasLevelUp ? (['level'] as const) : []),
    ...(hasSkillUp ? (['skill'] as const) : []),
  ];
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

/**
 * After a lesson, how far the region's chest is (owner, 03/10/2026: finishing should feel special): the lessons
 * done on a bar ending in the chest, and what comes next ("Còn 2 nhiệm vụ nữa tới rương!"). The server's count,
 * read once the quest is paid; nothing shows if it cannot be read.
 */
function RegionChestProgress({ quest, data, reveal }: { quest: ActiveQuestView; data: PlayerData; reveal: CSSProperties }) {
  // The chest counts lessons: a minigame or a chapter of a character's story leaves it as it is.
  const dto = useRegionRewards(quest.category === 'side' || quest.category === 'story' || quest.category === 'coop' ? null : quest.region);
  const { t } = useT();
  if (!dto || dto.lessons === 0) return null;
  const line = regionGoalLine(dto) ?? pairOf('completion.areaDone');
  const region = findRegion(quest.region);
  return (
    <div className="reward-region reward-reveal" style={reveal} data-id="reward-region-goal">
      <img className="reward-region-chest" src={assetUrl(REGION_CHEST)} alt="" width={56} height={56} />
      <div className="reward-region-text">
        <span className="hint">{region ? say(region.name, data.character) : null}</span>
        <ProgressBar done={dto.lessonsDone} total={dto.lessons} label={t('completion.areaLabel', { done: dto.lessonsDone, total: dto.lessons })} />
        <strong data-id="reward-region-line">
          <Bi {...line} />
        </strong>
      </div>
    </div>
  );
}

function RewardScreen({ completion, reward, quest, data }: { completion: QuestCompletion; reward: GrantedReward; quest: ActiveQuestView; data: PlayerData }) {
  useRewardSounds(completion.stars);
  const { t } = useT();
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
      <p className="hint">
        <Say text={titleOf(quest)} fill={fill} />
      </p>
      <p className="reward-stars" aria-label={t('completion.stars', { stars: completion.stars })} data-id="reward-stars" data-stars={completion.stars}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= completion.stars ? 'reward-star' : 'reward-star reward-star--off'} style={{ '--star': n } as CSSProperties}>
            <Icon name="glowingStar" size={56} />
          </span>
        ))}
      </p>
      <ul className="reward-list">
        {completion.xpAwarded > 0 ? <CountedReward value={completion.xpAwarded} delayMs={countFrom} unit="XP" icon="sparkles" dataId="reward-xp" /> : null}
        {reward.coin > 0 ? <CountedReward value={reward.coin} delayMs={countFrom} unit={t('common.coins')} icon="coin" dataId="reward-coin" /> : null}
        {items.map(([id, qty], i) => (
          <li key={id} data-id={`reward-item-${id}`} className="reward-reveal" style={reveal(i)}>
            <Icon name={itemIcon(ITEMS.get(id))} size={32} /> {fill(ITEMS.get(id)?.name ?? id)} ×{qty}
          </li>
        ))}
        {skills.map((s, i) => (
          <li key={s.skillId} data-id={`reward-skill-${s.skillId}`} className="reward-reveal" style={reveal(items.length + i)}>
            <Icon name="books" size={32} /> {skillName(s.skillId)} +{reward.skillXp[s.skillId] ?? 0}
            {s.levelAfter > s.levelBefore ? (
              <span className="badge">
                <T k="completion.skillUp" params={{ level: s.levelAfter }} />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <CollectibleDropNote drop={completion.collectible} fill={fill} />
      {completion.story ? (
        <p className="reward-story reward-reveal" style={reveal(items.length + skills.length)} data-id="reward-story">
          <Hearts hearts={completion.story.heartsAfter} dataId="reward-story-hearts" />{' '}
          <T k={completion.story.heartsAfter > completion.story.heartsBefore ? 'completion.storyHeart' : 'completion.storyDone'} params={{ who: fill(completion.story.npcName) }} />
          {completion.story.letter ? (
            <>
              {' '}
              <span className="badge" data-id="reward-story-letter">
                <T k="completion.storyLetter" />
              </span>
            </>
          ) : null}
        </p>
      ) : null}
      <RegionChestProgress quest={quest} data={data} reveal={reveal(items.length + skills.length)} />
      {completion.xpAwarded < quest.reward.xp ? (
        <p className="hint" data-id="reward-encourage">
          <T k="completion.encourage" params={{ name: data.character.name, xp: quest.reward.xp }} />
        </p>
      ) : null}
    </div>
  );
}

/** The skill level gifts the run paid (server): coins for each level and, on some levels, a themed wearable. */
function SkillGifts({ gifts, data }: { gifts: readonly SkillGiftDto[]; data: PlayerData }) {
  if (gifts.length === 0) return null;
  return (
    <ul className="reward-skill-gifts" data-id="skill-up-gifts">
      {gifts.map((gift) => (
        <li key={`${gift.skillId}-${gift.level}`} className="reward-skill-gift" data-id={`skill-gift-${gift.skillId}-${gift.level}`}>
          <Icon name="gift" size={32} />
          <span>
            {skillNameOf(data, gift.skillId)} · <T k="completion.skillGift" params={{ level: gift.level }} />
          </span>
          <span className="reward-skill-gift-coin">
            <Icon name="coin" size={24} />+{gift.coin}
          </span>
          {gift.item ? (
            <span className="reward-skill-gift-item" data-id={`skill-gift-item-${gift.item.id}`}>
              <img src={rewardItemArt(gift.item.id)} alt="" width={48} height={48} />
              <span className="badge">
                <T k="reward.exclusive" />
              </span>
              <strong>{gift.item.name}</strong>
              <span className="hint">
                <T k="reward.inWardrobe" />
              </span>
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function CompletionSequence({
  completion,
  reward,
  quest,
  data,
  onMap,
  onExplore,
  notebook = [],
}: {
  /** The quest's questions and answers to copy into the vở, shown first. */
  notebook?: readonly NotebookLine[];
  completion: QuestCompletion;
  reward: GrantedReward;
  quest: ActiveQuestView;
  data: PlayerData;
  onMap: () => void;
  onExplore: () => void;
}) {
  const screens = completionScreens(completion, notebook.length);
  const [index, setIndex] = useState(0);
  const screen = screens[index] ?? 'reward';
  const last = index === screens.length - 1;
  const title: TextKey =
    screen === 'notebook'
      ? 'completion.notebookTitle'
      : screen === 'reward'
        ? 'completion.rewardTitle'
        : screen === 'level'
          ? 'completion.levelTitle'
          : 'completion.skillTitle';

  return (
    <Modal title={<T k={title} />} onClose={last ? onExplore : () => setIndex(index + 1)} dataId={`completion-${screen}`} variant="scene">
      {screen === 'notebook' ? (
        <div className="reward-body" data-id="completion-notebook-page">
          <p className="notebook-ask">
            <T k="completion.notebookAsk" params={{ name: data.character.name }} />
          </p>
          <NotebookLines lines={notebook} character={data.character} />
        </div>
      ) : screen === 'reward' ? (
        <RewardScreen completion={completion} reward={reward} quest={quest} data={data} />
      ) : screen === 'level' ? (
        <div className="reward-body" data-id="level-up">
          <MiuPortrait pose="cheer" size="9rem" species={data.character.species} />
          <p className="reward-level">
            Lv.{completion.levelBefore} → Lv.{completion.levelAfter}
          </p>
          <p>
            <T k="completion.levelBody" params={{ name: data.character.name }} />
          </p>
        </div>
      ) : (
        <div className="reward-body" data-id="skill-up">
          <MiuPortrait pose="cheer" size="9rem" species={data.character.species} />
          {completion.skillLevels
            .filter((s) => s.levelAfter > s.levelBefore)
            .map((s) => (
              <div key={s.skillId} className="reward-skill-up-item" data-id={`skill-up-${s.skillId}`}>
                <div className="reward-skill-name">
                  <Icon name="books" size={32} />
                  <span>{skillNameOf(data, s.skillId)}</span>
                </div>
                <p className="reward-level">
                  Lv.{s.levelBefore} → Lv.{s.levelAfter}
                </p>
              </div>
            ))}
          <SkillGifts gifts={completion.skillGifts ?? []} data={data} />
          <p>
            <T k="completion.skillBody" params={{ name: data.character.name }} />
          </p>
        </div>
      )}
      <div className="modal-actions">
        {last ? (
          <>
            <button type="button" className={buttonClass('primary', { block: true })} data-id="completion-map" onClick={onMap}>
              <Icon name="map" size={28} />
              <T k="completion.toMap" />
            </button>
            <button type="button" className={buttonClass('secondary', { block: true })} data-id="completion-explore" onClick={onExplore}>
              <T k="completion.explore" />
            </button>
          </>
        ) : (
          <button type="button" className={buttonClass('primary', { block: true })} data-id="completion-next" onClick={() => setIndex(index + 1)}>
            <T k={screen === 'notebook' ? 'notebook.done' : 'common.next'} />
          </button>
        )}
      </div>
    </Modal>
  );
}
