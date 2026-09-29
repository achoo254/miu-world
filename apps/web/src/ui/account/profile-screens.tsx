// NEW SCREEN (Master Plan §6, Tài khoản): chọn hồ sơ trẻ và khu phụ huynh (tạo, đổi tên, xóa). Chưa có mock.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { ChildProfileDto, MeResponse } from '@miu/schema/account';
import { NameList } from '@miu/schema/content';
import displayNamesJson from '../../../../../content/names/child-display-names.json';
import { api, errorMessage } from '../api-client';
import { useAccount } from './account-context';
import { ParentGate, SignOutButton } from './parent-gate';
import { useSubmit } from './use-submit';

/** Same list the server validates against; the child never types a name (Master Plan §9). */
export const DISPLAY_NAMES = NameList.parse(displayNamesJson).names;
const MAX_PROFILES = 3;

const ProfileList = z.array(ChildProfileDto);

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
      await refresh();
      navigate('/play');
    } catch (err) {
      setSelectError(errorMessage(err));
    }
  }

  return (
    <main className="shell" data-id="profiles">
      <h1>Ai đang chơi?</h1>
      {error || selectError ? <p role="alert" className="error">{error ?? selectError}</p> : null}
      <ul className="profile-grid">
        {profiles?.map((p) => (
          <li key={p.id}>
            <button type="button" className="profile-card" data-id={`profiles-pick-${p.id}`} onClick={() => void choose(p.id)}>
              {p.displayName}
            </button>
          </li>
        ))}
      </ul>
      {profiles && profiles.length === 0 ? <p>Chưa có hồ sơ nào. Phụ huynh hãy tạo hồ sơ cho bé.</p> : null}
      <p>
        <Link to="/parent" data-id="profiles-parent-link">
          Khu phụ huynh
        </Link>
      </p>
      <SignOutButton />
    </main>
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

function ProfileRow({ profile, onChanged }: { profile: ChildProfileDto; onChanged(): Promise<void> }) {
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
    <li className="card row" data-id={`parent-profile-${profile.id}`}>
      <NamePicker id={`parent-profile-name-${profile.id}`} value={name} onChange={setName} />
      <button type="button" disabled={rename.busy || name === profile.displayName} onClick={() => void rename.onSubmit()}>
        Đổi tên
      </button>
      {confirming ? (
        <>
          <span>Xóa hẳn hồ sơ và toàn bộ tiến độ?</span>
          <button type="button" className="danger" data-id={`parent-profile-delete-confirm-${profile.id}`} onClick={() => void remove.onSubmit()}>
            Xóa hẳn
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            Không
          </button>
        </>
      ) : (
        <button type="button" className="danger" data-id={`parent-profile-delete-${profile.id}`} onClick={() => setConfirming(true)}>
          Xóa
        </button>
      )}
      {rename.error || remove.error ? <p role="alert" className="error">{rename.error ?? remove.error}</p> : null}
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
      <main className="shell">
        <p>
          Phụ huynh cần <Link to="/consent">đồng ý</Link> trước khi tạo hồ sơ.
        </p>
      </main>
    );
  }
  return (
    <main className="shell" data-id="parent-area">
      <h1>Khu phụ huynh</h1>
      {!state.me.parentGateOpen ? (
        <ParentGate />
      ) : (
        <>
          {error ? <p role="alert" className="error">{error}</p> : null}
          <ul className="stack">{profiles?.map((p) => <ProfileRow key={p.id} profile={p} onChanged={reload} />)}</ul>
          {profiles && profiles.length < MAX_PROFILES ? (
            <form className="card form" data-id="parent-create" onSubmit={(e) => void create.onSubmit(e)}>
              <h2>Tạo hồ sơ cho bé</h2>
              <p className="hint">Chỉ cần tên hiển thị chọn trong danh sách; không cần tên thật, tuổi hay trường.</p>
              <NamePicker id="parent-create-name" value={newName} onChange={setNewName} />
              {create.error ? <p role="alert" className="error">{create.error}</p> : null}
              <button data-id="parent-create-submit" type="submit" disabled={create.busy}>
                Tạo hồ sơ
              </button>
            </form>
          ) : (
            <p className="hint">Đã đủ {MAX_PROFILES} hồ sơ.</p>
          )}
          <button type="button" data-id="parent-leave" onClick={() => void leave.onSubmit()}>
            Xong, khóa khu phụ huynh
          </button>
        </>
      )}
      <p>
        <Link to="/profiles">Về chọn hồ sơ</Link>
      </p>
    </main>
  );
}
