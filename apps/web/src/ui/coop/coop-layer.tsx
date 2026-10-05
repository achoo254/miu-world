// NEW SCREEN, after mock `designs/multiplayer.png` frames 4 ("Co-op Lobby") and 5 ("Chơi cùng bạn"): a co-op
// challenge over the paused game, as a themed scene. The lobby: the team with who is in, the challenge (how it is
// played, the team size, bot friends filling free places), the leader's start and its countdown; anyone may step out
// before it starts and loses nothing. The challenge: the team's places (whose turn, who is away, which bot plays for
// whom), the clues, questions, ropes or the boss's HP, what the host says after each answer with the line to copy
// into the vở, the three help layers, and stepping out. At the end, the reward screens with every question to copy,
// all from the server. Companion bots are always labelled.
import { useEffect, useState, type ReactNode } from 'react';
import type { CoopLobbyView, CoopStateView, CoopTaskView } from '@miu/schema/coop';
import type { QuestStepPublic } from '@miu/schema/content';
import type { CoopMessage, SocialStore } from '../../game-bridge/social-store';
import { linesOf, same, type Bilingual, type TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { MiuArt } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { BotBadge } from '../online/social-layer';
import { useSocial } from '../online/use-social';
import { say, type PlayerData } from '../player/player-data';
import { CompletionSequence } from '../rewards/completion-sequence';
import { Say, titleOf, twin } from '../quest/content-text';
import type { ActiveQuestView } from '../quest/quest-flow';
import '../challenge/challenge.css';
import './coop.css';

type CoopStepView = Extract<QuestStepPublic, { kind: 'coop' }>;

const coopStepOf = (quest: ActiveQuestView | undefined): CoopStepView | null => quest?.steps.find((s): s is CoopStepView => s.kind === 'coop') ?? null;

const MODE_KEY: Record<CoopStepView['mode'], TextKey> = {
  pieces: 'coop.mode.pieces',
  together: 'coop.mode.together',
  'team-boss': 'coop.mode.team-boss',
};

/** Re-renders every quarter second while `on` (countdowns, holds, the pause): discrete, never per frame. */
function useTicking(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [on]);
  return now;
}

function Portrait({ species }: { species: string }) {
  return (
    <span className="coop-portrait">
      <MiuArt pose="idle" species={species} />
    </span>
  );
}

/** How the challenge is played and the guide, from the quest (both languages, the player's name filled). */
function ChallengeCard({ quest, step, fill }: { quest: ActiveQuestView; step: CoopStepView; fill: (line: string) => string }) {
  return (
    <section className="coop-card parchment" data-id="coop-challenge">
      <p className="coop-card-title">
        <Say text={titleOf(quest)} fill={fill} />
      </p>
      <p className="coop-card-mode">
        <span className="badge">
          <T k={MODE_KEY[step.mode]} />
        </span>{' '}
        <span className="badge">
          <T k="coop.lobby.seats" params={{ seats: step.seats }} />
        </span>
      </p>
      <p className="coop-card-prompt">
        <Say text={twin(step.prompt, step.en?.prompt)} fill={fill} />
      </p>
      <details className="coop-guide" data-id="coop-guide">
        <summary>
          <T k="coop.guide" />
        </summary>
        <ol>
          {step.guide.map((line, i) => (
            <li key={line}>
              <Say text={twin(line, step.en?.guide[i])} fill={fill} />
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

function Lobby({ social, lobby, at, quest, selfId, fill }: { social: SocialStore; lobby: CoopLobbyView; at: number; quest: ActiveQuestView; selfId: string | null; fill: (line: string) => string }) {
  const { t } = useT();
  const counting = lobby.startsInMs !== null;
  const now = useTicking(counting);
  const step = coopStepOf(quest);
  if (!step) return null;
  const send = (message: CoopMessage) => social.send({ type: 'coop', message });
  const leader = lobby.leader === selfId;
  const me = lobby.members.find((m) => m.id === selfId);
  const seconds = counting ? Math.max(1, Math.ceil(((lobby.startsInMs ?? 0) - Math.max(0, now - at)) / 1000)) : 0;
  const players = lobby.members.filter((m) => !m.isBot).length;
  return (
    <Modal title={<T k="coop.lobby.title" />} onClose={() => send({ type: 'coop-leave' })} dataId="coop-lobby" variant="scene" size="wide">
      <button type="button" className="scene-close" data-id="coop-lobby-close" aria-label={t('coop.lobby.leave')} onClick={() => send({ type: 'coop-leave' })}>
        ✕
      </button>
      <div className="coop-lobby">
        <section className="coop-team parchment" aria-label={t('coop.lobby.team', { count: lobby.members.length, seats: lobby.seats })}>
          <p className="coop-team-title">
            <T k="coop.lobby.team" params={{ count: lobby.members.length, seats: lobby.seats }} />
          </p>
          <ul className="coop-team-list">
            {lobby.members.map((m) => (
              <li key={m.id} className="coop-team-member" data-id={`coop-lobby-member-${m.id}`} data-ready={m.ready}>
                <Portrait species={m.species} />
                <span className="coop-name">
                  <span className="coop-name-text">{m.id === selfId ? t('coop.you') : m.displayName}</span>
                  {m.isBot ? <BotBadge /> : null}
                  {m.id === lobby.leader ? (
                    <span className="coop-crown" role="img" aria-label={t('online.party.leader')}>
                      👑
                    </span>
                  ) : null}
                </span>
                <span className={`badge${m.ready ? '' : ' badge--warn'}`}>
                  <T k={m.ready ? 'coop.lobby.ready' : 'coop.lobby.notReady'} />
                </span>
              </li>
            ))}
          </ul>
          {lobby.botsFill > 0 ? (
            <p className="coop-note" data-id="coop-lobby-bots">
              🤖 <T k="coop.lobby.botsFill" params={{ count: lobby.botsFill }} />
            </p>
          ) : players === 1 && lobby.members.length < lobby.seats ? (
            <p className="coop-note">
              <T k="coop.lobby.alone" />
            </p>
          ) : null}
        </section>
        <ChallengeCard quest={quest} step={step} fill={fill} />
      </div>
      {counting ? (
        <p className="coop-countdown" role="status" data-id="coop-countdown">
          <T k="coop.lobby.countdown" params={{ seconds }} />
        </p>
      ) : null}
      <div className="coop-actions">
        {leader ? (
          <button type="button" className={buttonClass('primary')} data-id="coop-lobby-start" disabled={counting} onClick={() => send({ type: 'coop-start' })}>
            <T k="coop.lobby.start" />
          </button>
        ) : me && !me.ready ? (
          <button type="button" className={buttonClass('primary')} data-id="coop-lobby-ready" onClick={() => send({ type: 'coop-ready', ready: true })}>
            <T k="coop.lobby.imIn" />
          </button>
        ) : (
          <>
            <p className="coop-note">
              <T k="coop.lobby.waitLeader" />
            </p>
            <button type="button" className={buttonClass('ghost')} data-id="coop-lobby-unready" onClick={() => send({ type: 'coop-ready', ready: false })}>
              <T k="coop.lobby.notNow" />
            </button>
          </>
        )}
        <button type="button" className={buttonClass('ghost')} data-id="coop-lobby-leave" onClick={() => send({ type: 'coop-leave' })}>
          <T k="coop.lobby.leave" />
        </button>
      </div>
    </Modal>
  );
}

/** A question with its choices; answered only when it is hers to answer. */
function Question({ task, enabled, send, fill, dataId }: { task: CoopTaskView; enabled: boolean; send: (message: CoopMessage) => void; fill: (line: string) => string; dataId: string }) {
  const { t } = useT();
  return (
    <div className="coop-question" data-id={dataId}>
      <p className="coop-question-prompt">
        <Say text={twin(task.prompt, task.en?.prompt)} fill={fill} />
      </p>
      <div className="choice-list">
        {task.choices.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className="choice"
            data-id={`coop-choice-${task.id}-${c.id}`}
            disabled={!enabled}
            onClick={() => send({ type: 'coop-act', action: { kind: 'answer', task: task.id, choice: c.id } })}
          >
            <Say text={twin(c.text, task.en?.choices[i])} fill={fill} />
          </button>
        ))}
      </div>
      {enabled ? (
        <div className="coop-help-row">
          <button type="button" className={buttonClass('ghost', { small: true })} data-id="coop-help-hint" onClick={() => send({ type: 'coop-help', task: task.id, layer: 'hint' })}>
            💡 {t('coop.hint')}
          </button>
          <button type="button" className={buttonClass('ghost', { small: true })} data-id="coop-help-answer" onClick={() => send({ type: 'coop-help', task: task.id, layer: 'answer' })}>
            📖 {t('coop.answer')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Seats({ state, nameOf, titleOfQuest }: { state: CoopStateView; nameOf: (id: string) => string; titleOfQuest: (id: string) => Bilingual }) {
  const { t } = useT();
  return (
    <ul className="coop-seats" aria-label={t('coop.lobby.team', { count: state.seats.length, seats: state.seats.length })}>
      {state.seats.map((seat) => {
        const turn = state.turn !== null && (state.turn === seat.id || state.turn === seat.standIn?.id);
        return (
          <li key={seat.id} className="coop-seat" data-id={`coop-seat-${seat.id}`} data-turn={turn} data-away={seat.away}>
            <Portrait species={seat.species} />
            <span className="coop-name">
              <span className="coop-name-text">{nameOf(seat.id)}</span>
              {seat.isBot ? <BotBadge /> : null}
            </span>
            {seat.away ? (
              <span className="badge badge--warn">
                <T k="coop.away" />
              </span>
            ) : null}
            {seat.greeting ? (
              <span className="coop-standin" data-id={`coop-greeting-${seat.id}`}>
                💬 <T k="coop.greeting" params={{ runs: seat.greeting.runs, quest: titleOfQuest(seat.greeting.lastQuestId) }} />
              </span>
            ) : null}
            {seat.standIn ? (
              <span className="coop-standin">
                🤖 <T k="coop.standIn" params={{ bot: same(seat.standIn.displayName) }} />
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Play({ social, state, at, quest, fill, titleOfQuest }: { social: SocialStore; state: CoopStateView; at: number; quest: ActiveQuestView; fill: (line: string) => string; titleOfQuest: (id: string) => Bilingual }) {
  const { t } = useT();
  const help = useSocial(social, (s) => s.coopHelp);
  const [leaving, setLeaving] = useState(false);
  const timed = state.status === 'paused' || state.holds.some((h) => h.msLeft > 0);
  const now = useTicking(timed);
  const elapsed = Math.max(0, now - at);
  const step = coopStepOf(quest);
  const send = (message: CoopMessage) => social.send({ type: 'coop', message });
  const self = state.self;
  const nameOf = (id: string): string => (id === self ? t('coop.you') : (state.seats.find((s) => s.id === id)?.displayName ?? state.seats.find((s) => s.standIn?.id === id)?.standIn?.displayName ?? id));
  const playing = state.status === 'playing';
  const myTurn = playing && state.turn === self;
  const allShared = state.pieces.every((p) => p.shared);
  const mine = state.seats.filter((s) => s.id === self || s.standIn?.id === self).map((s) => s.id);
  const myTasks = state.tasks.filter((x) => x.task !== null);
  const holding = (seat: string): number => Math.max(0, (state.holds.find((h) => h.seat === seat)?.msLeft ?? 0) - elapsed);
  const last = state.last;
  const line: Bilingual | null = last?.line ? twin(last.line, last.lineEn) : null;
  const title = step ? <Say text={titleOf(quest)} fill={fill} /> : <T k="coop.lobby.title" />;
  const body: ReactNode =
    state.mode === 'pieces' ? (
      <>
        <ul className="coop-pieces" data-id="coop-pieces">
          {state.pieces.map((p) => {
            const own = mine.includes(p.seat) || (p.text !== null && !p.shared);
            return (
              <li key={p.index} className="coop-piece" data-id={`coop-piece-${p.index}`} data-shared={p.shared}>
                {p.text !== null ? <Say text={twin(p.text, p.en)} fill={fill} /> : <T k="coop.pieces.hidden" params={{ who: same(nameOf(p.seat)) }} />}
                {own && !p.shared && p.text !== null ? (
                  <button type="button" className={buttonClass('secondary', { small: true })} data-id={`coop-share-${p.index}`} disabled={!playing} onClick={() => send({ type: 'coop-act', action: { kind: 'share', piece: p.index } })}>
                    <T k="coop.pieces.share" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {!allShared ? (
          <p className="coop-note">
            <T k="coop.pieces.waiting" />
          </p>
        ) : null}
        {state.task ? <Question task={state.task} enabled={myTurn && allShared} send={send} fill={fill} dataId="coop-question" /> : null}
      </>
    ) : state.mode === 'together' ? (
      <>
        {state.title ? (
          <p className="coop-card-title">
            <Say text={twin(state.title.text, state.title.en)} fill={fill} />
          </p>
        ) : null}
        <p className="coop-note">
          <T k="coop.together.rule" />
        </p>
        {myTasks.map((x) => (x.task ? <Question key={x.id} task={x.task} enabled={playing} send={send} fill={fill} dataId={`coop-task-${x.id}`} /> : null))}
        {myTasks.length === 0 && !state.tasks.some((x) => mine.includes(x.seat) && !x.done) ? (
          <p className="coop-note">
            <T k="coop.together.free" />
          </p>
        ) : null}
        <ul className="coop-ropes" data-id="coop-ropes">
          {state.seats.map((seat) => {
            const left = holding(seat.id);
            return (
              <li key={seat.id} className="coop-rope" data-id={`coop-rope-${seat.id}`} data-held={left > 0}>
                <span className="coop-name-text">{nameOf(seat.id)}</span>
                <span className="coop-rope-bar">
                  {left > 0 ? <span key={`${state.last?.seq ?? 0}`} className="coop-rope-fill" style={{ animationDuration: `${left}ms` }} /> : null}
                </span>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className={buttonClass('primary', { block: true })}
          data-id="coop-hold"
          disabled={!playing || myTasks.length > 0}
          onClick={() => send({ type: 'coop-act', action: { kind: 'hold' } })}
        >
          💪 <T k={myTasks.length > 0 ? 'coop.together.answerFirst' : 'coop.together.hold'} />
        </button>
      </>
    ) : (
      <>
        {state.boss ? (
          <div className="coop-boss" data-id="coop-boss">
            <p className="coop-card-title">
              <Bi vi={state.boss.name} en={state.boss.nameEn ?? state.boss.name} />
            </p>
            <div className="coop-hp" role="meter" aria-valuemin={0} aria-valuemax={state.boss.maxHp} aria-valuenow={state.boss.hp} aria-label={t('coop.boss.hp', { hp: state.boss.hp, max: state.boss.maxHp })} data-id="coop-boss-hp" data-hp={state.boss.hp}>
              <span className="coop-hp-fill" style={{ width: `${(100 * state.boss.hp) / state.boss.maxHp}%` }} />
            </div>
            <p className="coop-note">
              <T k="coop.boss.hp" params={{ hp: state.boss.hp, max: state.boss.maxHp }} />
            </p>
          </div>
        ) : null}
        {state.task ? <Question task={state.task} enabled={myTurn} send={send} fill={fill} dataId="coop-question" /> : null}
      </>
    );
  return (
    <Modal title={title} onClose={() => setLeaving(true)} dataId="coop-play" variant="scene" size="wide">
      <button type="button" className="scene-close" data-id="coop-play-close" aria-label={t('coop.leave')} onClick={() => setLeaving(true)}>
        ✕
      </button>
      <Seats state={state} nameOf={nameOf} titleOfQuest={titleOfQuest} />
      <p className="coop-status" role="status" data-id="coop-status">
        {state.status === 'done' ? (
          <T k="coop.won" />
        ) : state.status === 'paused' && state.waitingFor ? (
          <T k="coop.paused" params={{ who: same(state.waitingFor.displayName), seconds: Math.max(0, Math.ceil((state.waitingFor.msLeft - elapsed) / 1000)) }} />
        ) : state.mode !== 'together' && state.turn ? (
          state.turn === self ? (
            <T k="coop.turn.you" />
          ) : (
            <T k="coop.turn.other" params={{ who: same(nameOf(state.turn)) }} />
          )
        ) : (
          <T k="coop.round" params={{ round: Math.min(state.round + 1, state.rounds), rounds: state.rounds }} />
        )}
      </p>
      <div className="coop-board parchment">{body}</div>
      {last && (line || last.say || last.copy) ? (
        <div className="coop-last" data-id="coop-last" data-kind={last.kind}>
          {line ? (
            <p>
              <strong>{nameOf(last.by)}</strong>
              {state.seats.some((seat) => (seat.id === last.by && seat.isBot) || seat.standIn?.id === last.by) ? <BotBadge /> : null} ·{' '}
              <span className="coop-line">
                <Say text={line} fill={fill} />
              </span>
            </p>
          ) : null}
          {last.say ? (
            <p className="coop-bot-line" data-id="coop-bot-line">
              🤖 <strong>{nameOf(last.by)}</strong>:{' '}
              <span className="coop-line">
                <Bi {...(linesOf(`coop.botLines.${last.say.key}`)[last.say.variant] ?? same(''))} />
              </span>
            </p>
          ) : null}
          {last.copy ? (
            <p className="coop-copy" data-id="coop-copy">
              ✏️ <T k="coop.copy" />: {fill(last.copy.question)} — <strong>{fill(last.copy.answer)}</strong>
            </p>
          ) : null}
        </div>
      ) : null}
      {help && (help.task === state.task?.id || state.tasks.some((x) => x.task?.id === help.task)) ? (
        <div className="coop-help parchment" data-id={`coop-help-${help.layer}`}>
          <p>
            <Say text={twin(help.text, help.textEn)} fill={fill} />
          </p>
          {help.explanation ? (
            <p>
              <Say text={twin(help.explanation, help.explanationEn)} fill={fill} />
            </p>
          ) : null}
        </div>
      ) : null}
      {leaving ? (
        <div className="coop-actions" role="alertdialog">
          <p className="coop-note">
            <T k="coop.leaveConfirm" />
          </p>
          <button type="button" className={buttonClass('danger')} data-id="coop-leave-yes" onClick={() => send({ type: 'coop-leave' })}>
            <T k="coop.leaveYes" />
          </button>
          <button type="button" className={buttonClass('ghost')} onClick={() => setLeaving(false)}>
            <T k="common.cancel" />
          </button>
        </div>
      ) : (
        <div className="coop-actions">
          <button type="button" className={buttonClass('ghost', { small: true })} data-id="coop-leave" onClick={() => setLeaving(true)}>
            <T k="coop.leave" />
          </button>
        </div>
      )}
    </Modal>
  );
}

const END_KEY: Record<'left' | 'closed' | 'no-part' | 'failed', TextKey> = {
  left: 'coop.end.left',
  closed: 'coop.end.closed',
  'no-part': 'coop.end.noPart',
  failed: 'coop.end.failed',
};

/**
 * Every co-op screen over the game: the lobby, the challenge, its end. `onPaid`: the server paid her (her XP and coins
 * are read again); `onMap`: she wants the region's map after the reward.
 */
export function CoopLayer({ social, quests, data, onPaid, onMap }: { social: SocialStore; quests: ReadonlyMap<string, ActiveQuestView>; data: PlayerData; onPaid: () => void; onMap: (region: string) => void }) {
  const lobby = useSocial(social, (s) => s.coopLobby);
  const play = useSocial(social, (s) => s.coopState);
  const end = useSocial(social, (s) => s.coopEnd);
  const selfId = useSocial(social, (s) => s.selfId);
  const fill = (line: string): string => say(line, data.character);
  const paid = end?.result?.reward ?? null;
  useEffect(() => {
    if (paid) onPaid();
  }, [paid, onPaid]);
  const closeEnd = () => social.update({ coopEnd: null });
  if (end) {
    const quest = quests.get(end.questId);
    const result = end.result;
    if (end.reason === 'done' && result?.reward && result.completion && quest) {
      return (
        <CompletionSequence
          notebook={result.completion.notebook ?? []}
          completion={result.completion}
          reward={result.reward}
          quest={quest}
          data={data}
          onMap={() => {
            closeEnd();
            onMap(quest.region);
          }}
          onExplore={closeEnd}
        />
      );
    }
    const why = end.reason === 'done' ? (result?.unpaid ?? 'failed') : end.reason;
    return (
      <Modal title={<T k={end.reason === 'done' ? 'coop.won' : 'coop.lobby.title'} />} onClose={closeEnd} dataId="coop-end" variant="scene">
        <p className="coop-card-prompt parchment" data-reason={why}>
          <T k={END_KEY[why]} />
        </p>
        <button type="button" className={buttonClass('primary', { block: true })} data-id="coop-end-close" onClick={closeEnd}>
          <T k="common.close" />
        </button>
      </Modal>
    );
  }
  if (play) {
    const quest = quests.get(play.state.questId);
    return quest ? <Play key={play.state.questId} social={social} state={play.state} at={play.at} quest={quest} fill={fill} titleOfQuest={(id) => { const q = quests.get(id); return q ? titleOf(q) : same(id); }} /> : null;
  }
  if (lobby) {
    const quest = quests.get(lobby.lobby.questId);
    return quest ? <Lobby social={social} lobby={lobby.lobby} at={lobby.at} quest={quest} selfId={selfId} fill={fill} /> : null;
  }
  return null;
}
