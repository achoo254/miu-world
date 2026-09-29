// NEW SCREEN (Master Plan §6, Tài khoản): đăng nhập / tạo tài khoản phụ huynh bằng Google, đặt PIN lần đầu. Chưa có mock.
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { MeResponse, ParentPin } from '@miu/schema/account';
import { api } from '../api-client';
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

function GoogleSignIn({ title, hint, dataId }: { title: string; hint: string; dataId: string }) {
  const [params] = useSearchParams();
  const error = params.get('error');
  return (
    <main className="shell" data-id={dataId}>
      <h1>{title}</h1>
      <p className="hint">{hint}</p>
      <section className="card form">
        {error ? (
          <p role="alert" className="error">
            {CALLBACK_ERRORS[error] ?? CALLBACK_ERRORS.google}
          </p>
        ) : null}
        <a className="button-link google" href={GOOGLE_SIGN_IN} data-id={`${dataId}-google`}>
          Đăng nhập bằng Google
        </a>
        <p className="hint">Chúng tôi chỉ nhận email đã xác minh của tài khoản Google, không nhận tên, ảnh hay danh bạ.</p>
      </section>
    </main>
  );
}

export function LoginScreen() {
  return <GoogleSignIn dataId="login" title="Đăng nhập phụ huynh" hint="Phụ huynh là chủ tài khoản; bé chơi bằng hồ sơ do phụ huynh tạo." />;
}

export function RegisterScreen() {
  return (
    <GoogleSignIn
      dataId="register"
      title="Tạo tài khoản phụ huynh"
      hint="Dùng tài khoản Google của phụ huynh. Lần đầu đăng nhập, bạn đặt mã PIN để khóa khu phụ huynh."
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
    <main className="shell" data-id="set-pin">
      <h1>Đặt mã PIN phụ huynh</h1>
      <p className="hint">Mã PIN khóa khu phụ huynh (tạo, đổi tên, xóa hồ sơ của bé). Bé chơi không cần mã này.</p>
      <form
        className="card form"
        onSubmit={(e) => {
          setTouched(true);
          if (clientError) {
            e.preventDefault();
            return;
          }
          void form.onSubmit(e);
        }}
      >
        <label>
          Mã PIN (4–6 số)
          <input data-id="set-pin-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} />
        </label>
        <label>
          Nhập lại mã PIN
          <input data-id="set-pin-again" type="password" inputMode="numeric" autoComplete="off" value={pinAgain} onChange={(e) => setPinAgain(e.target.value)} />
        </label>
        {touched && clientError ? <p role="alert" className="error">{clientError}</p> : null}
        {form.error ? <p role="alert" className="error">{form.error}</p> : null}
        <button data-id="set-pin-submit" type="submit" disabled={form.busy}>
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
  );
}
