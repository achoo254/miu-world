// M3.2 HUD over the forest: player badge (level, XP, coins from the server), "Nhiệm vụ hiện tại",
// the Quests / Map / Backpack / Menu buttons, and the Interact button next to Run and Jump. Nothing
// here changes per frame: the prompt arrives as a discrete bridge event.
import { Link } from 'react-router';
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { QuestSummary } from '@miu/schema/game';
import type { AutowalkState } from '../../game-bridge/game-store';
import { useGameState, useGameStore } from '../../game-bridge/use-game-state';
import type { TextKey } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { PlayerBadge } from '../player/player-badge';
import { nextStep, say, stepProgress, type PlayerData } from '../player/player-data';
import { TextbookRef, textbookOf } from '../player/textbook-ref';
import { Say, stepLineOf, titleOf } from '../quest/content-text';
import { searchCount } from '../quest/quest-flow';
import { RideButton } from './ride-button';
import './hud.css';
import './autowalk.css';

/** What the quest card's walk line says in each state of the walk. */
const AUTOWALK_LINE: Record<AutowalkState, TextKey> = {
  idle: 'hud.autowalk.idle',
  finding: 'hud.autowalk.finding',
  walking: 'hud.autowalk.walking',
  arrived: 'hud.autowalk.arrived',
  failed: 'hud.autowalk.failed',
};

/**
 * The card folds itself away after this long without a touch (owner, 03/10/2026: "10–15 s"), counted from when the
 * map is up (owner, 07/10/2026): on a slow device the loading screen would otherwise eat most of it.
 */
export const TRACKER_FOLD_MS = 12_000;

/**
 * The quest card. While the step's target stands on this map, tapping the card walks the character there
 * along the ways (the game finds the route), and tapping it again stops her. It folds to a small "Nhiệm vụ"
 * pill with its "Thu gọn" button or after TRACKER_FOLD_MS untouched, opens again on a tap of the pill, and
 * opens by itself when the quest moves to another step.
 */
export function QuestTracker({ quest, data }: { quest: QuestSummary | null; data: PlayerData }) {
  const store = useGameStore();
  const { t } = useT();
  const available = useGameState((s) => s.autowalkAvailable);
  const ready = useGameState((s) => s.status === 'ready');
  const autowalk = useGameState((s) => s.autowalk);
  const stepKey = quest ? `${quest.quest.id}:${nextStep(quest)?.id ?? 'done'}` : null;
  /** The step the card was folded at: folded only while the quest is still on that step, so a new step shows it again. */
  const [foldedAt, setFoldedAt] = useState<string | null>(null);
  const folded = stepKey !== null && foldedAt === stepKey;
  const setFolded = (value: boolean): void => setFoldedAt(value ? stepKey : null);
  /** Bumped by every touch on the card: restarts the countdown to folding. */
  const [touched, setTouched] = useState(0);
  useEffect(() => {
    if (folded || !stepKey || !ready) return;
    const timer = window.setTimeout(() => setFoldedAt(stepKey), TRACKER_FOLD_MS);
    return () => window.clearTimeout(timer);
  }, [folded, stepKey, touched, ready]);
  if (!quest) return null;
  const step = nextStep(quest);
  const { done, total } = stepProgress(quest);
  const clues = step ? searchCount(step, quest.progress) : null;
  const textbook = textbookOf(quest);
  const going = autowalk === 'finding' || autowalk === 'walking';
  const tappable = Boolean(step) && (available || going);
  const toggle = (): void => store.send({ type: going ? 'autowalk-stop' : 'autowalk-start' });
  if (folded) {
    return (
      <button type="button" className="hud-tracker-pill" data-id="hud-tracker-pill" aria-label={t('hud.openCurrent')} onClick={() => setFolded(false)}>
        <Icon name="scroll" size={24} />
        <T k="common.quests" />
        <span className="hud-tracker-pill-count">
          {done}/{total}
        </span>
        {going ? <Icon name="runningShoe" size={20} /> : null}
      </button>
    );
  }
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggle();
  };
  return (
    <section
      className="hud-tracker"
      aria-label={t('hud.current')}
      data-id="hud-tracker"
      data-autowalk={tappable ? autowalk : undefined}
      onPointerDown={() => setTouched((n) => n + 1)}
      {...(tappable ? { role: 'button', tabIndex: 0, 'aria-pressed': going, onClick: toggle, onKeyDown: onKey } : {})}
    >
      <p className="hud-tracker-kicker">
        <Icon name="scroll" size={24} />
        <T k="hud.current" />
        <button
          type="button"
          className="hud-tracker-fold"
          data-id="hud-tracker-fold"
          aria-label={t('hud.fold')}
          onClick={(event) => {
            // Folding is not a tap on the card (that starts or stops the walk).
            event.stopPropagation();
            setFolded(true);
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          ▲
        </button>
      </p>
      <p className="hud-tracker-quest" data-id="hud-tracker-quest">
        <Say text={titleOf(quest.quest)} fill={(line) => say(line, data.character)} />
      </p>
      {textbook ? <TextbookRef textbook={textbook} dataId="hud-tracker-textbook" compact /> : null}
      <p className="hud-tracker-step" data-id="hud-tracker-step">
        {/* Where to walk while the step waits somewhere else; its title heads the scene once there. */}
        {step ? <Say text={stepLineOf(step)} fill={(line) => say(line, data.character)} /> : <T k="hud.done" />}
        {clues ? (
          <span className="hud-tracker-count" data-id="hud-tracker-count">
            {' '}
            {clues.found}/{clues.total}
          </span>
        ) : null}
      </p>
      <p className="hint" data-id="hud-tracker-progress">
        {done}/{total}
      </p>
      {tappable || autowalk === 'arrived' || autowalk === 'failed' ? (
        <p className="hud-autowalk" data-id="hud-autowalk" data-state={autowalk} aria-live="polite">
          <Icon name={autowalk === 'arrived' ? 'glowingStar' : autowalk === 'failed' ? 'map' : 'runningShoe'} size={20} />
          <T k={AUTOWALK_LINE[autowalk]} />
        </p>
      ) : null}
    </section>
  );
}

/** Shown only while a target is in reach; the game handles E / tap on the label the same way. */
function InteractButton() {
  const store = useGameStore();
  const prompt = useGameState((s) => s.prompt);
  if (!prompt) return null;
  return (
    <button type="button" className="hud-interact" data-id="hud-interact" onClick={() => store.send({ type: 'interact' })}>
      <Icon name="sparkles" size={32} />
      <T k="hud.interact" />
    </button>
  );
}

/** Only while Miu is stuck (water, or the stick gets her nowhere): puts her back where she last stood safely. */
function RescueButton() {
  const store = useGameStore();
  const stuck = useGameState((s) => s.stuck);
  if (!stuck) return null;
  return (
    <button type="button" className="hud-rescue" data-id="hud-rescue" onClick={() => store.send({ type: 'rescue' })}>
      <Icon name="ringBuoy" size={36} />
      <T k="hud.rescue" />
    </button>
  );
}

export function Hud({
  data,
  quest,
  covered = false,
  onMenu,
  onQuests,
  onBackpack,
  children,
}: {
  data: PlayerData;
  quest: QuestSummary | null;
  /** A screen covers the game: the whole HUD steps aside, so nothing of it shows through or under that screen. */
  covered?: boolean;
  onMenu: () => void;
  /** Opens this map's quest board over the game: every quest can be taken from there. */
  onQuests: () => void;
  onBackpack: () => void;
  /** More of the left column under the quest card (the online party frame). */
  children?: ReactNode;
}) {
  const { t } = useT();
  const store = useGameStore();
  if (covered) return null;
  // The prompt label over the world hides while it would sit under these panels (the game reads their boxes).
  const avoid = (key: string) => (el: HTMLElement | null) => {
    store.setPromptAvoid(key, el);
    return () => store.setPromptAvoid(key, null);
  };
  return (
    <>
      <div className="hud-top-left" ref={avoid('hud-left')}>
        <PlayerBadge character={data.character} progress={data.progress} />
        <QuestTracker quest={quest} data={data} />
        {children}
      </div>
      <nav className="hud-top-right" aria-label={t('hud.menuLabel')} ref={avoid('hud-right')}>
        <button type="button" className={buttonClass('secondary', { small: true })} data-id="hud-quests" onClick={onQuests}>
          <Icon name="scroll" size={28} />
          <span className="hud-btn-label">
            <T k="common.quests" />
          </span>
        </button>
        <Link to="/map" className={buttonClass('secondary', { small: true })} data-id="hud-map">
          <Icon name="map" size={28} />
          <span className="hud-btn-label">
            <T k="common.map" />
          </span>
        </Link>
        <button type="button" className={buttonClass('secondary', { small: true })} data-id="hud-backpack" onClick={onBackpack}>
          <Icon name="backpack" size={28} />
          <span className="hud-btn-label">
            <T k="common.backpack" />
          </span>
        </button>
        <button type="button" className={buttonClass('primary', { small: true })} data-id="hud-menu" onClick={onMenu}>
          <Icon name="pause" size={28} />
          <span className="hud-btn-label">
            <T k="common.menu" />
          </span>
        </button>
      </nav>
      <InteractButton />
      <RescueButton />
      <RideButton />
    </>
  );
}
