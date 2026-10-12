// NEW SCREEN (Master Plan §6, Tài khoản): the introduction a visitor who is not signed in sees at `/`, in place of a
// sign-in form: what the game is, the picture of its islands, a button to play (the sign-in screen) and a way to the
// lesson pages. No mock of its own; the sky, panel and buttons of the sign-in screens (direction A).
import { Link } from 'react-router';
import { LESSON_SUBJECTS, subjectPagePath } from '@miu/schema/lesson-pages';
import { Logo, SkyScene } from '../kit/sky-scene';
import { buttonClass } from '../kit/button';
import { HOME_ISLAND, assetUrl } from '../kit/ui-art';
import { T, useT } from '../i18n/use-t';
import './landing.css';

const BENEFITS = ['landing.benefitBooks', 'landing.benefitFriends', 'landing.benefitNotebook', 'landing.benefitFree'] as const;

export function LandingScreen() {
  const { t } = useT();
  return (
    <SkyScene>
      <main className="scene-content landing" data-id="landing">
        <Logo />
        <div className="panel landing-panel">
          <div className="landing-text">
            <h1><T k="landing.title" /></h1>
            <p className="hint"><T k="landing.lead" /></p>
            {/* Right under the lead: on a phone the button is on the first screen, before the list. */}
            <Link to="/login" className={buttonClass('primary', { block: true })} data-id="landing-play">
              <T k="landing.play" />
            </Link>
            <p className="hint">
              <T k="landing.haveAccount" /> <Link to="/login" data-id="landing-login"><T k="landing.loginLink" /></Link>
            </p>
            <ul className="landing-benefits">
              {BENEFITS.map((key) => (
                <li key={key}><T k={key} /></li>
              ))}
            </ul>
          </div>
          <img className="landing-image" src={assetUrl(HOME_ISLAND)} alt={t('landing.imageAlt')} width={1600} height={1000} draggable={false} />
        </div>
        {/* The lesson pages are static files, not routes of this app: plain links, each page a fresh load. */}
        <nav className="landing-lessons" aria-labelledby="landing-lessons-heading" data-id="landing-lessons">
          <h2 id="landing-lessons-heading"><T k="landing.lessonsHeading" /></h2>
          <ul>
            {LESSON_SUBJECTS.map((subject) => (
              <li key={subject.slug}>
                <a className={buttonClass('ghost', { small: true })} href={subjectPagePath(subject)} data-id={`landing-subject-${subject.slug}`}>
                  <T k="landing.subjectLessons" params={{ subject: subject.name }} />
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="note">
          <Link to="/privacy"><T k="auth.privacyLink" /></Link>
        </p>
      </main>
    </SkyScene>
  );
}
