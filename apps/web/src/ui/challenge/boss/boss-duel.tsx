// M3.10 Friendly Boss Battle Screen, played as a duel (NEW SCREEN for the play moves, owner 07/10/2026: "tương tác chơi
// thay vì giống như làm nhiệm vụ chính"). When the game stages the fight in the running world (game-bridge `duel`:
// `staged`), the boss stands there for real: its name and HP over the top, the answers round it as things to play at,
// the question on a compact card at the bottom. Otherwise (`unavailable`, no game) the same fight shows as a card over
// the paused game, its answers laid out still. Each question is answered with its play move (content `move`: ném bùa,
// chạm cầu, kéo ngọc, nạp chiêu); there is no clock. The server decides every blow: right or wrong, the boss's HP, its
// line; a right blow lands (a beat of up to 1.2 s in the world, tap to skip) before its "copy into the vở" card. Each
// question keeps its three support layers (Hướng dẫn, Gợi ý, Đáp án); seeing the answer never stops the fight.
import { useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import type { DuelMove, QuestStepPublic } from '@miu/schema/content';
import type { NotebookLine, StepAnswer } from '@miu/schema/game';
import { GameStoreContext } from '../../../game-bridge/use-game-state';
import { linesOf, mapBoth, pairOf, type Bilingual, type LinesKey } from '../../i18n/i18n';
import { Bi, T, useT } from '../../i18n/use-t';
import { buttonClass } from '../../kit/button';
import { Modal } from '../../kit/modal';
import { twin } from '../../quest/content-text';
import { playCue } from '../../sound/sfx';
import type { ChallengeContext } from '../challenge-frame';
import { Illustration } from '../illustrations/illustration';
import { SupportPanel } from '../support-panel';
import { BossHud } from './boss-hud';
import { duelCalm } from './duel-calm';
import { ChargeMove } from './moves/charge-move';
import { FlingMove } from './moves/fling-move';
import { GemMove } from './moves/gem-move';
import type { MoveProps, ScreenPoint } from './moves/move-target';
import { OrbsMove } from './moves/orbs-move';
import '../challenge.css';
import './boss-duel.css';
import './moves/moves.css';

type BossStep = Extract<QuestStepPublic, { kind: 'boss' }>;

/** The server's word on a blow, as the fight needs it. */
export interface BossBlow {
  correct: boolean;
  /** This blow beat the boss. */
  won: boolean;
  /** The question and the book's answer to copy into the vở (a right answer). */
  copy: NotebookLine | null;
}

/** How long a blow that lands plays in the world before its vở card (tap to skip), and the boss bowing out. */
export const HIT_BEAT_MS = 1100;
export const WIN_BEAT_MS = 1800;

const MOVES: Record<DuelMove, (props: MoveProps) => ReactElement> = { fling: FlingMove, orbs: OrbsMove, gem: GemMove, charge: ChargeMove };
/** How each move is played, said three ways (a fresh one each question). */
const GUIDES: Record<DuelMove, LinesKey> = { fling: 'boss.move.fling', orbs: 'boss.move.orbs', gem: 'boss.move.gem', charge: 'boss.move.charge' };
const noStore = (): (() => void) => () => undefined;
/** One rotation of guide lines per move for the whole visit: a fight's screen comes and goes with each vở card. */
const GUIDE_PICKERS = new Map<DuelMove, FreshPicker<Bilingual>>();
function guideFor(move: DuelMove): Bilingual {
  let picker = GUIDE_PICKERS.get(move);
  if (!picker) {
    picker = freshPicker(linesOf(GUIDES[move]));
    GUIDE_PICKERS.set(move, picker);
  }
  return picker.next();
}

export function BossDuel({
  step,
  context,
  bossState,
  line = null,
  turnTries = {},
  turnOf = null,
  onAnswer,
  onRight,
  onWon,
  onClose,
}: {
  step: BossStep;
  context: ChallengeContext;
  bossState?: { hp: number; answered: string[] };
  /** What the boss said after the last answer (the server's line), if anything. */
  line?: Bilingual | null;
  /** Wrong tries on each question so far: its support layers open step by step. */
  turnTries?: Readonly<Record<string, number>>;
  /** Played with the party: whose blow it is (null: alone, every blow hers). */
  turnOf?: { mine: boolean; who: string } | null;
  /** Sends the blow to the server; null when no answer came back (offline, not her turn). */
  onAnswer: (answer: StepAnswer) => Promise<BossBlow | null>;
  /** A right blow's line to copy into the vở, once the blow has landed. */
  onRight?: (copy: NotebookLine) => void;
  /** The winning blow has played out (the quest goes on to its reward). */
  onWon?: () => void;
  onClose: () => void;
}): ReactElement {
  const { t } = useT();
  const store = useContext(GameStoreContext);
  const staged = useSyncExternalStore(store?.subscribe ?? noStore, () => store?.getSnapshot().duel === 'staged');
  const [calm] = useState(duelCalm);
  const mode = staged ? 'stage' : 'card';
  const [aimed, setAimed] = useState<string | null>(null);
  const [bounced, setBounced] = useState<string | null>(null);
  /** A right blow playing out in the world, and the question it answered (still shown until its vở card). */
  const [beat, setBeat] = useState<{ blow: BossBlow; turn: string } | null>(null);
  const mounted = useRef(true);
  /** Questions she struck at herself: any other question answered was a party member's blow. */
  const mine = useRef(new Set<string>());

  const answered = bossState?.answered ?? [];
  const hp = bossState?.hp ?? step.maxHp;
  const defeated = hp <= 0 || answered.length >= step.turns.length;
  const fought = step.turns.find((x) => !answered.includes(x.id)) ?? step.turns[0];
  const turn = beat ? (step.turns.find((x) => x.id === beat.turn) ?? fought) : fought;
  const fill = (pair: Bilingual): Bilingual => mapBoth(pair, context.fill);
  const winLine = fill(twin(step.winDialogue, step.en?.winDialogue));
  const move = turn?.move ?? 'fling';
  // A new line for each question (and only then), never the one the same move had last.
  const nextGuide = (): { turn: string | undefined; line: Bilingual } => ({ turn: turn?.id, line: guideFor(move) });
  const [guideOf, setGuideOf] = useState(nextGuide);
  if (guideOf.turn !== turn?.id) setGuideOf(nextGuide());
  const guide = guideOf.line;

  // Each blow that lands plays out; the vở card (and, the last, the reward) follow once it has.
  const finish = useRef<(blow: BossBlow) => void>(() => undefined);
  useEffect(() => {
    finish.current = (blow) => {
      if (mounted.current) {
        setBeat(null);
        setAimed(null);
      }
      if (blow.copy) onRight?.(blow.copy);
      if (blow.won) onWon?.();
    };
  }, [onRight, onWon]);
  const pending = useRef<BossBlow | null>(null);
  useEffect(() => {
    if (!beat) return;
    const { blow } = beat;
    pending.current = blow;
    const id = window.setTimeout(() => {
      pending.current = null;
      finish.current(blow);
    }, blow.won ? WIN_BEAT_MS : HIT_BEAT_MS);
    return () => window.clearTimeout(id);
  }, [beat]);
  const skipBeat = (): void => {
    const blow = pending.current;
    pending.current = null;
    if (blow) finish.current(blow);
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Put away mid-beat: the vở card still comes.
      const blow = pending.current;
      pending.current = null;
      if (blow) finish.current(blow);
    };
  }, []);

  // The HP a blow took floats up from the bar (hers or a party member's).
  const lastHp = useRef(hp);
  const [drop, setDrop] = useState<{ seq: number; amount: number } | null>(null);
  useEffect(() => {
    const fell = lastHp.current - hp;
    lastHp.current = hp;
    if (fell > 0) setDrop((d) => ({ seq: (d?.seq ?? 0) + 1, amount: fell }));
  }, [hp]);
  // A question answered that she did not strike at was a party member's blow: it lands on the boss too.
  const answeredKey = answered.join(' ');
  const seenAnswered = useRef(answeredKey);
  useEffect(() => {
    const before = new Set(seenAnswered.current.split(' '));
    seenAnswered.current = answeredKey;
    const theirs = answeredKey.split(' ').filter((id) => id !== '' && !before.has(id) && !mine.current.has(id));
    if (theirs.length > 0 && staged) store?.send({ type: 'duel-cue', cue: 'ally-hit' });
  }, [answeredKey, staged, store]);

  const send = (cue: 'hit' | 'miss' | 'win' | 'fizzle'): void => {
    if (staged) store?.send({ type: 'duel-cue', cue });
  };
  const pick = async (choiceId: string, at: ScreenPoint): Promise<void> => {
    if (!turn) return;
    setAimed(choiceId);
    setBounced(null);
    mine.current.add(turn.id);
    playCue('place');
    if (staged) store?.send({ type: 'duel-cue', cue: 'aim', to: at });
    const blow = await onAnswer({ turnId: turn.id, choice: choiceId });
    // A miss: if a party member answers this question after all, that blow is theirs. (No answer at all keeps it hers:
    // the offline banner may send it again.)
    if (blow && !blow.correct) mine.current.delete(turn.id);
    if (!blow) {
      send('fizzle');
      if (mounted.current) setAimed(null);
      return;
    }
    send(blow.correct ? (blow.won ? 'win' : 'hit') : 'miss');
    if (!mounted.current) {
      finish.current(blow);
      return;
    }
    if (!blow.correct) {
      setAimed(null);
      setBounced(choiceId);
    } else if (staged && !calm) {
      // The answer struck stays lit on its question while the blow lands.
      setBeat({ blow, turn: turn.id });
    } else {
      finish.current(blow);
    }
  };

  const notMine = turnOf !== null && !turnOf.mine;
  const locked = context.busy || aimed !== null || beat !== null || defeated || notMine;
  const said: Bilingual = defeated
    ? winLine
    : line
      ? fill(line)
      : context.tryAgain
        ? fill(context.tryAgain)
        : answered.length === 0
          ? fill(twin(step.introDialogue, step.en?.introDialogue))
          : pairOf('boss.keepGoing', { hp });
  const Move = MOVES[move];
  const close = (): void => {
    skipBeat();
    onClose();
  };

  return (
    <Modal
      title={<Bi {...context.title} />}
      onClose={close}
      dataId="boss-screen"
      placement="bottom"
      variant="scene"
      titleClass="ribbon"
      scrim={!staged}
      className={`boss-duel boss-duel--${mode}`}
    >
      <div className="boss-screen" data-id="boss-battle" data-mode={mode}>
        <BossHud step={step} hp={hp} answered={answered} current={defeated ? null : (turn?.id ?? null)} name={fill(twin(step.bossName, step.en?.bossName))} drop={drop} calm={calm} />
        <div className="boss-stage">
          {mode === 'card' ? (
            <div className="boss-avatar-wrap">
              {step.avatar ? <Illustration picture={step.avatar} /> : <span className="boss-avatar-icon" role="img" aria-hidden="true">{defeated ? '🥰' : '👾'}</span>}
            </div>
          ) : null}
          <p className="boss-bubble boss-bubble-line" data-id="boss-dialogue" aria-live="polite">
            <Bi {...said} />
          </p>
        </div>
        {defeated ? (
          <div className="boss-victory-box" data-id="boss-victory">
            <h3 className="boss-victory-title">
              <T k="boss.victory" />
            </h3>
            <button type="button" className={buttonClass('primary', { block: true })} onClick={close} data-id="boss-finish-btn">
              <T k="common.continue" />
            </button>
          </div>
        ) : turn ? (
          <div className="boss-turn-area" data-id={`turn-${turn.id}`}>
            <div className="boss-question-card">
              <p>
                <Bi {...fill(twin(turn.prompt, turn.en?.prompt))} />
              </p>
            </div>
            <Move key={turn.id} move={move} turn={turn} fill={context.fill} mode={mode} calm={calm} locked={locked} aimed={aimed} bounced={bounced} onPick={(id, at) => void pick(id, at)} />
            <p className="boss-move-guide" data-id="boss-move-guide">
              {notMine ? <T k="boss.turnOf" params={{ who: turnOf.who }} /> : <Bi {...fill(guide)} />}
            </p>
            <div className="parchment scene-bar" data-id="boss-bar">
              <SupportPanel key={turn.id} questId={context.questId} stepId={step.id} turnId={turn.id} fill={context.fill} wrongTries={turnTries[turn.id] ?? 0} />
            </div>
          </div>
        ) : null}
      </div>
      {beat ? <button type="button" className="boss-beat-skip" data-id="boss-beat-skip" aria-label={t('boss.skip')} onClick={skipBeat} /> : null}
      {/* Out of the fight at any time (its progress stays with the server); Esc does the same. */}
      <button type="button" className="scene-close boss-close" data-id="boss-close" aria-label={t('common.close')} onClick={close}>
        ✕
      </button>
    </Modal>
  );
}
