// NEW SCREEN (Master Plan §6, Tài khoản): khu phụ huynh — tạo, đổi tên, xóa hồ sơ trẻ, rồi khóa lại và đưa máy cho bé.
// Chưa có mock riêng; theo visual language M1–M3, hướng A (đảo mây kẹo hồng). Việc chính xếp thành 2 bước đánh số;
// phiếu viết và dữ liệu tài khoản là phần phụ, nằm dưới.
import { useEffect, useRef, useState, type Ref } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { ChildProfileDto, MeResponse } from '@miu/schema/account';
import { NameList } from '@miu/schema/content';
import displayNamesJson from '../../../../../content/names/child-display-names.json';
import { api } from '../api-client';
import { Icon, MiuArt } from '../kit/art';
import { buttonClass } from '../kit/button';
import { MiuOnIsland, SkyScene } from '../kit/sky-scene';
import { AccountDataPanel } from './account-data-panel';
import { useAccount } from './account-context';
import { ParentGate } from './parent-gate';
import { MAX_PROFILES, tileClass, useProfiles } from './profile-screens';
import { useSubmit } from './use-submit';

/** Same list the server validates against; the child never types a name (Master Plan §9). */
export const DISPLAY_NAMES = NameList.parse(displayNamesJson).names;

/** First name no profile uses yet, so a new profile does not default to a sibling's name. */
function firstFreeName(profiles: ChildProfileDto[]): string {
  const taken = new Set(profiles.map((p) => p.displayName));
  return DISPLAY_NAMES.find((n) => !taken.has(n)) ?? DISPLAY_NAMES[0] ?? '';
}

function NamePicker({ value, onChange, id, ref }: { value: string; onChange(name: string): void; id: string; ref?: Ref<HTMLSelectElement> }) {
  return (
    <select ref={ref} data-id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Tên hiển thị">
      {DISPLAY_NAMES.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

/** Numbered step heading; the number turns into a tick once the step is done. */
function StepTitle({ n, done, id, children }: { n: number; done: boolean; id: string; children: string }) {
  return (
    <div className="panel-title">
      <span className={done ? 'step-num step-num--done' : 'step-num'} aria-hidden="true">
        {done ? <Icon name="checkMark" size={28} /> : n}
      </span>
      <h2 id={id}>
        <span className="visually-hidden">{`Bước ${n}${done ? ', đã xong' : ''}:`}</span> {children}
      </h2>
    </div>
  );
}

/** One profile: its name as text; the name list only opens after "Đổi tên". */
function ProfileRow({ profile, index, onChanged }: { profile: ChildProfileDto; index: number; onChanged(): Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.displayName);
  const [confirming, setConfirming] = useState(false);
  const rename = useSubmit(async () => {
    await api('PATCH', `/children/${profile.id}`, ChildProfileDto, { displayName: name });
    await onChanged();
    setEditing(false);
  });
  const remove = useSubmit(async () => {
    await api('DELETE', `/children/${profile.id}`, z.undefined());
    await onChanged();
  });
  // Keyboard and VoiceOver users keep their place: focus the name list on open, back to "Đổi tên" on close.
  const pickerRef = useRef<HTMLSelectElement>(null);
  const renameRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (editing) pickerRef.current?.focus();
    else if (wasEditing.current) renameRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  const startEditing = () => {
    setName(profile.displayName);
    setConfirming(false);
    setEditing(true);
  };
  return (
    <li className="profile-row" data-id={`parent-profile-${profile.id}`}>
      <span className={tileClass(index)}>
        <MiuArt pose="idle" species={profile.species} />
      </span>
      <div className="profile-row-body">
        {editing ? (
          <form className="row" aria-label={`Đổi tên ${profile.displayName}`} onSubmit={(e) => void rename.onSubmit(e)}>
            <NamePicker ref={pickerRef} id={`parent-profile-name-${profile.id}`} value={name} onChange={setName} />
            <button type="submit" className={buttonClass('primary', { small: true })} data-id={`parent-profile-rename-save-${profile.id}`} disabled={rename.busy || name === profile.displayName}>
              Lưu tên
            </button>
            <button type="button" className={buttonClass('ghost', { small: true })} onClick={() => setEditing(false)}>
              Hủy
            </button>
          </form>
        ) : (
          <>
            <p className="profile-row-name">{profile.displayName}</p>
            <div className="row">
              <button ref={renameRef} type="button" className={buttonClass('secondary', { small: true })} data-id={`parent-profile-rename-${profile.id}`} onClick={startEditing}>
                Đổi tên
              </button>
              {confirming ? (
                <>
                  <span>Xóa hẳn hồ sơ và toàn bộ tiến độ?</span>
                  <button type="button" className={buttonClass('danger', { small: true })} data-id={`parent-profile-delete-confirm-${profile.id}`} disabled={remove.busy} onClick={() => void remove.onSubmit()}>
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
          </>
        )}
        {/* A rename error belongs to the open form: "Hủy" closes the message with it. */}
        {(editing && rename.error) || remove.error ? <p role="alert" className="error">{(editing && rename.error) || remove.error}</p> : null}
      </div>
    </li>
  );
}

export function ParentAreaScreen() {
  const { state, setMe } = useAccount();
  const navigate = useNavigate();
  const { profiles, error, reload } = useProfiles();
  // null = not picked yet: follow the first free name, which moves on after each new profile.
  const [picked, setPicked] = useState<string | null>(null);
  const newName = picked ?? firstFreeName(profiles ?? []);
  const create = useSubmit(async () => {
    await api('POST', '/children', ChildProfileDto, { displayName: newName });
    await reload();
    setPicked(null);
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

  const hasProfile = (profiles?.length ?? 0) > 0;
  return (
    <SkyScene>
      <main className="scene-content parent-area" data-id="parent-area">
        <header className="page-header">
          <Icon name="key" size={48} />
          <h1>Khu phụ huynh</h1>
        </header>
        <p className="hint parent-intro">Hai bước để bé vào chơi: tạo hồ sơ cho bé, rồi khóa khu này lại và đưa máy cho bé.</p>
        {error ? (
          <div className="row">
            <p role="alert" className="error">
              {error}
            </p>
            <button type="button" className={buttonClass('ghost', { small: true })} onClick={() => void reload()}>
              Thử lại
            </button>
          </div>
        ) : null}

        <section className="panel" data-id="parent-profiles" aria-labelledby="parent-step-profiles">
          <StepTitle n={1} done={hasProfile} id="parent-step-profiles">
            Tạo hồ sơ cho bé
          </StepTitle>
          {profiles ? <span className="badge">{profiles.length}/{MAX_PROFILES} hồ sơ</span> : null}
          {profiles && profiles.length > 0 ? (
            <ul className="profile-rows">{profiles.map((p, i) => <ProfileRow key={p.id} profile={p} index={i} onChanged={reload} />)}</ul>
          ) : null}
          {profiles && profiles.length < MAX_PROFILES ? (
            <form className="parent-create" data-id="parent-create" onSubmit={(e) => void create.onSubmit(e)}>
              <label className="parent-create-label" htmlFor="parent-create-name">
                {hasProfile ? 'Thêm hồ sơ cho bé khác — chọn tên:' : 'Chọn tên hiển thị cho bé:'}
              </label>
              <div className="row">
                <select id="parent-create-name" data-id="parent-create-name" value={newName} onChange={(e) => setPicked(e.target.value)}>
                  {DISPLAY_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button className={buttonClass(hasProfile ? 'secondary' : 'primary')} data-id="parent-create-submit" type="submit" disabled={create.busy}>
                  Tạo hồ sơ
                </button>
              </div>
              <p className="hint">Tên chọn trong danh sách, không cần tên thật, tuổi hay trường.</p>
              {create.error ? <p role="alert" className="error">{create.error}</p> : null}
            </form>
          ) : profiles ? (
            <p className="hint">Đã đủ {MAX_PROFILES} hồ sơ.</p>
          ) : null}
        </section>

        <section className="panel" data-id="parent-handover" aria-labelledby="parent-step-handover">
          <StepTitle n={2} done={false} id="parent-step-handover">
            Khóa lại và đưa máy cho bé
          </StepTitle>
          <p className="hint">
            {hasProfile
              ? 'Bé sẽ thấy màn hình «Ai đang chơi?» và chạm vào hồ sơ của mình. Muốn quay lại đây cần mã PIN.'
              : 'Tạo ít nhất một hồ sơ ở bước 1 trước nhé.'}
          </p>
          {leave.error ? <p role="alert" className="error">{leave.error}</p> : null}
          <button type="button" className={buttonClass('primary', { block: true })} data-id="parent-leave" disabled={leave.busy} onClick={() => void leave.onSubmit()}>
            Xong, khóa khu phụ huynh
          </button>
        </section>

        <p className="parent-more-title">Thêm cho phụ huynh</p>
        <div className="parent-columns">
          <section className="panel" aria-labelledby="parent-worksheets-title">
            <div className="panel-title">
              <Icon name="scroll" size={40} />
              <h2 id="parent-worksheets-title">Phiếu viết theo SGK</h2>
            </div>
            <p className="hint">Phiếu in cho phần viết tay và việc làm cùng bố mẹ ở nhà của từng bài Tiếng Việt 2 và Toán 2.</p>
            <Link to="/parent/worksheets" className={buttonClass('secondary', { block: true })} data-id="parent-worksheets">
              Xem phiếu viết
            </Link>
          </section>
          <AccountDataPanel />
        </div>
      </main>
    </SkyScene>
  );
}
