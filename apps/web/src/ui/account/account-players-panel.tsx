// NEW SCREEN (Master Plan §6, account area): the account owner looks after every player of the account. One card
// per player, opened to her learning progress. Everything is read from the server for that player
// (`/api/players/:id/…`), behind the account area's optional PIN.
import { useState } from 'react';
import type { PlayerDto } from '@miu/schema/account';
import { T, useT } from '../i18n/use-t';
import { Icon, MiuArt } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Tabs, type TabItem } from '../kit/tabs';
import { PlayerProgress } from '../profile/progress-panel';
import { tileClass } from './profile-screens';
import './account-players.css';

type CareTab = 'progress';

function PlayerCareCard({ player, index }: { player: PlayerDto; index: number }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<CareTab>('progress');
  const tabs: TabItem<CareTab>[] = [{ key: 'progress', label: <T k="progress.title" /> }];
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
