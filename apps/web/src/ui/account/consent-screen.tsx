import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { MeResponse } from '@miu/schema/account';
import { ConsentDocument } from '@miu/schema/content';
import { api, errorMessage } from '../api-client';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { T } from '../i18n/use-t';
import { useAccount } from './account-context';
import { ParentGate } from './parent-gate';
import { useSubmit } from './use-submit';

export function ConsentScreen() {
  const { state, setMe } = useAccount();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<ConsentDocument | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api('GET', '/consents/policy', ConsentDocument).then(setPolicy, (err: unknown) => setLoadError(errorMessage(err)));
  }, []);

  const form = useSubmit(async () => {
    if (!policy) return;
    setMe(await api('POST', '/consents', MeResponse, { policyVersion: policy.version }));
    navigate('/parent');
  });

  if (state.status !== 'signed-in') return null;
  return (
    <SkyScene>
      <main className="scene-content" data-id="consent">
        {loadError ? <p role="alert" className="error">{loadError}</p> : null}
        {policy ? (
          <article className="panel consent-panel" data-id="consent-text">
            <h1>{policy.title}</h1>
            {policy.requiresLegalReview ? (
              <p className="badge badge--warn" data-id="consent-draft">
                <T k="consent.draftBadge" />
              </p>
            ) : null}
            {policy.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p>
              <Link to="/privacy" data-id="consent-privacy">
                <T k="consent.readPrivacy" />
              </Link>
            </p>
            {state.me.parentGateOpen ? (
              <form className="form" onSubmit={(e) => void form.onSubmit(e)}>
                {form.error ? <p role="alert" className="error">{form.error}</p> : null}
                <button className={buttonClass('primary', { block: true })} data-id="consent-accept" type="submit" disabled={!policy || form.busy}>
                  <T k="consent.acceptButton" />
                </button>
              </form>
            ) : null}
          </article>
        ) : null}
        {state.me.parentGateOpen ? null : <ParentGate />}
      </main>
    </SkyScene>
  );
}
