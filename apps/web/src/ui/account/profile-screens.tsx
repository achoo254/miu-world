import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { PlayerDto } from '@miu/schema/account';
import { CharacterDto } from '@miu/schema/game';
import { api, errorMessage } from '../api-client';
import { isFreshCharacter } from '../creator/fresh-character';
import { Icon, MiuArt } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { bindLangProfile, t } from '../i18n/i18n';
import { T } from '../i18n/use-t';
import { useAccount } from './account-context';
import { SignOutButton } from './parent-gate';

export const MAX_PROFILES = 3;

const ProfileList = z.array(PlayerDto);

/** Same tint for a profile on the picker and in the parent area. */
export const tileClass = (index: number) => `profile-tile tile-${(index % 3) + 1}`;

type ProfilesState = { profiles: PlayerDto[] | null; error: string | null };

async function loadProfiles(): Promise<ProfilesState> {
  try {
    return { profiles: await api('GET', '/players', ProfileList), error: null };
  } catch (err) {
    return { profiles: null, error: errorMessage(err) };
  }
}

export function useProfiles() {
  const [state, setState] = useState<ProfilesState>({ profiles: null, error: null });
  const reload = useCallback(async () => setState(await loadProfiles()), []);
  useEffect(() => {
    let live = true;
    void loadProfiles().then((next) => {
      if (live) setState(next);
    });
    return () => {
      live = false;
    };
  }, []);
  return { ...state, reload };
}

/** A player with only the default character makes it first; everyone else goes Home. */
async function enterGame(navigate: (to: string, opts?: { replace: boolean }) => void): Promise<void> {
  const character = await api('GET', '/character', CharacterDto);
  navigate(isFreshCharacter(character) ? '/create' : '/home', { replace: true });
}

/**
 * The start after sign-in: plays as the selected player (the account's own player by default) without
 * asking who plays. With nobody selected, a lone player is picked automatically; only an account with
 * extra players on a shared device sees the picker.
 */
export function PlayStartScreen() {
  const { state, refresh } = useAccount();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const me = state.status === 'signed-in' ? state.me : null;
  const activePlayerId = me?.activePlayerId ?? null;
  const lonePlayerId = me?.players.length === 1 ? (me.players[0]?.id ?? null) : null;
  useEffect(() => {
    if (activePlayerId) {
      enterGame(navigate).catch((err: unknown) => setError(errorMessage(err)));
    } else if (lonePlayerId) {
      api('POST', `/players/${lonePlayerId}/select`, z.object({ activePlayerId: z.uuid() }))
        .then(refresh)
        .catch((err: unknown) => setError(errorMessage(err)));
    } else {
      navigate('/profiles', { replace: true });
    }
  }, [activePlayerId, lonePlayerId, navigate, refresh]);
  return (
    <SkyScene>
      <main className="scene-content" data-id="play-start">
        {error ? (
          <p role="alert" className="error">{error}</p>
        ) : (
          <p role="status" className="tagline"><T k="common.loading" /></p>
        )}
      </main>
    </SkyScene>
  );
}

export function ProfilePickerScreen() {
  const { refresh } = useAccount();
  const navigate = useNavigate();
  const { profiles, error } = useProfiles();
  const [selectError, setSelectError] = useState<string | null>(null);

  async function choose(id: string) {
    try {
      const chosen = profiles?.find((p) => p.id === id);
      bindLangProfile(id, chosen?.language);
      await api('POST', `/players/${id}/select`, z.object({ activePlayerId: z.uuid() }));
      await refresh();
      await enterGame(navigate);
    } catch (err) {
      setSelectError(errorMessage(err));
    }
  }

  return (
    <SkyScene>
      <main className="scene-content" data-id="profiles">
        <div className="page-title">
          <Icon name="glowingStar" size={52} />
          <h1><T k="profiles.whoIsPlaying" /></h1>
          <Icon name="glowingStar" size={52} />
        </div>
        <p className="hint"><T k="profiles.chooseHint" /></p>
        {error || selectError ? <p role="alert" className="error">{error ?? selectError}</p> : null}
        <ul className="profile-grid">
          {profiles?.map((p, i) => (
            <li key={p.id}>
              <button type="button" className="profile-card" data-id={`profiles-pick-${p.id}`} onClick={() => void choose(p.id)}>
                <span className={tileClass(i)}>
                  <MiuArt pose="idle" species={p.species} />
                </span>
                {p.displayName}
              </button>
            </li>
          ))}
          {profiles && profiles.length < MAX_PROFILES ? (
            <li>
              <Link to="/parent" className="profile-card profile-card--add" data-id="profiles-add">
                <span className="profile-tile profile-tile--add" aria-hidden="true">
                  +
                </span>
                <T k="profiles.addProfile" />
              </Link>
            </li>
          ) : null}
        </ul>
        {profiles && profiles.length === 0 ? <p><T k="profiles.emptyNotice" /></p> : null}
        <nav className="nav-row" aria-label={t('profiles.navAria')}>
          <Link to="/parent" className={buttonClass('ghost')} data-id="profiles-parent-link">
            <Icon name="locked" size={28} />
            <T k="profiles.parentAreaLink" />
          </Link>
          <SignOutButton />
        </nav>
      </main>
    </SkyScene>
  );
}

