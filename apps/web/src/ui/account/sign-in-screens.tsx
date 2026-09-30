// NEW SCREEN (Master Plan §6, Tài khoản): đăng nhập / tạo tài khoản phụ huynh bằng Google, đặt PIN lần đầu.
// Chưa có mock riêng; theo visual language M1–M3, hướng A (đảo mây kẹo hồng).
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { MeResponse, ParentPin } from '@miu/schema/account';
import { api } from '../api-client';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { useAccount } from './account-context';
import { useSubmit } from './use-submit';

/** Server-side OAuth: the browser just navigates; no Google script is loaded (CSP stays same-origin). */
export const GOOGLE_SIGN_IN = '/api/auth/google/start';

const CALLBACK_ERRORS: Record<string, string> = {
  google: 'Đăng nhập Google chưa thành công. Thử lại nhé.',
  'google-unavailable': 'Đăng nhập Google chưa được cấu hình trên máy chủ này.',
  'google-conflict': 'Email này đang gắn với một tài khoản Google khác.',
  'rate-limited': 'Thử quá nhiều lần. Đợi một lúc rồi thử lại nhé.',
  'google-reauth': 'Cần nhập lại mật khẩu Google để mở khóa PIN. Thử lại nhé.',
};

function GoogleSignIn({ title, hint, dataId, switchTo }: { title: string; hint: string; dataId: string; switchTo: { text: string; label: string; to: string } }) {
  const [params] = useSearchParams();
  const error = params.get('error');
  return (
    <SkyScene hero>
      <main className="panel" data-id={dataId}>
        <h1>{title}</h1>
        <p className="hint">{hint}</p>
        {error ? (
          <p role="alert" className="error">
            {CALLBACK_ERRORS[error] ?? CALLBACK_ERRORS.google}
          </p>
        ) : null}
        <a className={buttonClass('primary', { block: true })} href={GOOGLE_SIGN_IN} data-id={`${dataId}-google`}>
          Đăng nhập bằng Google
        </a>
        <p className="note">
          <Icon name="heart" size={28} />
          Chúng tôi chỉ nhận email đã xác minh của tài khoản Google, không nhận tên, ảnh hay danh bạ.
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
      title="Đăng nhập phụ huynh"
      hint="Phụ huynh là chủ tài khoản; bé chơi bằng hồ sơ do phụ huynh tạo."
      switchTo={{ text: 'Lần đầu dùng Miu World?', label: 'Tạo tài khoản phụ huynh', to: '/register' }}
    />
  );
}

export function RegisterScreen() {
  return (
    <GoogleSignIn
      dataId="register"
      title="Tạo tài khoản phụ huynh"
      hint="Dùng tài khoản Google của phụ huynh. Lần đầu đăng nhập, bạn đặt mã PIN để khóa khu phụ huynh."
      switchTo={{ text: 'Đã có tài khoản?', label: 'Đăng nhập', to: '/login' }}
    />
  );
}

/** First Google sign-in: the PIN that guards the parent area, set before anything else. */
export function SetPinScreen() {
  const { setMe } = useAccount();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [touched, setTouched] = useState(false);
  const form = useSubmit(async () => {
    setMe(await api('POST', '/auth/pin', MeResponse, { pin }));
    navigate('/');
  });
  const clientError = !ParentPin.safeParse(pin).success ? 'Mã PIN gồm 4 đến 6 chữ số.' : pin !== pinAgain ? 'Hai lần nhập mã PIN chưa khớp.' : null;
  return (
    <SkyScene hero>
      <main className="panel" data-id="set-pin">
        <div className="panel-title">
          <Icon name="key" size={44} />
          <h1>Đặt mã PIN phụ huynh</h1>
        </div>
        <p className="hint">Mã PIN khóa khu phụ huynh (tạo, đổi tên, xóa hồ sơ của bé). Bé chơi không cần mã này.</p>
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
            Mã PIN (4–6 số)
            <input className="pin-input" data-id="set-pin-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} />
          </label>
          <label className="field-label">
            Nhập lại mã PIN
            <input className="pin-input" data-id="set-pin-again" type="password" inputMode="numeric" autoComplete="off" value={pinAgain} onChange={(e) => setPinAgain(e.target.value)} />
          </label>
          {touched && clientError ? <p role="alert" className="error">{clientError}</p> : null}
          {form.error ? <p role="alert" className="error">{form.error}</p> : null}
          <button className={buttonClass('primary', { block: true })} data-id="set-pin-submit" type="submit" disabled={form.busy}>
            Lưu mã PIN
          </button>
          <p className="hint">
            Mã PIN chỉ đặt được trong 15 phút sau khi đăng nhập. Quá thời gian?{' '}
            <a href={GOOGLE_SIGN_IN} data-id="set-pin-relogin">
              Đăng nhập lại bằng Google
            </a>
          </p>
        </form>
      </main>
    </SkyScene>
  );
}
