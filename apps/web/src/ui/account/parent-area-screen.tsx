import { useEffect, useRef, useState, type Ref } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { PlayerLanguage, PlayerDto, MeResponse } from '@miu/schema/account';
import { NameList } from '@miu/schema/content';
import displayNamesJson from '../../../../../content/names/child-display-names.json';
import { api } from '../api-client';
import { Icon, MiuArt } from '../kit/art';
import { buttonClass } from '../kit/button';
import { MiuOnIsland, SkyScene } from '../kit/sky-scene';
import { bindLangProfile, type TextKey } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { AccountDataPanel } from './account-data-panel';
import { useAccount } from './account-context';
import { ParentGate } from './parent-gate';
import { MAX_PROFILES, tileClass, useProfiles } from './profile-screens';
import { useSubmit } from './use-submit';

/** Same list the server validates against; the child never types a name (Master Plan §9). */
export const DISPLAY_NAMES = NameList.parse(displayNamesJson).names;

const LANG_LABELS: Record<PlayerLanguage, TextKey> = {
  vi: 'parent.languageVi',
  en: 'parent.languageEn',
  both: 'parent.languageBoth',
};

/** First name no profile uses yet, so a new profile does not default to a sibling's name. */
function firstFreeName(profiles: PlayerDto[]): string {
  const taken = new Set(profiles.map((p) => p.displayName));
  return DISPLAY_NAMES.find((n) => !taken.has(n)) ?? DISPLAY_NAMES[0] ?? '';
}

function NamePicker({ value, onChange, id, ref }: { value: string; onChange(name: string): void; id: string; ref?: Ref<HTMLSelectElement> }) {
  const { t } = useT();
  return (
    <select ref={ref} data-id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-label={t('parent.displayNameLabel')}>
      {DISPLAY_NAMES.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

function LanguagePicker({ value, onChange, id }: { value: PlayerLanguage; onChange(lang: PlayerLanguage): void; id: string }) {
  const { t } = useT();
  return (
    <select data-id={id} value={value} onChange={(e) => onChange(e.target.value as PlayerLanguage)} aria-label={t('parent.languageLabel')}>
      <option value="vi">{t('parent.languageVi')}</option>
      <option value="en">{t('parent.languageEn')}</option>
      <option value="both">{t('parent.languageBoth')}</option>
    </select>
  );
}

/** Numbered step heading; the number turns into a tick once the step is done. */
function StepTitle({ n, done, id, children }: { n: number; done: boolean; id: string; children: React.ReactNode }) {
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
function ProfileRow({ profile, index, onChanged }: { profile: PlayerDto; index: number; onChanged(): Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.displayName);
  const [lang, setLang] = useState<PlayerLanguage>(profile.language ?? 'vi');
  const [confirming, setConfirming] = useState(false);
  const rename = useSubmit(async () => {
    const body = lang !== (profile.language ?? 'vi') ? { displayName: name, language: lang } : { displayName: name };
    await api('PATCH', `/players/${profile.id}`, PlayerDto, body);
    bindLangProfile(profile.id, lang);
    await onChanged();
    setEditing(false);
  });
  const remove = useSubmit(async () => {
    await api('DELETE', `/players/${profile.id}`, z.undefined());
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
    setLang(profile.language ?? 'vi');
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
            <LanguagePicker id={`parent-profile-lang-${profile.id}`} value={lang} onChange={setLang} />
            <button type="submit" className={buttonClass('primary', { small: true })} data-id={`parent-profile-rename-save-${profile.id}`} disabled={rename.busy || (name === profile.displayName && lang === (profile.language ?? 'vi'))}>
              <T k="parent.saveNameButton" />
            </button>
            <button type="button" className={buttonClass('ghost', { small: true })} onClick={() => setEditing(false)}>
              <T k="parent.cancelButton" />
            </button>
          </form>
        ) : (
          <>
            <p className="profile-row-name">{profile.displayName}</p>
            {profile.primary ? (
              <p className="badge" data-id={`parent-profile-primary-${profile.id}`}><T k="parent.primaryBadge" /></p>
            ) : null}
            <p className="profile-row-lang"><T k={LANG_LABELS[profile.language ?? 'vi'] ?? 'parent.languageVi'} /></p>
            <div className="row">
              <button ref={renameRef} type="button" className={buttonClass('secondary', { small: true })} data-id={`parent-profile-rename-${profile.id}`} onClick={startEditing}>
                <T k="parent.renameButton" />
              </button>
              {/* The account's own player goes only with the whole account (Xóa tài khoản below). */}
              {profile.primary ? null : confirming ? (
                <>
                  <span><T k="parent.deleteConfirmQuestion" /></span>
                  <button type="button" className={buttonClass('danger', { small: true })} data-id={`parent-profile-delete-confirm-${profile.id}`} disabled={remove.busy} onClick={() => void remove.onSubmit()}>
                    <T k="parent.deleteConfirmButton" />
                  </button>
                  <button type="button" className={buttonClass('ghost', { small: true })} onClick={() => setConfirming(false)}>
                    <T k="parent.noButton" />
                  </button>
                </>
              ) : (
                <button type="button" className={buttonClass('danger', { small: true })} data-id={`parent-profile-delete-${profile.id}`} onClick={() => setConfirming(true)}>
                  <T k="parent.deleteButton" />
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
  const { state, setMe, refresh } = useAccount();
  const navigate = useNavigate();
  const { profiles, error, reload } = useProfiles();
  // null = not picked yet: follow the first free name, which moves on after each new profile.
  const [picked, setPicked] = useState<string | null>(null);
  const [newLang, setNewLang] = useState<PlayerLanguage>('vi');
  const newName = picked ?? firstFreeName(profiles ?? []);
  const create = useSubmit(async () => {
    const body = newLang !== 'vi' ? { displayName: newName, language: newLang } : { displayName: newName };
    const created = await api('POST', '/players', PlayerDto, body);
    bindLangProfile(created.id, created.language);
    await reload();
    setPicked(null);
    setNewLang('vi');
  });
  // Without a PIN there is nothing to lock. With extra players the device goes to the picker, so the
  // person it is handed to picks themselves; a lone owner goes straight back to play.
  const leave = useSubmit(async () => {
    if (state.status === 'signed-in' && state.me.pinSet) setMe(await api('POST', '/parent-gate/lock', MeResponse));
    else await refresh();
    navigate((profiles?.length ?? 0) >= 2 ? '/profiles' : '/');
  });
  const removePin = useSubmit(async () => {
    setMe(await api('DELETE', '/auth/pin', MeResponse));
  });

  if (state.status !== 'signed-in') return null;
  if (!state.me.consentAccepted) {
    return (
      <SkyScene>
        <main className="panel consent-panel">
          <p>
            Cần <Link to="/consent"><T k="parent.consentLink" /></Link> chính sách trước khi thêm người chơi.
          </p>
        </main>
      </SkyScene>
    );
  }
  if (!state.me.parentGateOpen) {
    return (
      <SkyScene>
        <main className="gate-layout" data-id="parent-area">
          <h1 className="visually-hidden"><T k="gate.title" /></h1>
          <div className="gate-mascot">
            <p className="speech"><T k="gate.childMascotSpeech" /></p>
            <MiuOnIsland pose="cheer" size="13rem" />
            <Link to="/profiles" className={buttonClass('ghost')}>
              <T k="gate.backToProfiles" />
            </Link>
          </div>
          <ParentGate />
        </main>
      </SkyScene>
    );
  }

  const hasProfile = (profiles?.length ?? 0) > 0;
  const hasExtraPlayers = (profiles?.length ?? 0) >= 2;
  const { pinSet } = state.me;
  return (
    <SkyScene>
      <main className="scene-content parent-area" data-id="parent-area">
        <header className="page-header">
          <Icon name="key" size={48} />
          <h1><T k="gate.title" /></h1>
        </header>
        <p className="hint parent-intro"><T k="parent.intro" /></p>
        {error ? (
          <div className="row">
            <p role="alert" className="error">
              {error}
            </p>
            <button type="button" className={buttonClass('ghost', { small: true })} onClick={() => void reload()}>
              <T k="parent.tryAgain" />
            </button>
          </div>
        ) : null}

        <section className="panel" data-id="parent-profiles" aria-labelledby="parent-step-profiles">
          <StepTitle n={1} done={hasProfile} id="parent-step-profiles">
            <T k="parent.step1" />
          </StepTitle>
          {profiles ? (
            <span className="badge">
              <T k="parent.profileCountBadge" params={{ count: profiles.length, max: MAX_PROFILES }} />
            </span>
          ) : null}
          {profiles && profiles.length > 0 ? (
            <ul className="profile-rows">{profiles.map((p, i) => <ProfileRow key={p.id} profile={p} index={i} onChanged={reload} />)}</ul>
          ) : null}
          {profiles && profiles.length < MAX_PROFILES ? (
            <form className="parent-create" data-id="parent-create" onSubmit={(e) => void create.onSubmit(e)}>
              <label className="parent-create-label" htmlFor="parent-create-name">
                <T k={hasProfile ? 'parent.step1LabelHas' : 'parent.step1LabelNew'} />
              </label>
              <div className="row">
                <select id="parent-create-name" data-id="parent-create-name" value={newName} onChange={(e) => setPicked(e.target.value)}>
                  {DISPLAY_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <LanguagePicker id="parent-create-lang" value={newLang} onChange={setNewLang} />
                <button className={buttonClass(hasProfile ? 'secondary' : 'primary')} data-id="parent-create-submit" type="submit" disabled={create.busy}>
                  <T k="parent.createButton" />
                </button>
              </div>
              <p className="hint"><T k="parent.namePrivacyHint" /></p>
              {create.error ? <p role="alert" className="error">{create.error}</p> : null}
            </form>
          ) : profiles ? (
            <p className="hint"><T k="parent.profilesLimitReached" params={{ count: MAX_PROFILES }} /></p>
          ) : null}
        </section>

        <section className="panel" data-id="parent-handover" aria-labelledby="parent-step-handover">
          <StepTitle n={2} done={false} id="parent-step-handover">
            <T k={pinSet ? 'parent.step2' : 'parent.step2NoPin'} />
          </StepTitle>
          <p className="hint">
            <T k={!hasProfile ? 'parent.step2HintEmpty' : !hasExtraPlayers ? 'parent.step2HintSolo' : pinSet ? 'parent.step2HintHas' : 'parent.step2HintHasNoPin'} />
          </p>
          {leave.error ? <p role="alert" className="error">{leave.error}</p> : null}
          <button type="button" className={buttonClass('primary', { block: true })} data-id="parent-leave" disabled={leave.busy} onClick={() => void leave.onSubmit()}>
            <T k={pinSet ? 'parent.step2DoneButton' : 'parent.step2DoneButtonNoPin'} />
          </button>
        </section>

        <section className="panel" data-id="parent-pin" aria-labelledby="parent-pin-title">
          <div className="panel-title">
            <Icon name="key" size={40} />
            <h2 id="parent-pin-title"><T k={pinSet ? 'parent.pinManageTitle' : 'parent.pinOptionalTitle'} /></h2>
          </div>
          <p className="hint"><T k={pinSet ? 'parent.pinManageHint' : 'parent.pinOptionalHint'} /></p>
          {removePin.error ? <p role="alert" className="error">{removePin.error}</p> : null}
          <div className="row">
            <Link to="/set-pin" className={buttonClass('secondary')} data-id="parent-pin-set">
              <T k={pinSet ? 'parent.pinChangeButton' : 'parent.pinOptionalButton'} />
            </Link>
            {pinSet ? (
              <button type="button" className={buttonClass('ghost')} data-id="parent-pin-remove" disabled={removePin.busy} onClick={() => void removePin.onSubmit()}>
                <T k="parent.pinRemoveButton" />
              </button>
            ) : null}
          </div>
        </section>

        <p className="parent-more-title"><T k="parent.moreTitle" /></p>
        <div className="parent-columns">
          <section className="panel" aria-labelledby="parent-worksheets-title">
            <div className="panel-title">
              <Icon name="scroll" size={40} />
              <h2 id="parent-worksheets-title"><T k="parent.worksheetsTitle" /></h2>
            </div>
            <p className="hint"><T k="parent.worksheetsHint" /></p>
            <Link to="/parent/worksheets" className={buttonClass('secondary', { block: true })} data-id="parent-worksheets">
              <T k="parent.worksheetsButton" />
            </Link>
          </section>
          <AccountDataPanel />
        </div>
      </main>
    </SkyScene>
  );
}
