import { useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { MeResponse } from '@miu/schema/account';
import { api } from '../api-client';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { PinPad } from '../kit/pin-pad';
import { T } from '../i18n/use-t';
import { useAccount } from './account-context';
import { GOOGLE_SIGN_IN } from './sign-in-screens';
import { useSubmit } from './use-submit';

/** A PIN lock-out is cleared by signing in with Google again (the server resets the counter). */
function PinLockedRelogin() {
  return (
    <section className="panel gate-panel" data-id="parent-gate-locked">
      <Icon name="locked" size={56} />
      <h2><T k="gate.title" /></h2>
      <p role="alert" className="error">
        <T k="gate.pinLockedMessage" />
      </p>
      <a className={buttonClass('primary', { block: true })} href={`${GOOGLE_SIGN_IN}?intent=reauth`} data-id="parent-gate-relogin-google">
        <T k="gate.reloginGoogle" />
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
    <form className="panel gate-panel" data-id="parent-gate" onSubmit={(e) => void form.onSubmit(e)}>
      <Icon name="key" size={56} />
      <h2><T k="gate.title" /></h2>
      <label className="field-label">
        <T k="gate.enterPinPrompt" />
        <input
          className="pin-input"
          data-id="parent-gate-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
      </label>
      <PinPad value={pin} onChange={setPin} />
      {form.error ? <p role="alert" className="error">{form.error}</p> : null}
      <button className={buttonClass('primary', { block: true })} data-id="parent-gate-submit" type="submit" disabled={form.busy}>
        <T k="gate.unlock" />
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
    <button type="button" className={buttonClass('ghost')} data-id="sign-out" disabled={form.busy} onClick={() => void form.onSubmit()}>
      <T k="gate.signOut" />
    </button>
  );
}
