// NEW SCREEN (Master Plan §6, account area): the account owner looks after every player of the account. One card
// per player, opened to her learning progress, her companion bot switch, or her friends and blocks (view, remove,
// unblock; she answers requests herself). Everything is read from the server for that player
// (`/api/players/:id/…`), behind the account area's optional PIN.
import { useMemo, useRef, useState } from 'react';
import { PlayerSettings, type PlayerDto, type PlayerSettingsPatch } from '@miu/schema/account';
import { api } from '../api-client';
import type { TextKey } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { Icon, MiuArt } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Tabs, type TabItem } from '../kit/tabs';
import { accountSocial } from '../friends/friends-api';
import { FriendsPanel } from '../friends/friends-panel';
import { PlayerProgress } from '../profile/progress-panel';
import { tileClass } from './profile-screens';
import { useSubmit } from './use-submit';
import '../system/settings.css';
import './account-players.css';

type CareTab = 'progress' | 'online' | 'friends';

/**
 * The account owner switches companion bots for a player (applied at once, even in a room). Online play itself
 * has no switch: the game is always online (owner, 05/10/2026).
 */
function PlayerOnlineSwitches({ player }: { player: PlayerDto }) {
  const [settings, setSettings] = useState<PlayerSettings>({ botsEnabled: player.botsEnabled });
  /** The change being saved (the submit wrapper takes no arguments). */
  const pending = useRef<PlayerSettingsPatch>({ botsEnabled: player.botsEnabled });
  const save = useSubmit(async () => {
    setSettings(await api('PATCH', `/players/${player.id}/settings`, PlayerSettings, pending.current));
  });
  const choice = (key: keyof PlayerSettings, title: TextKey) => (
    <div className="setting-group" role="radiogroup" aria-labelledby={`player-care-${key}-${player.id}`} data-id={`player-care-${key}-${player.id}`}>
      <p className="setting-title" id={`player-care-${key}-${player.id}`}>
        <T k={title} />
      </p>
      <div className="setting-choices">
        {[true, false].map((on) => (
          <button
            key={String(on)}
            type="button"
            role="radio"
            aria-checked={settings[key] === on}
            className="setting-choice"
            data-id={`player-care-${key}-${player.id}-${on ? 'on' : 'off'}`}
            disabled={save.busy}
            onClick={() => {
              pending.current = { [key]: on };
              void save.onSubmit();
            }}
          >
            <T k={on ? 'settings.switchOn' : 'settings.switchOff'} />
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="player-care-switches">
      <p className="hint">
        <T k="playerCare.settingsHint" />
      </p>
      {choice('botsEnabled', 'settings.bots')}
      {save.error ? (
        <p role="alert" className="error">
          {save.error}
        </p>
      ) : null}
    </div>
  );
}

function PlayerCareCard({ player, index }: { player: PlayerDto; index: number }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<CareTab>('progress');
  const tabs: TabItem<CareTab>[] = [
    { key: 'progress', label: <T k="progress.title" /> },
    { key: 'online', label: <T k="settings.groupOnline" /> },
    { key: 'friends', label: <T k="friends.title" /> },
  ];
  // One source per player, so the list does not load again on every render.
  const friends = useMemo(() => accountSocial(player.id), [player.id]);
  return (
    <li className="player-care" data-id={`player-care-${player.id}`}>
      <div className="player-care-head">
        <span className={tileClass(index)}>
          <MiuArt pose="idle" species={player.species} />
        </span>
        <p className="player-care-name">{player.displayName}</p>
        <button
          type="button"
          className={buttonClass(open ? 'ghost' : 'secondary', { small: true })}
          data-id={`player-care-toggle-${player.id}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <T k={open ? 'playerCare.hide' : 'playerCare.show'} />
        </button>
      </div>
      {open ? (
        <Tabs label={t('playerCare.tabsLabel', { who: { vi: player.displayName, en: player.displayName } })} items={tabs} active={tab} onChange={setTab} dataId={`player-care-tabs-${player.id}`}>
          {tab === 'progress' ? <PlayerProgress playerId={player.id} /> : null}
          {tab === 'online' ? <PlayerOnlineSwitches player={player} /> : null}
          {tab === 'friends' ? (
            <>
              <p className="hint">
                <T k="friends.ownerNote" />
              </p>
              <FriendsPanel source={friends} dataId={`player-friends-${player.id}`} />
            </>
          ) : null}
        </Tabs>
      ) : null}
    </li>
  );
}

export function AccountPlayersPanel({ players }: { players: readonly PlayerDto[] }) {
  if (players.length === 0) return null;
  return (
    <section className="panel" data-id="player-care" aria-labelledby="player-care-title">
      <div className="panel-title">
        <Icon name="books" size={40} />
        <h2 id="player-care-title">
          <T k="playerCare.title" />
        </h2>
      </div>
      <p className="hint">
        <T k="playerCare.hint" />
      </p>
      <ul className="player-care-list">
        {players.map((player, i) => (
          <PlayerCareCard key={player.id} player={player} index={i} />
        ))}
      </ul>
    </section>
  );
}
