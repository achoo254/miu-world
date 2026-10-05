// Mock "Thành tích (Achievements)" (designs/Journey-Achievements-Shop.png, panels 4–6): the trophy with how many
// she has claimed, tabs by category, the list with each one's progress, the chosen one's card with its reward and
// "Nhận thưởng", and the "Chúc mừng!" card once claimed. Progress and rewards are the server's
// (`GET /api/achievements`, `POST /api/achievements/:id/claim`); the client names the achievement only.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ACHIEVEMENT_CATEGORIES, type AchievementCategory, type AchievementClaimResponse, type AchievementDto } from '@miu/schema/achievement';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import { format, linesOf, mapBoth, same, type Bilingual, type TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { ProgressBar } from '../kit/progress-bar';
import { Tabs } from '../kit/tabs';
import { UI_ICONS, type UiIcon } from '../kit/ui-art';
import { say, type PlayerData } from '../player/player-data';
import { claimAchievement, loadAchievements, useLoaded } from '../progression/progression-api';
import { rewardItemArt } from '../region/region-rewards';
import { playCue } from '../sound/sfx';
import { ProgressShell } from './progress-shell';

type Tab = 'all' | AchievementCategory;
const TAB_KEYS: Readonly<Record<Tab, TextKey>> = {
  all: 'achievements.tab.all',
  'kham-pha': 'achievements.tab.kham-pha',
  'hoc-tap': 'achievements.tab.hoc-tap',
  minigame: 'achievements.tab.minigame',
  'suu-tam': 'achievements.tab.suu-tam',
  'su-kien': 'achievements.tab.su-kien',
};

const TABS: readonly Tab[] = ['all', ...ACHIEVEMENT_CATEGORIES];

/** The achievement's picture: a UI icon (checked by `pnpm content:check`), a trophy otherwise. */
const iconOf = (achievement: AchievementDto): UiIcon => (achievement.icon in UI_ICONS ? (achievement.icon as UiIcon) : 'trophy');
const ready = (a: AchievementDto): boolean => a.reached && !a.claimed;

function Gifts({ achievement }: { achievement: AchievementDto }) {
  const { reward } = achievement;
  return (
    <ul className="achievement-gifts" data-id="achievement-gifts">
      {reward.xp > 0 ? (
        <li className="achievement-gift">
          <Icon name="glowingStar" size={36} />+{reward.xp} XP
        </li>
      ) : null}
      {reward.coin > 0 ? (
        <li className="achievement-gift">
          <Icon name="coin" size={36} />
          <T k="reward.coinsUp" params={{ coin: reward.coin }} />
        </li>
      ) : null}
      {reward.item ? (
        <li className="achievement-gift" data-id={`achievement-gift-${reward.item.id}`}>
          <img src={rewardItemArt(reward.item.id)} alt="" width={36} height={36} />
          {reward.item.name}
        </li>
      ) : null}
    </ul>
  );
}

function AchievementCard({ achievement, player, busy, onClaim }: { achievement: AchievementDto; player: PlayerData; busy: boolean; onClaim: () => void }) {
  const { t } = useT();
  const fill = (text: string) => say(text, player.character);
  return (
    <section className="achievement-card parchment" aria-live="polite" data-id="achievement-card" data-achievement={achievement.id}>
      <Icon name={iconOf(achievement)} size={72} />
      <h2>{achievement.name}</h2>
      <p>
        <Bi {...mapBoth(same(achievement.description), fill)} />
      </p>
      <ProgressBar done={achievement.progress} total={achievement.goal} label={t('achievements.progress', { done: achievement.progress, total: achievement.goal })} />
      <strong>
        {achievement.progress}/{achievement.goal}
      </strong>
      <h3>
        <T k="achievements.rewards" />
      </h3>
      <Gifts achievement={achievement} />
      {achievement.claimed ? (
        <span className="region-tier-done" data-id="achievement-claimed">
          <Icon name="checkMark" size={28} />
          <T k="reward.claimed" />
        </span>
      ) : achievement.reached ? (
        <button type="button" className={buttonClass('primary', { block: true })} data-id="achievement-claim" disabled={busy} onClick={onClaim}>
          <Icon name="gift" size={28} />
          <T k="reward.claim" />
        </button>
      ) : (
        <button type="button" className={buttonClass('secondary', { block: true })} data-id="achievement-not-yet" disabled>
          <T k="achievements.notYet" />
        </button>
      )}
    </section>
  );
}

let doneLines: FreshPicker<Bilingual> | null = null;

/** "Chúc mừng!": the medal, what the achievement gave, a level-up if any. */
export function AchievementCelebration({ claim, player, onClose }: { claim: AchievementClaimResponse; player: PlayerData; onClose: () => void }) {
  const { achievement } = claim;
  // Picked once when the card opens; the next achievement is announced with another line.
  const [doneLine] = useState(() => {
    doneLines ??= freshPicker(linesOf('achievements.doneLines'));
    const line = doneLines.next();
    return { vi: format(line.vi, { name: player.character.name }, 'vi'), en: format(line.en, { name: player.character.name }, 'en') };
  });
  useEffect(() => {
    playCue('complete');
  }, []);
  return (
    <Modal title={<T k="reward.congrats" />} onClose={onClose} dataId="achievement-celebration" variant="scene">
      <div className="reward-body achievement-celebration">
        <span className="achievement-medal">
          <Icon name={iconOf(achievement)} size={80} />
        </span>
        <p>
          <Bi {...doneLine} />
        </p>
        <strong className="reward-level achievement-celebration-name">
          {achievement.name}
        </strong>
        <Gifts achievement={achievement} />
        {achievement.reward.item ? (
          <p className="hint">
            <span className="badge">
              <T k="reward.exclusive" />
            </span>{' '}
            <T k="reward.inWardrobe" />
          </p>
        ) : null}
        {claim.levelAfter > claim.levelBefore ? (
          <p data-id="achievement-level-up">
            <Icon name="glowingStar" size={28} />
            <T k="reward.levelUp" params={{ level: claim.levelAfter }} />
          </p>
        ) : null}
      </div>
      <div className="modal-actions">
        {achievement.reward.item ? (
          <Link to="/create" className={buttonClass('secondary', { block: true })} data-id="achievement-try-on">
            <Icon name="catFace" size={28} />
            <T k="reward.tryOn" />
          </Link>
        ) : null}
        <button type="button" className={buttonClass('primary', { block: true })} data-id="achievement-celebration-close" onClick={onClose}>
          <T k="reward.great" />
        </button>
      </div>
    </Modal>
  );
}

function AchievementsBody({ player, onCoins }: { player: PlayerData; onCoins: (coins: number) => void }) {
  const { t } = useT();
  const list = useLoaded(loadAchievements);
  const [tab, setTab] = useState<Tab>('all');
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [claimed, setClaimed] = useState<AchievementClaimResponse | null>(null);
  if (list.failed) {
    return (
      <p role="alert" className="error">
        <T k="achievements.loadFailed" />{' '}
        <button type="button" className={buttonClass('ghost', { small: true })} onClick={list.retry}>
          <T k="common.retry" />
        </button>
      </p>
    );
  }
  if (!list.data) {
    return (
      <p role="status">
        <T k="common.loading" />
      </p>
    );
  }
  const all = list.data.achievements;
  const shown = all.filter((a) => tab === 'all' || a.category === tab);
  // Ready ones first, then the nearest to done, then the claimed ones.
  const order = (a: AchievementDto): number => (ready(a) ? 0 : a.claimed ? 2 : 1);
  const sorted = [...shown].sort((a, b) => order(a) - order(b) || b.progress / b.goal - a.progress / a.goal);
  const current = all.find((a) => a.id === chosen) ?? sorted[0] ?? null;
  const done = all.filter((a) => a.claimed).length;
  const waiting = all.filter(ready).length;
  const count = (category: Tab) => all.filter((a) => category === 'all' || a.category === category);

  async function claim(achievement: AchievementDto): Promise<void> {
    setBusy(true);
    setError(false);
    try {
      const res = await claimAchievement(achievement.id);
      list.set({ achievements: all.map((a) => (a.id === res.achievement.id ? res.achievement : a)) });
      // What a claim pays (XP, coins, a wearable) can reach other achievements: read them all again.
      if (res.granted) void loadAchievements().then(list.set, () => undefined);
      onCoins(res.progress.coins);
      if (res.granted) setClaimed(res);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="achievement-summary" data-id="achievement-summary">
        <span className="achievement-trophy">
          <Icon name="trophy" size={64} />
          {done}/{all.length}
        </span>
        <div className="achievement-summary-bar">
          <ProgressBar done={done} total={all.length} label={t('achievements.count', { done, total: all.length })} />
        </div>
        {waiting > 0 ? (
          <span className="achievement-ready" data-id="achievement-ready">
            <T k="achievements.ready" params={{ count: waiting }} />
          </span>
        ) : null}
      </div>
      <Tabs
        label={t('profile.achievements')}
        dataId="achievement-tab"
        active={tab}
        onChange={(next) => {
          setTab(next);
          setChosen(null);
        }}
        items={TABS.map((key) => ({
          key,
          label: (
            <>
              <T k={TAB_KEYS[key]} /> {count(key).filter((a) => a.claimed).length}/{count(key).length}
            </>
          ),
        }))}
      >
        <div className="achievement-layout">
          <ul className="achievement-list">
            {sorted.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={`achievement-row${ready(a) ? ' achievement-row--ready' : ''}${a.claimed ? ' achievement-row--claimed' : ''}`}
                  aria-pressed={current?.id === a.id}
                  data-id={`achievement-${a.id}`}
                  data-state={a.claimed ? 'claimed' : a.reached ? 'ready' : 'locked'}
                  onClick={() => setChosen(a.id)}
                >
                  <Icon name={iconOf(a)} size={40} />
                  <span className="achievement-row-text">
                    <strong>{a.name}</strong>
                    <span>{say(a.description, player.character)}</span>
                    <ProgressBar done={a.progress} total={a.goal} label={t('achievements.progress', { done: a.progress, total: a.goal })} />
                  </span>
                  <span className="achievement-row-count">
                    {a.claimed ? <Icon name="checkMark" size={28} label={t('reward.claimed')} /> : ready(a) ? <Icon name="gift" size={32} label={t('reward.claim')} /> : `${a.progress}/${a.goal}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {current ? (
            <AchievementCard achievement={current} player={player} busy={busy} onClaim={() => void claim(current)} />
          ) : (
            <p className="hint">
              <T k="achievements.choose" />
            </p>
          )}
        </div>
      </Tabs>
      {error ? (
        <p role="alert" className="error" data-id="achievement-error">
          <T k="achievements.claimFailed" />
        </p>
      ) : null}
      {claimed ? <AchievementCelebration claim={claimed} player={player} onClose={() => setClaimed(null)} /> : null}
    </>
  );
}

export function AchievementsScreen() {
  return (
    <ProgressShell dataId="achievements-page">
      {(player, setCoins) => (
        <>
          <div className="progress-hero">
            <h1 className="ribbon">
              <T k="achievements.title" params={{ name: player.character.name }} />
            </h1>
            <p>
              <T k="achievements.intro" />
            </p>
          </div>
          <AchievementsBody player={player} onCoins={setCoins} />
        </>
      )}
    </ProgressShell>
  );
}

