// NEW SCREEN, after mock `designs/multiplayer.png` frame 1 (the "Bạn bè" button in the HUD's left rail) and frames
// 2/9 (the list): the friends list in the game, as a themed scene over the paused game, and as its own page
// (from Hồ sơ) outside the game.
import { useEffect } from 'react';
import { Link } from 'react-router';
import type { SocialStore } from '../../game-bridge/social-store';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { SkyScene } from '../kit/sky-scene';
import { useSocial } from '../online/use-social';
import { OWN_SOCIAL } from './friends-api';
import { ownFriendsKey, refreshFriends } from './friends-cache';
import { FriendsPanel } from './friends-panel';
import './friends.css';

/** The HUD's "Bạn bè" button, with the friend requests waiting for her answer. */
export function FriendsButton({ social, onOpen }: { social: SocialStore; onOpen: () => void }) {
  const { t } = useT();
  const asks = useSocial(social, (s) => s.friendAsks.length);
  return (
    <button type="button" className={`${buttonClass('secondary', { small: true })} friends-hud-button`} data-id="hud-friends" onClick={onOpen}>
      <span aria-hidden="true">🤝</span>
      <span className="hud-btn-label">
        <T k="friends.title" />
      </span>
      {asks > 0 ? (
        <span className="friends-hud-count" aria-label={t('friends.tab.requests', { count: asks })}>
          {asks}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Keeps the playing player's friends list fresh while she plays, so opening it shows the list at once: read when the
 * game is up, and again when friend news comes (a request, an answer).
 */
export function useFriendsPrefetch(social: SocialStore, player: string | null, ready: boolean): void {
  useEffect(() => {
    if (!player || !ready) return;
    const key = ownFriendsKey(player);
    void refreshFriends(key, OWN_SOCIAL.load);
    let seen = social.getSnapshot();
    return social.subscribe(() => {
      const now = social.getSnapshot();
      const news = (now.toast !== seen.toast && now.toast?.kind === 'friend') || now.friendAsks !== seen.friendAsks;
      seen = now;
      if (news) void refreshFriends(key, OWN_SOCIAL.load, true);
    });
  }, [social, player, ready]);
}

/** The friends list over the paused game: going to a friend closes it. */
export function FriendsDialog({ social, fill, player, onClose }: { social: SocialStore; fill: (text: string) => string; player: string | null; onClose: () => void }) {
  const { t } = useT();
  return (
    <Modal title={<T k="friends.title" />} onClose={onClose} dataId="play-friends" variant="scene" size="wide">
      <button type="button" className="scene-close" data-id="play-friends-close" aria-label={t('common.close')} onClick={onClose}>
        ✕
      </button>
      <FriendsPanel source={OWN_SOCIAL} social={social} fill={fill} onGo={onClose} cacheKey={player ? ownFriendsKey(player) : undefined} />
    </Modal>
  );
}

/** `/friends`: the list outside the game. */
export function FriendsScreen() {
  return (
    <SkyScene>
      <main className="region-page" data-id="friends-page">
        <header className="region-top">
          <h1 className="panel-title">
            <span aria-hidden="true">🤝</span> <T k="friends.title" />
          </h1>
          <Link to="/profile" className={buttonClass('ghost', { small: true })} data-id="friends-back">
            <Icon name="catFace" size={28} />
            <T k="common.back" />
          </Link>
        </header>
        <FriendsPanel source={OWN_SOCIAL} />
      </main>
    </SkyScene>
  );
}
