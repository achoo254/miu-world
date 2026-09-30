// NEW SCREEN (Master Plan §6, Tài khoản): chọn hồ sơ trẻ ("Ai đang chơi?"). Khu phụ huynh ở parent-area-screen.tsx.
// Chưa có mock riêng; theo visual language M1–M3, hướng A (đảo mây kẹo hồng).
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
          <h1>Ai đang chơi?</h1>
          <Icon name="glowingStar" size={52} />
        </div>
        <p className="hint">Chọn hồ sơ của bé để vào game</p>
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
                Thêm hồ sơ
              </Link>
            </li>
          ) : null}
        </ul>
        {profiles && profiles.length === 0 ? <p>Chưa có hồ sơ nào. Phụ huynh hãy tạo hồ sơ cho bé.</p> : null}
        <nav className="nav-row" aria-label="Tài khoản">
          <Link to="/parent" className={buttonClass('ghost')} data-id="profiles-parent-link">
            <Icon name="locked" size={28} />
            Khu phụ huynh
          </Link>
          <SignOutButton />
        </nav>
      </main>
    </SkyScene>
  );
}

