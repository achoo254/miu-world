// NEW SCREEN (minigame side quests, owner 03/10/2026): a minigame over the paused 3D game, in the quest
// scenes' materials (mock "quest screens": wooden banner, parchment). How-to card with one big "Chơi" →
// 3-2-1 → play (HUD: score/goal, clock, hearts, pause) → result card with stars, the reward the server paid
// and "Chơi lại" / "Xong". The round itself runs in MinigameStage; this component only moves between screens.
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { MinigameParams } from '@miu/schema/content';
import type { StepCompleteResponse } from '@miu/schema/game';
import type { MinigameSpec } from '@miu/schema/minigame';
import { freshPicker } from '@miu/quest/pick-fresh';
import { fillPlayerName } from '@miu/quest/player-name';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { StarRating } from '../kit/star-rating';
import { assetUrl } from '../kit/ui-art';
import { playCue } from '../sound/sfx';
import type { MinigameModule } from './define-minigame';
import { MinigameStage, type StageHud } from './minigame-stage';
import { loadMinigame, MINIGAME_SPECS } from './registry';
import { randomSeed } from './rng';
import { roundParams, starsFor } from './round';
import { loadSprites } from './sprite-sheet';
import { SPRITE_PATHS, type SpriteName, type Sprites } from './sprites';
import { themeFor, type Theme } from './theme';
import './minigame.css';

/** What the server paid for a won round (side quests), shown on the result card. */
export interface WinOutcome {
  reward: StepCompleteResponse['reward'];
  /** The new level when this win levelled the child up. */
  levelUp: number | null;
}

/** The child's character as a picture, by species (content/species.json). */
const PLAYER_SPRITES: Readonly<Record<string, SpriteName>> = { cat: 'cat', rabbit: 'rabbit', fox: 'fox', bear: 'bear' };
const CONTROL_WORDS: Readonly<Record<MinigameSpec['controls'][number], string>> = { tap: 'Chạm', drag: 'Kéo', swipe: 'Vuốt', hold: 'Giữ' };
const COUNTDOWN = ['3', '2', '1', 'Chơi!'] as const;
const COUNT_MS = 700;

const WIN_LINES = ['Giỏi quá {name} ơi!', 'Tuyệt vời, {name} thắng rồi!', 'Hoan hô {name}!', '{name} làm được rồi nè!', 'Quá đỉnh luôn {name}!'];
const LOSE_LINES = ['Suýt nữa thôi {name}, thử lại nhé!', 'Gần tới đích rồi, chơi lại nào!', 'Không sao đâu {name}, lần sau sẽ được!', '{name} cố gắng lắm rồi, thêm một lần nhé!', 'Mình làm lại cho vui nào {name}!'];

const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

type Phase = 'loading' | 'intro' | 'countdown' | 'playing' | 'paused' | 'result';

interface Result {
  score: number;
  won: boolean;
  line: string;
}

type Payout = { state: 'none' } | { state: 'sending' } | { state: 'paid'; outcome: WinOutcome } | { state: 'failed' };

function SpriteIcon({ name, size = 28 }: { name: SpriteName; size?: number }) {
  return <img className="icon" src={assetUrl(SPRITE_PATHS[name])} width={size} height={size} alt="" draggable={false} />;
}

export interface MinigameOverlayProps {
  /** A game of content/minigames. */
  game: string;
  goal: number;
  params?: MinigameParams;
  /** The map it is played on: picks the background colours. */
  region?: string | null;
  /** The child's character name (fills `{name}`) and species (her picture in the game). */
  playerName: string;
  species?: string;
  /** What the quest's character asks, shown on the how-to card. */
  prompt?: string;
  /** A won round's score goes to the server here; resolve with what it paid, or null when it could not be sent. */
  onWin?: (score: number) => Promise<WinOutcome | null>;
  /** "Xong" or ✕: the last round's result, or null when no round finished. */
  onDone: (result: { score: number; won: boolean } | null) => void;
  /** Dev page: the game's bot plays, and the how-to card is skipped. */
  bot?: boolean;
  /** Dev page and tests: the first round's seed. */
  seed?: number;
  /** Dev page screenshots: the first round stops once this many seconds are played. */
  freezeAt?: number;
}

export function MinigameOverlay({ game, goal, params = {}, region, playerName, species, prompt, onWin, onDone, bot = false, seed, freezeAt }: MinigameOverlayProps): ReactElement {
  const spec = MINIGAME_SPECS.get(game);
  const [phase, setPhase] = useState<Phase>('loading');
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);
  const [count, setCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [payout, setPayout] = useState<Payout>({ state: 'none' });
  const [lives, setLives] = useState<number | null>(null);
  const [frozen, setFrozen] = useState(false);
  const loaded = useRef<{ module: MinigameModule; sprites: Sprites; theme: Theme } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<MinigameStage | null>(null);
  const hud = useRef<StageHud>({ score: null, time: null, lives: null });
  const pickers = useRef({ win: freshPicker(WIN_LINES), lose: freshPicker(LOSE_LINES) });
  const latest = useRef({ onWin, onDone, result });
  useEffect(() => {
    latest.current = { onWin, onDone, result };
  });
  const fill = useCallback((text: string) => fillPlayerName(text, playerName), [playerName]);

  // Load the game's code and pictures once.
  useEffect(() => {
    let live = true;
    const theme = themeFor(region);
    loadMinigame(game)
      .then(async (module) => {
        const sprites = await loadSprites([...module.sprites, ...Object.values(PLAYER_SPRITES)], theme.light);
        if (!live) return;
        loaded.current = { module, sprites, theme };
        setPhase(bot ? 'countdown' : 'intro');
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [game, region, bot]);

  // One stage per round (a replay starts from a fresh one with a new seed).
  useEffect(() => {
    const parts = loaded.current;
    if (phase === 'loading' || !parts || !host.current || !spec) return;
    if (stage.current) return;
    const created = new MinigameStage({
      host: host.current,
      module: parts.module,
      goal,
      duration: spec.duration,
      params: roundParams(spec, params),
      seed: round === 0 && seed !== undefined ? seed : randomSeed(),
      theme: parts.theme,
      sprites: parts.sprites,
      player: PLAYER_SPRITES[species ?? ''] ?? 'cat',
      reducedMotion: reducedMotion(),
      hud: hud.current,
      bot,
      ...(round === 0 && freezeAt !== undefined ? { freezeAt, onFreeze: () => setFrozen(true) } : {}),
      onFinish: ({ score, won }) => {
        playCue(won ? 'complete' : 'wrong');
        setResult({ score, won, line: fill((won ? pickers.current.win : pickers.current.lose).next()) });
        setPhase('result');
      },
    });
    stage.current = created;
    setLives(created.lives);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a stage is made once per round; later prop changes do not rebuild it
  }, [phase, round]);
  useEffect(
    () => () => {
      stage.current?.dispose();
      stage.current = null;
    },
    [],
  );

  // 3, 2, 1, Chơi! then the round runs.
  useEffect(() => {
    if (phase !== 'countdown') return;
    playCue('tap');
    const timer = window.setTimeout(() => {
      if (count + 1 < COUNTDOWN.length) {
        setCount(count + 1);
        return;
      }
      stage.current?.start();
      setPhase('playing');
    }, COUNT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, count]);

  const pause = useCallback(() => {
    stage.current?.pause();
    setPhase((p) => (p === 'playing' ? 'paused' : p));
  }, []);
  // A hidden tab (another app, the iPad locked) pauses the round; so does Esc.
  useEffect(() => {
    if (phase !== 'playing') return;
    const onHide = (): void => {
      if (document.visibilityState === 'hidden') pause();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') pause();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', pause);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', pause);
      window.removeEventListener('keydown', onKey);
    };
  }, [phase, pause]);

  // A won round is sent once; the card shows what the server paid.
  const send = useCallback(async (score: number) => {
    const handler = latest.current.onWin;
    if (!handler) return;
    setPayout({ state: 'sending' });
    const outcome = await handler(score);
    setPayout(outcome ? { state: 'paid', outcome } : { state: 'failed' });
  }, []);
  useEffect(() => {
    if (phase === 'result' && result?.won && payout.state === 'none') void send(result.score);
  }, [phase, result, payout.state, send]);

  const begin = (): void => {
    setCount(0);
    setPhase('countdown');
  };
  const again = (): void => {
    stage.current?.dispose();
    stage.current = null;
    setResult(null);
    setPayout({ state: 'none' });
    setRound((n) => n + 1);
    begin();
  };
  const leave = (): void => latest.current.onDone(latest.current.result ? { score: latest.current.result.score, won: latest.current.result.won } : null);

  const title = spec?.name ?? 'Trò chơi';
  const covered = phase === 'intro' || phase === 'paused' || phase === 'result';
  return (
    <div className="minigame" data-id="minigame" data-game={game} data-phase={phase} data-frozen={frozen || undefined}>
      <div className="minigame-stage" ref={host} aria-hidden={covered} />
      {phase === 'countdown' || phase === 'playing' || phase === 'paused' ? (
        <div className="minigame-hud" data-id="minigame-hud">
          <span className="minigame-chip" data-id="minigame-score">
            <Icon name="glowingStar" size={30} />
            <b
              ref={(el) => {
                hud.current.score = el;
              }}
            >
              0/{goal}
            </b>
          </span>
          <span className="minigame-chip" data-id="minigame-time">
            <SpriteIcon name="stopwatch" />
            <b
              ref={(el) => {
                hud.current.time = el;
              }}
            />
          </span>
          {lives !== null ? (
            <span className="minigame-chip" data-id="minigame-lives" aria-label="Lượt còn lại">
              <Icon name="heart" size={28} />
              <b
                ref={(el) => {
                  hud.current.lives = el;
                }}
              >
                {lives}
              </b>
            </span>
          ) : null}
          <button type="button" className="minigame-pause" data-id="minigame-pause" aria-label="Tạm dừng" onClick={pause} disabled={phase !== 'playing'}>
            <Icon name="pause" size={34} />
          </button>
        </div>
      ) : null}
      {phase === 'countdown' && count < COUNTDOWN.length ? (
        <div className="minigame-countdown" key={count} aria-live="assertive" data-id="minigame-countdown">
          {COUNTDOWN[count]}
        </div>
      ) : null}
      {phase === 'loading' ? (
        <div className="minigame-loading" role="status" data-id="minigame-loading">
          {failed ? (
            <>
              <p>Chưa mở được trò chơi.</p>
              <button type="button" className={buttonClass('primary')} onClick={leave}>
                Quay lại
              </button>
            </>
          ) : (
            <p>Đang chuẩn bị trò chơi…</p>
          )}
        </div>
      ) : null}
      {phase === 'intro' && spec ? (
        <Modal title={title} onClose={leave} dataId="minigame-intro" variant="scene">
          <div className="parchment minigame-howto">
            {prompt ? <p className="minigame-prompt">{fill(prompt)}</p> : null}
            <ul>
              {spec.howTo.map((line) => (
                <li key={line}>{fill(line)}</li>
              ))}
            </ul>
            <p className="minigame-goal">
              <Icon name="glowingStar" size={28} /> Mục tiêu: {goal} điểm trong {spec.duration} giây
            </p>
            <p className="minigame-controls">
              {spec.controls.map((c) => (
                <span key={c} className="scene-chip">
                  {CONTROL_WORDS[c]}
                </span>
              ))}
            </p>
          </div>
          <button type="button" className={`${buttonClass('primary', { block: true })} minigame-play`} data-id="minigame-start" onClick={begin}>
            Chơi
          </button>
          <button type="button" className="scene-close" data-id="minigame-close" aria-label="Thoát trò chơi" onClick={leave}>
            ✕
          </button>
        </Modal>
      ) : null}
      {phase === 'paused' ? (
        <Modal
          title="Tạm dừng"
          onClose={() => {
            stage.current?.resume();
            setPhase('playing');
          }}
          dataId="minigame-paused"
          variant="scene"
        >
          <div className="minigame-actions">
            <button
              type="button"
              className={buttonClass('primary', { block: true })}
              data-id="minigame-resume"
              onClick={() => {
                stage.current?.resume();
                setPhase('playing');
              }}
            >
              Chơi tiếp
            </button>
            <button type="button" className={buttonClass('ghost', { block: true })} data-id="minigame-quit" onClick={leave}>
              Thoát
            </button>
          </div>
        </Modal>
      ) : null}
      {phase === 'result' && result ? (
        <Modal title={result.won ? 'Thắng rồi!' : 'Hết giờ!'} onClose={leave} dataId="minigame-result" variant="scene">
          <div className="parchment minigame-result" data-won={result.won}>
            <StarRating stars={starsFor(result.score, goal)} size={56} dataId="minigame-stars" />
            <p className="minigame-score" data-id="minigame-final-score">
              {result.score}
              <small> điểm · mục tiêu {goal}</small>
            </p>
            <p className="minigame-line">{result.line}</p>
            {result.won ? <Payout payout={payout} onRetry={() => void send(result.score)} /> : null}
          </div>
          <div className="minigame-actions minigame-actions--row">
            <button type="button" className={buttonClass('secondary', { block: true })} data-id="minigame-again" onClick={again} disabled={payout.state === 'sending'}>
              Chơi lại
            </button>
            <button type="button" className={buttonClass('primary', { block: true })} data-id="minigame-done" onClick={leave} disabled={payout.state === 'sending'}>
              Xong
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

/** The server's reward for a won round: every win pays (owner, 03/10/2026). */
function Payout({ payout, onRetry }: { payout: Payout; onRetry: () => void }) {
  if (payout.state === 'none') return null;
  if (payout.state === 'sending') return <p className="minigame-payout" role="status">Đang nhận thưởng…</p>;
  if (payout.state === 'failed') {
    return (
      <p className="minigame-payout" role="alert">
        Chưa gửi được điểm.{' '}
        <button type="button" className={buttonClass('ghost', { small: true })} data-id="minigame-retry" onClick={onRetry}>
          Gửi lại
        </button>
      </p>
    );
  }
  const { reward, levelUp } = payout.outcome;
  if (!reward) return null;
  return (
    <p className="minigame-payout" data-id="minigame-reward">
      {reward.xp > 0 ? (
        <span className="scene-chip">
          <Icon name="sparkles" size={24} /> +{reward.xp} XP
        </span>
      ) : null}
      {reward.coin > 0 ? (
        <span className="scene-chip">
          <Icon name="coin" size={24} /> +{reward.coin} xu
        </span>
      ) : null}
      {levelUp ? (
        <span className="scene-chip minigame-level" data-id="minigame-level-up">
          <SpriteIcon name="trophy" size={24} /> Lên cấp {levelUp}!
        </span>
      ) : null}
    </p>
  );
}
