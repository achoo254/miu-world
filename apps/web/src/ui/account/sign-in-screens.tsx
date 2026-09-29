// NEW SCREEN (Master Plan §6, Tài khoản): đăng ký và đăng nhập phụ huynh. Chưa có mock.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { MeResponse, ParentPin, PasswordField } from '@miu/schema/account';
import { api } from '../api-client';
import { useAccount } from './account-context';
import { useSubmit } from './use-submit';

export function RegisterScreen() {
  const { setMe } = useAccount();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const form = useSubmit(async () => {
    setMe(await api('POST', '/auth/register', MeResponse, { email, password, pin }));
    navigate('/consent');
  });

  const clientError = !PasswordField.safeParse(password).success
    ? 'Mật khẩu cần từ 10 đến 128 ký tự.'
    : !ParentPin.safeParse(pin).success
      ? 'Mã PIN gồm 4 đến 6 chữ số.'
      : pin !== pinAgain
        ? 'Hai lần nhập mã PIN chưa khớp.'
        : null;
  const [touched, setTouched] = useState(false);

  return (
    <main className="shell" data-id="register">
      <h1>Tạo tài khoản phụ huynh</h1>
      <p className="hint">Phụ huynh là chủ tài khoản; bé chơi bằng hồ sơ do phụ huynh tạo.</p>
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
          Email
          <input data-id="register-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Mật khẩu
          <input
            data-id="register-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Mã PIN phụ huynh (4–6 số)
          <input data-id="register-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} />
        </label>
        <label>
          Nhập lại mã PIN
          <input data-id="register-pin-again" type="password" inputMode="numeric" autoComplete="off" value={pinAgain} onChange={(e) => setPinAgain(e.target.value)} />
        </label>
        {touched && clientError ? <p role="alert" className="error">{clientError}</p> : null}
        {form.error ? <p role="alert" className="error">{form.error}</p> : null}
        <button data-id="register-submit" type="submit" disabled={form.busy}>
          Tạo tài khoản
        </button>
      </form>
      <p>
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </main>
  );
}

export function LoginScreen() {
  const { setMe } = useAccount();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const form = useSubmit(async () => {
    setMe(await api('POST', '/auth/login', MeResponse, { email, password }));
    navigate('/');
  });
  return (
    <main className="shell" data-id="login">
      <h1>Đăng nhập phụ huynh</h1>
      <form className="card form" onSubmit={(e) => void form.onSubmit(e)}>
        <label>
          Email
          <input data-id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Mật khẩu
          <input
            data-id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {form.error ? <p role="alert" className="error">{form.error}</p> : null}
        <button data-id="login-submit" type="submit" disabled={form.busy}>
          Đăng nhập
        </button>
      </form>
      <p>
        Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
      </p>
    </main>
  );
}

