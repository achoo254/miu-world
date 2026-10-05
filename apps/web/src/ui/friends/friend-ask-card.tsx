// NEW SCREEN, after mock `designs/multiplayer.png` frame 8 ("Yêu cầu kết bạn"), without the parent's approval the
// mock shows (owner, 05/10/2026: the one asked answers herself): a card at the top of the game when someone asks
// her to be friends. Accept or decline; unanswered, it waits in her friends list.
import { useState } from 'react';
import type { SocialStore } from '../../game-bridge/social-store';
import { ApiError } from '../api-client';
import { same } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { MiuArt } from '../kit/art';
import { buttonClass } from '../kit/button';
import { useSocial } from '../online/use-social';
import { answerFriendRequest } from './friends-api';
import './friends.css';

export function FriendAskCard({ social }: { social: SocialStore }) {
  const { t } = useT();
  const ask = useSocial(social, (s) => s.friendAsks[0] ?? null);
  const [busy, setBusy] = useState(false);
  if (!ask) return null;
  const name = ask.from.isBot ? `🤖 [${t('online.botLabel')}] ${ask.from.name}` : ask.from.name;
  const answer = async (accept: boolean): Promise<void> => {
    setBusy(true);
    try {
      await answerFriendRequest(ask.id, accept);
      if (accept) social.toast({ kind: 'friend', added: true, name: ask.from.name, isBot: ask.from.isBot });
    } catch (err) {
      const code = err instanceof ApiError && err.code === 'friends-full' ? 'friends-full' : 'failed';
      // A request gone meanwhile (taken back, a block) needs no answer.
      if (!(err instanceof ApiError && err.status === 404)) social.toast({ kind: 'notice', code, name: null });
    } finally {
      setBusy(false);
      social.update((s) => ({ friendAsks: s.friendAsks.filter((a) => a.id !== ask.id) }));
    }
  };
  return (
    <section className="online-card parchment friend-ask" data-id="friend-ask" role="alertdialog" aria-live="polite" aria-label={t('friends.ask.text', { who: same(name) })}>
      <div className="friend-ask-who">
        <span className="friend-portrait">
          <MiuArt pose="idle" species={ask.from.species} />
        </span>
        <p className="online-card-text">
          🤝 <T k="friends.ask.text" params={{ who: same(name) }} />
        </p>
      </div>
      <div className="online-card-actions">
        <button type="button" className={buttonClass('primary', { small: true })} data-id="friend-ask-accept" disabled={busy} onClick={() => void answer(true)}>
          <T k="friends.ask.accept" />
        </button>
        <button type="button" className={buttonClass('danger', { small: true })} data-id="friend-ask-decline" disabled={busy} onClick={() => void answer(false)}>
          <T k="friends.ask.decline" />
        </button>
      </div>
    </section>
  );
}
