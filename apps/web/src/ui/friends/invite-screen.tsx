// NEW SCREEN (Master Plan §6, Tài khoản): where an invite link (`/moi/<code>`) leads. Like the introduction at `/`:
// the sky, one panel, one button. "Chơi cùng bạn" keeps the code on this device and goes on to sign-in; the game
// uses it once the visitor is in, has accepted the policy and has made a character (`ResumePostLoginTarget`).
// The page says nothing about who made the link: the code is all it knows, and the server checks it later.
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { INVITE_CODE } from '@miu/schema/invites';
import { savePostLoginTarget } from '../../post-login-target';
import { T } from '../i18n/use-t';
import { buttonClass } from '../kit/button';
import { Logo, SkyScene } from '../kit/sky-scene';
import './invite-screen.css';

/** An address with a code in it is for one person: the page asks search engines to leave it out. */
function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.append(meta);
    return () => meta.remove();
  }, []);
}

export function InviteScreen() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const valid = INVITE_CODE.test(code);
  useNoIndex();
  return (
    <SkyScene>
      <main className="scene-content invite-page" data-id="invite-page">
        <Logo />
        <div className="panel invite-page-panel">
          <h1>
            <T k="invitePage.title" />
          </h1>
          {valid ? (
            <>
              <p>
                <T k="invitePage.lead" />
              </p>
              <p className="hint">
                <T k="invitePage.steps" />
              </p>
              <button
                type="button"
                className={buttonClass('primary', { block: true })}
                data-id="invite-play"
                onClick={() => {
                  // A visitor who is signed in already is sent back from the sign-in screen to the start.
                  savePostLoginTarget({ inviteCode: code });
                  navigate('/login');
                }}
              >
                <T k="invitePage.play" />
              </button>
            </>
          ) : (
            <>
              <p role="alert" className="error" data-id="invite-invalid">
                <T k="invitePage.invalid" />
              </p>
              <Link to="/" className={buttonClass('secondary', { block: true })} data-id="invite-home">
                <T k="invitePage.home" />
              </Link>
            </>
          )}
        </div>
        <p className="note">
          <Link to="/privacy"><T k="auth.privacyLink" /></Link> · <Link to="/terms"><T k="auth.termsLink" /></Link>
        </p>
      </main>
    </SkyScene>
  );
}
