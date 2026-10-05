// NEW SCREEN, after mock `designs/multiplayer.png` frames 2 and 9 ("Danh sách bạn bè"): the friends list on
// parchment, with tabs — friends (who is online and where; go to them, remove), requests (received: accept or
// decline; sent: take back), who else is in the room (add as a friend; only while playing) and the players she
// blocked (unblock). No chat: friends meet in the game. Companion bots are always labelled. The account owner sees
// the same lists for a player, without answering for her.
import { useEffect, useId, useState } from 'react';
import type { FriendDto } from '@miu/schema/friends';
import type { SocialStore } from '../../game-bridge/social-store';
import { errorMessage } from '../api-client';
import { same } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { MiuArt } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Tabs, type TabItem } from '../kit/tabs';
import { BotBadge, placeOfMap } from '../online/social-layer';
import { useSocial } from '../online/use-social';
import type { SocialSource } from './friends-api';
import { useFriendsList } from './friends-cache';
import './friends.css';

type FriendsTab = 'friends' | 'requests' | 'room' | 'blocks';

/** Fills the player's name into content text (region names like "Nhà của {name}"). */
type Fill = (text: string) => string;

function Person({ species, name, isBot = false, line, children, dataId }: { species: string; name: string; isBot?: boolean; line?: React.ReactNode; children?: React.ReactNode; dataId: string }) {
  return (
    <li className="friend-row" data-id={dataId}>
      <span className="friend-portrait">
        <MiuArt pose="idle" species={species} />
      </span>
      <span className="friend-who">
        <span className="friend-name">
          <span className="friend-name-text">{name}</span>
          {isBot ? <BotBadge /> : null}
        </span>
        {line ? <span className="friend-line">{line}</span> : null}
      </span>
      <span className="friend-actions">{children}</span>
    </li>
  );
}

function FriendRow({ friend, social, fill, onRemove, onGo }: { friend: FriendDto; social: SocialStore | null; fill: Fill; onRemove(): Promise<void>; onGo?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const name = friend.displayName;
  const line = friend.online ? <T k="friends.online" params={{ place: same(friend.mapId ? placeOfMap(friend.mapId, fill) : '') }} /> : <T k="friends.offline" />;
  const go = social && friend.online && friend.publicId ? friend.publicId : null;
  return (
    <Person species={friend.species} name={name} isBot={friend.isBot} line={line} dataId={`friend-${friend.id}`}>
      {confirming ? (
        <>
          <span className="hint">
            <T k="friends.removeConfirm" params={{ who: same(name) }} />
          </span>
          <button type="button" className={buttonClass('danger', { small: true })} data-id={`friend-remove-yes-${friend.id}`} onClick={() => void onRemove()}>
            <T k="friends.remove" />
          </button>
          <button type="button" className={buttonClass('ghost', { small: true })} onClick={() => setConfirming(false)}>
            <T k="common.cancel" />
          </button>
        </>
      ) : (
        <>
          {go ? (
            <button
              type="button"
              className={buttonClass('primary', { small: true })}
              data-id={`friend-goto-${friend.id}`}
              onClick={() => {
                social?.send({ type: 'goto', id: go });
                onGo?.();
              }}
            >
              <T k="friends.goto" />
            </button>
          ) : null}
          <button type="button" className={buttonClass('ghost', { small: true })} data-id={`friend-remove-${friend.id}`} onClick={() => setConfirming(true)}>
            <T k="friends.remove" />
          </button>
        </>
      )}
    </Person>
  );
}

/** Who else is in her room: add as a friend (already friends say so). */
function RoomList({ social, friends }: { social: SocialStore; friends: readonly FriendDto[] }) {
  const room = useSocial(social, (s) => s.room);
  const known = new Set(friends.flatMap((f) => (f.publicId ? [f.publicId] : [])));
  if (room.length === 0) {
    return (
      <p className="hint">
        <T k="friends.roomNone" />
      </p>
    );
  }
  return (
    <ul className="friend-list" data-id="friends-room">
      {room.map((p) => (
        <Person key={p.id} species={p.species} name={p.name} isBot={p.isBot} dataId={`friends-room-${p.id}`}>
          {known.has(p.id) ? (
            <span className="badge">
              <T k="friends.isFriend" />
            </span>
          ) : (
            <button type="button" className={buttonClass('secondary', { small: true })} data-id={`friends-room-add-${p.id}`} onClick={() => social.send({ type: 'befriend', to: p.id })}>
              🤝 <T k="online.menu.befriend" />
            </button>
          )}
        </Person>
      ))}
    </ul>
  );
}

/** Rows shaped like the list while it is read for the first time (later openings show the kept list at once). */
function FriendsSkeleton({ dataId }: { dataId: string }) {
  const { t } = useT();
  return (
    <div className="friends-panel parchment" data-id={dataId}>
      <ul className="friend-list friend-list--skeleton" role="status" aria-busy="true" aria-label={t('common.loading')} data-id={`${dataId}-loading`}>
        {[0, 1, 2].map((i) => (
          <li key={i} className="friend-row" aria-hidden="true">
            <span className="friend-portrait skeleton-block" />
            <span className="friend-who">
              <span className="skeleton-line" />
              <span className="skeleton-line skeleton-line--short" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FriendsPanel({
  source,
  social = null,
  fill = (text) => text,
  onGo,
  dataId = 'friends',
  cacheKey,
}: {
  source: SocialSource;
  /** The game's online session (in the game only): "Cùng phòng" and going to a friend. */
  social?: SocialStore | null;
  fill?: Fill;
  /** She set off to a friend: the panel's dialog closes. */
  onGo?: () => void;
  dataId?: string;
  /**
   * Where the list is kept between openings (`ownFriendsKey`): shown at once, read again in the background. Without
   * one the list is this panel's own.
   */
  cacheKey?: string;
}) {
  const { t } = useT();
  const own = useId();
  const { view, failed, retry } = useFriendsList(cacheKey ?? `panel:${own}`, source.load);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FriendsTab>('friends');
  // A friend made or a request answered while the list is open: read it again.
  useEffect(() => {
    if (!social) return;
    let seen = social.getSnapshot().toast?.seq ?? 0;
    return social.subscribe(() => {
      const toast = social.getSnapshot().toast;
      if (toast?.kind !== 'friend' || toast.seq === seen) return;
      seen = toast.seq;
      retry();
    });
  }, [social, retry]);

  const act = async (run: () => Promise<unknown>): Promise<void> => {
    setError(null);
    try {
      await run();
    } catch (err) {
      setError(errorMessage(err));
    }
    retry();
  };

  if (!view) {
    return failed ? (
      <div className="row" role="alert">
        <p className="error">
          <T k="friends.loadFailed" />
        </p>
        <button type="button" className={buttonClass('ghost', { small: true })} onClick={retry}>
          <T k="common.retry" />
        </button>
      </div>
    ) : (
      <FriendsSkeleton dataId={dataId} />
    );
  }
  const requests = view.incoming.length + view.outgoing.length;
  const tabs: TabItem<FriendsTab>[] = [
    { key: 'friends', label: <T k="friends.tab.friends" params={{ count: view.friends.length, max: view.max }} /> },
    { key: 'requests', label: <T k="friends.tab.requests" params={{ count: requests }} /> },
    ...(social ? [{ key: 'room' as const, label: <T k="friends.tab.room" /> }] : []),
    { key: 'blocks', label: <T k="friends.tab.blocks" /> },
  ];
  const { answer, cancel } = source;
  /** Answered here: the same request's card over the game goes too. */
  const answered = async (id: string, run: () => Promise<unknown>): Promise<void> => {
    await run();
    social?.update((s) => ({ friendAsks: s.friendAsks.filter((a) => a.id !== id) }));
  };
  return (
    <div className="friends-panel parchment" data-id={dataId}>
      <Tabs label={t('friends.tabsLabel')} items={tabs} active={tab} onChange={setTab} dataId={`${dataId}-tabs`}>
        {tab === 'friends' ? (
          view.friends.length > 0 ? (
            <ul className="friend-list" data-id={`${dataId}-list`}>
              {view.friends.map((friend) => (
                <FriendRow key={friend.id} friend={friend} social={social} fill={fill} onGo={onGo} onRemove={() => act(() => source.removeFriend(friend.id))} />
              ))}
            </ul>
          ) : (
            <p className="hint">
              <T k="friends.none" />
            </p>
          )
        ) : null}
        {tab === 'requests' ? (
          <div className="friend-requests">
            <h3 className="friend-heading">
              <T k="friends.incoming" />
            </h3>
            {view.incoming.length > 0 ? (
              <ul className="friend-list" data-id={`${dataId}-incoming`}>
                {view.incoming.map((r) => (
                  <Person key={r.id} species={r.species} name={r.displayName} isBot={r.isBot} dataId={`friend-request-${r.id}`}>
                    {answer ? (
                      <>
                        <button type="button" className={buttonClass('primary', { small: true })} data-id={`friend-accept-${r.id}`} onClick={() => void act(() => answered(r.id, () => answer(r.id, true)))}>
                          <T k="friends.ask.accept" />
                        </button>
                        <button type="button" className={buttonClass('ghost', { small: true })} data-id={`friend-decline-${r.id}`} onClick={() => void act(() => answered(r.id, () => answer(r.id, false)))}>
                          <T k="friends.ask.decline" />
                        </button>
                      </>
                    ) : (
                      <span className="hint">
                        <T k="friends.waiting" />
                      </span>
                    )}
                  </Person>
                ))}
              </ul>
            ) : (
              <p className="hint">
                <T k="friends.noRequests" />
              </p>
            )}
            <h3 className="friend-heading">
              <T k="friends.outgoing" />
            </h3>
            {view.outgoing.length > 0 ? (
              <ul className="friend-list" data-id={`${dataId}-outgoing`}>
                {view.outgoing.map((r) => (
                  <Person key={r.id} species={r.species} name={r.displayName} line={<T k="friends.waiting" />} dataId={`friend-sent-${r.id}`}>
                    {cancel ? (
                      <button type="button" className={buttonClass('ghost', { small: true })} data-id={`friend-cancel-${r.id}`} onClick={() => void act(() => cancel(r.id))}>
                        <T k="friends.cancel" />
                      </button>
                    ) : null}
                  </Person>
                ))}
              </ul>
            ) : (
              <p className="hint">
                <T k="friends.noRequests" />
              </p>
            )}
          </div>
        ) : null}
        {tab === 'room' && social ? <RoomList social={social} friends={view.friends} /> : null}
        {tab === 'blocks' ? (
          view.blocks.length > 0 ? (
            <ul className="friend-list" data-id={`${dataId}-blocks`}>
              {view.blocks.map((b) => (
                <Person key={b.id} species={b.species} name={b.displayName} dataId={`friend-block-${b.id}`}>
                  <button type="button" className={buttonClass('secondary', { small: true })} data-id={`friend-unblock-${b.id}`} onClick={() => void act(() => source.unblock(b.id))}>
                    <T k="friends.unblock" />
                  </button>
                </Person>
              ))}
            </ul>
          ) : (
            <p className="hint">
              <T k="friends.blocksNone" />
            </p>
          )
        ) : null}
      </Tabs>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
