// NEW SCREEN, after mock `designs/multiplayer.png` frames 3 and 5: a quest played by the party, under the party frame.
// The leader asks the party to play the quest on screen; a member gets the ask and joins (the map of that quest
// loads) or not now; while the party plays, who it waits for, whose boss blow it is, a cheer or a nudge towards the
// help layers (never an answer), and stepping out. Each member plays on her own screen, with her own progress.
import type { SocialStore } from '../../game-bridge/social-store';
import { same } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { buttonClass } from '../kit/button';
import { useSocial } from '../online/use-social';
import { say, type PlayerData } from '../player/player-data';
import { titleOf } from '../quest/content-text';
import './coop.css';

/** The quest's title as the player reads it, filled with her name. */
function questName(data: PlayerData, questId: string, lang: (pair: { vi: string; en: string }) => string): string {
  const quest = data.quests.find((q) => q.quest.id === questId)?.quest;
  return quest ? say(lang(titleOf(quest)), data.character) : questId;
}

export function PartyQuestCard({ social, data, questId, onPlay }: { social: SocialStore; data: PlayerData; questId: string | null; onPlay: (questId: string) => void }) {
  const { t, inline } = useT();
  const party = useSocial(social, (s) => s.party);
  const selfId = useSocial(social, (s) => s.selfId);
  const run = useSocial(social, (s) => s.partyQuest);
  if (!party || !selfId) return null;
  const send = (message: Parameters<SocialStore['send']>[0]) => social.send(message);
  const leader = party.leader === selfId;
  const me = run?.members.find((m) => m.id === selfId);
  const quest = questId ? data.quests.find((q) => q.quest.id === questId)?.quest : undefined;
  const playable = quest?.status === 'active' && (quest.category ?? 'main') !== 'side' && quest.category !== 'coop';
  if (!run || !me) {
    // The leader asks her party to play the quest on her screen.
    if (!leader || !questId || !playable || party.members.filter((m) => !m.isBot).length < 2) return null;
    return (
      <button type="button" className={`${buttonClass('secondary', { small: true })} party-quest-start`} data-id="party-quest-start" onClick={() => send({ type: 'party-quest', message: { type: 'party-quest-start', questId } })}>
        🤝 <T k="partyQuest.start" />
      </button>
    );
  }
  const title = questName(data, run.questId, inline);
  const leaderName = party.members.find((m) => m.id === run.leader)?.displayName ?? '…';
  if (!me.joined) {
    return (
      <section className="online-card parchment party-quest-card" data-id="party-quest-invite" role="alertdialog" aria-live="polite">
        <p className="online-card-text">
          ⭐ <T k="partyQuest.invite" params={{ who: same(leaderName), quest: same(title) }} />
        </p>
        <div className="online-card-actions">
          <button
            type="button"
            className={buttonClass('primary', { small: true })}
            data-id="party-quest-join"
            onClick={() => {
              send({ type: 'party-quest', message: { type: 'party-quest-join', questId: run.questId } });
              onPlay(run.questId);
            }}
          >
            <T k="partyQuest.join" />
          </button>
          <button type="button" className={buttonClass('ghost', { small: true })} data-id="party-quest-later" onClick={() => send({ type: 'party-quest', message: { type: 'party-quest-leave' } })}>
            <T k="partyQuest.later" />
          </button>
        </div>
      </section>
    );
  }
  const waiting = run.members.filter((m) => m.joined && m.waiting && m.id !== selfId);
  const turn = run.turn ? run.members.find((m) => m.id === run.turn) : undefined;
  return (
    <section className="online-card parchment party-quest-card" data-id="party-quest" aria-label={t('partyQuest.title', { quest: same(title) })}>
      <p className="online-card-text">
        🤝 <T k="partyQuest.title" params={{ quest: same(title) }} />
      </p>
      <ul className="party-quest-members">
        {run.members
          .filter((m) => m.joined)
          .map((m) => (
            <li key={m.id} data-id={`party-quest-member-${m.id}`} data-waiting={m.waiting}>
              {m.id === selfId ? t('coop.you') : m.displayName} · <T k="partyQuest.done" params={{ done: m.done }} />
              {m.waiting ? ' ⏳' : ''}
            </li>
          ))}
      </ul>
      {waiting.length > 0 ? (
        <p className="coop-note" data-id="party-quest-waiting">
          <T k="partyQuest.waiting" params={{ who: same(waiting.map((m) => m.displayName).join(', ')) }} />
        </p>
      ) : null}
      {turn ? (
        <p className="coop-note" data-id="party-quest-turn">
          {turn.id === selfId ? <T k="partyQuest.yourTurn" /> : <T k="partyQuest.turn" params={{ who: same(turn.displayName) }} />}
        </p>
      ) : null}
      <div className="online-card-actions">
        <button type="button" className={buttonClass('secondary', { small: true })} data-id="party-quest-cheer" onClick={() => send({ type: 'party-say', text: 'Cố lên nào!' })}>
          📣 <T k="partyQuest.cheer" />
        </button>
        <button type="button" className={buttonClass('secondary', { small: true })} data-id="party-quest-hint" onClick={() => send({ type: 'party-say', text: 'Thử bấm Gợi ý xem!' })}>
          💡 <T k="partyQuest.hint" />
        </button>
        <button type="button" className={buttonClass('ghost', { small: true })} data-id="party-quest-leave" onClick={() => send({ type: 'party-quest', message: { type: 'party-quest-leave' } })}>
          <T k="partyQuest.leave" />
        </button>
      </div>
    </section>
  );
}
