// NEW SCREEN (Master Plan §6, Tài khoản): chọn hồ sơ trẻ và khu phụ huynh (tạo, đổi tên, xóa).
// Chưa có mock riêng; theo visual language M1–M3, hướng A (đảo mây kẹo hồng).
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { ChildProfileDto, MeResponse } from '@miu/schema/account';
import { CharacterDto } from '@miu/schema/game';
import { NameList } from '@miu/schema/content';
import displayNamesJson from '../../../../../content/names/child-display-names.json';
import { api, errorMessage } from '../api-client';
import { isFreshCharacter } from '../creator/fresh-character';
import { Icon, MiuArt } from '../kit/art';
import { buttonClass } from '../kit/button';
import { MiuOnIsland, SkyScene } from '../kit/sky-scene';
import { useAccount } from './account-context';
import { ParentGate, SignOutButton } from './parent-gate';
import { useSubmit } from './use-submit';

/** Same list the server validates against; the child never types a name (Master Plan §9). */
export const DISPLAY_NAMES = NameList.parse(displayNamesJson).names;
const MAX_PROFILES = 3;

const ProfileList = z.array(ChildProfileDto);

/** Same tint for a profile on the picker and in the parent area. */
const tileClass = (index: number) => `profile-tile tile-${(index % 3) + 1}`;

type ProfilesState = { profiles: ChildProfileDto[] | null; error: string | null };

async function loadProfiles(): Promise<ProfilesState> {
  try {
    return { profiles: await api('GET', '/children', ProfileList), error: null };
  } catch (err) {
    return { profiles: null, error: errorMessage(err) };
  }
}

function useProfiles() {
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
                  <MiuArt pose="idle" />
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

function NamePicker({ value, onChange, id }: { value: string; onChange(name: string): void; id: string }) {
  return (
    <select data-id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Tên hiển thị">
      {DISPLAY_NAMES.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

function ProfileRow({ profile, index, onChanged }: { profile: ChildProfileDto; index: number; onChanged(): Promise<void> }) {
  const [name, setName] = useState(profile.displayName);
  const [confirming, setConfirming] = useState(false);
  const rename = useSubmit(async () => {
    await api('PATCH', `/children/${profile.id}`, ChildProfileDto, { displayName: name });
    await onChanged();
  });
  const remove = useSubmit(async () => {
    await api('DELETE', `/children/${profile.id}`, z.undefined());
    await onChanged();
  });
  return (
    <li className="profile-row" data-id={`parent-profile-${profile.id}`}>
      <span className={tileClass(index)}>
        <MiuArt pose="idle" />
      </span>
      <div className="profile-row-body">
        <NamePicker id={`parent-profile-name-${profile.id}`} value={name} onChange={setName} />
        <div className="row">
          <button type="button" className={buttonClass('secondary', { small: true })} disabled={rename.busy || name === profile.displayName} onClick={() => void rename.onSubmit()}>
            Đổi tên
          </button>
          {confirming ? (
            <>
              <span>Xóa hẳn hồ sơ và toàn bộ tiến độ?</span>
              <button type="button" className={buttonClass('danger', { small: true })} data-id={`parent-profile-delete-confirm-${profile.id}`} onClick={() => void remove.onSubmit()}>
                Xóa hẳn
              </button>
              <button type="button" className={buttonClass('ghost', { small: true })} onClick={() => setConfirming(false)}>
                Không
              </button>
            </>
          ) : (
            <button type="button" className={buttonClass('danger', { small: true })} data-id={`parent-profile-delete-${profile.id}`} onClick={() => setConfirming(true)}>
              Xóa
            </button>
          )}
        </div>
        {rename.error || remove.error ? <p role="alert" className="error">{rename.error ?? remove.error}</p> : null}
      </div>
    </li>
  );
}

export function ParentAreaScreen() {
  const { state, setMe } = useAccount();
  const navigate = useNavigate();
  const { profiles, error, reload } = useProfiles();
  const [newName, setNewName] = useState(DISPLAY_NAMES[0] ?? '');
  const create = useSubmit(async () => {
    await api('POST', '/children', ChildProfileDto, { displayName: newName });
    await reload();
  });
  const leave = useSubmit(async () => {
    setMe(await api('POST', '/parent-gate/lock', MeResponse));
    navigate('/profiles');
  });

  if (state.status !== 'signed-in') return null;
  if (!state.me.consentAccepted) {
    return (
      <SkyScene>
        <main className="panel consent-panel">
          <p>
            Phụ huynh cần <Link to="/consent">đồng ý</Link> trước khi tạo hồ sơ.
          </p>
        </main>
      </SkyScene>
    );
  }
  if (!state.me.parentGateOpen) {
    return (
      <SkyScene>
        <main className="gate-layout" data-id="parent-area">
          <h1 className="visually-hidden">Khu phụ huynh</h1>
          <div className="gate-mascot">
            <p className="speech">Bé chơi không cần mã này nhé! Nhờ bố mẹ mở khóa giúp.</p>
            <MiuOnIsland pose="cheer" size="13rem" />
            <Link to="/profiles" className={buttonClass('ghost')}>
              Về chọn hồ sơ
            </Link>
          </div>
          <ParentGate />
        </main>
      </SkyScene>
    );
  }
  return (
    <SkyScene>
      <main className="scene-content" data-id="parent-area">
        <header className="page-header">
          <Icon name="key" size={48} />
          <h1>Khu phụ huynh</h1>
          {profiles ? <span className="badge">{profiles.length}/{MAX_PROFILES} hồ sơ</span> : null}
          <span className="spacer" />
          <Link to="/profiles" className={buttonClass('ghost')}>
            Về chọn hồ sơ
          </Link>
          <button type="button" className={buttonClass('secondary')} data-id="parent-leave" onClick={() => void leave.onSubmit()}>
            Xong, khóa khu phụ huynh
          </button>
        </header>
        {error ? <p role="alert" className="error">{error}</p> : null}
        <div className="parent-columns">
          <section className="panel" aria-labelledby="parent-profiles-title">
            <h2 id="parent-profiles-title">Hồ sơ của bé</h2>
            {profiles && profiles.length === 0 ? <p className="hint">Chưa có hồ sơ nào.</p> : null}
            <ul className="profile-rows">{profiles?.map((p, i) => <ProfileRow key={p.id} profile={p} index={i} onChanged={reload} />)}</ul>
          </section>
          {profiles && profiles.length < MAX_PROFILES ? (
            <form className="panel" data-id="parent-create" onSubmit={(e) => void create.onSubmit(e)}>
              <div className="panel-title">
                <Icon name="gift" size={40} />
                <h2>Tạo hồ sơ cho bé</h2>
              </div>
              <p className="hint">Chỉ cần tên hiển thị chọn trong danh sách; không cần tên thật, tuổi hay trường.</p>
              <NamePicker id="parent-create-name" value={newName} onChange={setNewName} />
              {create.error ? <p role="alert" className="error">{create.error}</p> : null}
              <button className={buttonClass('primary', { block: true })} data-id="parent-create-submit" type="submit" disabled={create.busy}>
                Tạo hồ sơ
              </button>
            </form>
          ) : (
            <section className="panel">
              <p className="hint">Đã đủ {MAX_PROFILES} hồ sơ.</p>
            </section>
          )}
        </div>
      </main>
    </SkyScene>
  );
}
