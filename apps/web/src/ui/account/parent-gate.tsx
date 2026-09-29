// NEW SCREEN (Master Plan §6): cổng phụ huynh bằng mã PIN. Chưa có mock.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { MeResponse } from '@miu/schema/account';
import { api } from '../api-client';
import { useAccount } from './account-context';
import { GOOGLE_SIGN_IN } from './sign-in-screens';
import { useSubmit } from './use-submit';

/** A PIN lock-out is cleared by signing in with Google again (the server resets the counter). */
function PinLockedRelogin() {
  return (
    <section className="card form" data-id="parent-gate-locked">
      <h2>Khu phụ huynh</h2>
      <p role="alert" className="error">
        Mã PIN bị khóa do nhập sai nhiều lần. Đăng nhập lại bằng Google để mở lại.
      </p>
      <a className="button-link google" href={`${GOOGLE_SIGN_IN}?intent=reauth`} data-id="parent-gate-relogin-google">
        Đăng nhập lại bằng Google
      </a>
    </section>
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

  if (state.status === 'signed-in' && state.me.pinLocked) return <PinLockedRelogin />;
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
