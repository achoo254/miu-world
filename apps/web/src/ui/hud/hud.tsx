// M3.2 HUD over the forest: player badge (level, XP, coins from the server), "Nhiệm vụ hiện tại",
// the Quests / Map / Backpack / Menu buttons, and the Interact button next to Run and Jump. Nothing
// here changes per frame: the prompt arrives as a discrete bridge event.
import { Link } from 'react-router';
import type { QuestSummary } from '@miu/schema/game';
import { useGameState, useGameStore } from '../../game-bridge/use-game-state';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { PlayerBadge } from '../player/player-badge';
import { nextStep, say, stepProgress, type PlayerData } from '../player/player-data';
import { searchCount } from '../quest/quest-flow';
import './hud.css';

export function QuestTracker({ quest, data }: { quest: QuestSummary | null; data: PlayerData }) {
  if (!quest) return null;
  const step = nextStep(quest);
  const { done, total } = stepProgress(quest);
  const clues = step ? searchCount(step, quest.progress) : null;
  return (
    <section className="hud-tracker" aria-label="Nhiệm vụ hiện tại" data-id="hud-tracker">
      <p className="hud-tracker-kicker">
        <Icon name="scroll" size={24} />
        Nhiệm vụ hiện tại
      </p>
      <p className="hud-tracker-quest" data-id="hud-tracker-quest">
        {say(quest.quest.title, data.character)}
      </p>
      <p className="hud-tracker-step" data-id="hud-tracker-step">
        {/* Where to walk while the step waits somewhere else; its title heads the scene once there. */}
        {step ? say(step.goTo ?? step.title, data.character) : 'Đã hoàn thành'}
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
      Tương tác
    </button>
  );
}

export function Hud({
  data,
  quest,
  covered = false,
  onMenu,
  onBackpack,
}: {
  data: PlayerData;
  quest: QuestSummary | null;
  /** A screen covers the paused game: Interact would only show through its backdrop. */
  covered?: boolean;
  onMenu: () => void;
  onBackpack: () => void;
}) {
  return (
    <>
      <div className="hud-top-left">
        <PlayerBadge character={data.character} progress={data.progress} />
        <QuestTracker quest={quest} data={data} />
      </div>
      <nav className="hud-top-right" aria-label="Menu trò chơi">
        <Link to={quest ? `/region/${quest.quest.region}` : '/map'} className={buttonClass('secondary', { small: true })} data-id="hud-quests">
          <Icon name="scroll" size={28} />
          <span className="hud-btn-label">Nhiệm vụ</span>
        </Link>
        <Link to="/map" className={buttonClass('secondary', { small: true })} data-id="hud-map">
          <Icon name="map" size={28} />
          <span className="hud-btn-label">Bản đồ</span>
        </Link>
        <button type="button" className={buttonClass('secondary', { small: true })} data-id="hud-backpack" onClick={onBackpack}>
          <Icon name="backpack" size={28} />
          <span className="hud-btn-label">Ba lô</span>
        </button>
        <button type="button" className={buttonClass('primary', { small: true })} data-id="hud-menu" onClick={onMenu}>
          <Icon name="pause" size={28} />
          <span className="hud-btn-label">Menu</span>
        </button>
      </nav>
      {covered ? null : <InteractButton />}
    </>
  );
}
