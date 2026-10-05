// NEW SCREEN (Master Plan §6, Tài khoản): đăng nhập / tạo tài khoản phụ huynh bằng Google; PIN phụ huynh là tùy chọn.
// Chưa có mock riêng; theo visual language M1–M3, hướng A (đảo mây kẹo hồng).
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { MeResponse, ParentPin } from '@miu/schema/account';
import { api } from '../api-client';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { T } from '../i18n/use-t';
import { t, type TextKey } from '../i18n/i18n';
import { useAccount } from './account-context';
import { useSubmit } from './use-submit';

/** Server-side OAuth: the browser just navigates; no Google script is loaded (CSP stays same-origin). */
export const GOOGLE_SIGN_IN = '/api/auth/google/start';

const callbackErrorKey = (code: string): TextKey => {
  switch (code) {
    case 'google-unavailable':
      return 'auth.callback.unavailable';
    case 'google-conflict':
      return 'auth.callback.conflict';
    case 'rate-limited':
      return 'auth.callback.rateLimited';
    case 'google-reauth':
      return 'auth.callback.reauth';
    default:
      return 'auth.callback.google';
  }
};

function GoogleSignIn({ title, hint, dataId, switchTo }: { title: ReactNode; hint: ReactNode; dataId: string; switchTo: { text: ReactNode; label: ReactNode; to: string } }) {
  const [params] = useSearchParams();
  const error = params.get('error');
  return (
    <SkyScene hero>
      <main className="panel" data-id={dataId}>
        <h1>{title}</h1>
        <p className="hint">{hint}</p>
        {error ? (
          <p role="alert" className="error">
            <T k={callbackErrorKey(error)} />
          </p>
        ) : null}
        <a className={buttonClass('primary', { block: true })} href={GOOGLE_SIGN_IN} data-id={`${dataId}-google`}>
          <T k="auth.googleSignIn" />
        </a>
        <p className="note">
          <Icon name="heart" size={28} />
          <span>
            <T k="auth.privacyNote" /> <Link to="/privacy"><T k="auth.privacyLink" /></Link>
          </span>
        </p>
        <p className="hint">
          {switchTo.text} <Link to={switchTo.to}>{switchTo.label}</Link>
        </p>
      </main>
    </SkyScene>
  );
}

export function LoginScreen() {
  return (
    <GoogleSignIn
      dataId="login"
      title={<T k="auth.loginTitle" />}
      hint={<T k="auth.loginHint" />}
      switchTo={{ text: <T k="auth.firstTimePrompt" />, label: <T k="auth.createParentAccount" />, to: '/register' }}
    />
  );
}

export function RegisterScreen() {
  return (
    <GoogleSignIn
      dataId="register"
      title={<T k="auth.registerTitle" />}
      hint={<T k="auth.registerHint" />}
      switchTo={{ text: <T k="auth.haveAccountPrompt" />, label: <T k="auth.loginLink" />, to: '/login' }}
    />
  );
}

/** Optional PIN that locks the parent area; reached from there, skipping keeps the area open. */
export function SetPinScreen() {
  const { state, setMe } = useAccount();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [touched, setTouched] = useState(false);
  const form = useSubmit(async () => {
    setMe(await api('POST', '/auth/pin', MeResponse, { pin }));
    navigate('/parent');
  });
  const clientError = !ParentPin.safeParse(pin).success ? 'Mã PIN gồm 4 đến 6 chữ số.' : pin !== pinAgain ? t('auth.pinMismatch') : null;
  if (state.status === 'signed-in' && state.me.pinSet) return <Navigate to="/parent" replace />;
  return (
    <SkyScene hero>
      <main className="panel" data-id="set-pin">
        <div className="panel-title">
          <Icon name="key" size={44} />
          <h1><T k="auth.setPinTitle" /></h1>
        </div>
        <p className="hint"><T k="auth.setPinHint" /></p>
        <form
          className="form"
          onSubmit={(e) => {
            setTouched(true);
            if (clientError) {
              e.preventDefault();
              return;
            }
            void form.onSubmit(e);
          }}
        >
          <label className="field-label">
            <T k="auth.pinFieldLabel" />
            <input className="pin-input" data-id="set-pin-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} />
          </label>
          <label className="field-label">
            <T k="auth.pinConfirmLabel" />
            <input className="pin-input" data-id="set-pin-again" type="password" inputMode="numeric" autoComplete="off" value={pinAgain} onChange={(e) => setPinAgain(e.target.value)} />
          </label>
          {touched && clientError ? <p role="alert" className="error">{clientError}</p> : null}
          {form.error ? <p role="alert" className="error">{form.error}</p> : null}
          <button className={buttonClass('primary', { block: true })} data-id="set-pin-submit" type="submit" disabled={form.busy}>
            <T k="auth.savePin" />
          </button>
          <Link to="/parent" className={buttonClass('ghost', { block: true })} data-id="set-pin-skip">
            <T k="auth.skipPin" />
          </Link>
        </form>
      </main>
    </SkyScene>
  );
}
