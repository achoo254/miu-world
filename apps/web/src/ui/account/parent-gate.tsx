// NEW SCREEN (Master Plan §6): cổng phụ huynh bằng mã PIN. Chưa có mock.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { MeResponse } from '@miu/schema/account';
import { api } from '../api-client';
import { useAccount } from './account-context';
import { useSubmit } from './use-submit';

/** Re-entering the account password clears a PIN lock-out (server resets the counter on login). */
function PinLockedRelogin({ email }: { email: string }) {
  const { setMe } = useAccount();
  const [password, setPassword] = useState('');
  const form = useSubmit(async () => {
    setMe(await api('POST', '/auth/login', MeResponse, { email, password }));
    setPassword('');
  });
  return (
    <form className="card form" data-id="parent-gate-locked" onSubmit={(e) => void form.onSubmit(e)}>
      <h2>Khu phụ huynh</h2>
      <p role="alert" className="error">
        Mã PIN bị khóa do nhập sai nhiều lần. Nhập mật khẩu tài khoản để mở lại.
      </p>
      <label>
        Mật khẩu
        <input
          data-id="parent-gate-relogin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {form.error ? <p role="alert" className="error">{form.error}</p> : null}
      <button data-id="parent-gate-relogin-submit" type="submit" disabled={form.busy}>
        Mở lại
      </button>
    </form>
  );
}

/** PIN prompt shown in place of parent-only content while the gate is closed. */
export function ParentGate() {
  const { state, setMe } = useAccount();
  const [pin, setPin] = useState('');
  const form = useSubmit(async () => {
    setMe(await api('POST', '/parent-gate/unlock', MeResponse, { pin }));
    setPin('');
  });

  if (state.status === 'signed-in' && state.me.pinLocked) return <PinLockedRelogin email={state.me.parent.email} />;
  return (
    <form className="card form" data-id="parent-gate" onSubmit={(e) => void form.onSubmit(e)}>
      <h2>Khu phụ huynh</h2>
      <label>
        Nhập mã PIN phụ huynh
        <input data-id="parent-gate-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} />
      </label>
      {form.error ? <p role="alert" className="error">{form.error}</p> : null}
      <button data-id="parent-gate-submit" type="submit" disabled={form.busy}>
        Mở khóa
      </button>
    </form>
  );
}

export function SignOutButton() {
  const { signOut } = useAccount();
  const navigate = useNavigate();
  const form = useSubmit(async () => {
    await api('POST', '/auth/logout', z.undefined());
    signOut();
    navigate('/login');
  });
  return (
    <button type="button" className="secondary" data-id="sign-out" disabled={form.busy} onClick={() => void form.onSubmit()}>
      Đăng xuất
    </button>
  );
}
