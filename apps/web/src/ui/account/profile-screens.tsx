import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { ChildProfileDto } from '@miu/schema/account';
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

const ProfileList = z.array(ChildProfileDto);

/** Same tint for a profile on the picker and in the parent area. */
export const tileClass = (index: number) => `profile-tile tile-${(index % 3) + 1}`;

type ProfilesState = { profiles: ChildProfileDto[] | null; error: string | null };

async function loadProfiles(): Promise<ProfilesState> {
  try {
    return { profiles: await api('GET', '/children', ProfileList), error: null };
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

export function ProfilePickerScreen() {
  const { refresh } = useAccount();
  const navigate = useNavigate();
  const { profiles, error } = useProfiles();
  const [selectError, setSelectError] = useState<string | null>(null);

  async function choose(id: string) {
    try {
      const chosen = profiles?.find((p) => p.id === id);
      bindLangProfile(id, chosen?.language);
      await api('POST', `/children/${id}/select`, z.object({ activeChildId: z.uuid() }));
      const character = await api('GET', '/character', CharacterDto);
      await refresh();
      navigate(isFreshCharacter(character) ? '/create' : '/home');
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

