// Khung ứng dụng và điều hướng theo trạng thái tài khoản (NEW SCREEN, Master Plan §6 Tài khoản).
import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AccountProvider, useAccount } from './account/account-context';
import { ConsentScreen } from './account/consent-screen';
import { stopSpeaking } from './dialogue/speech';
import { BackToGame } from './system/back-to-game';
import { bindLangProfile } from './i18n/i18n';
import { T } from './i18n/use-t';
import { ParentAreaScreen } from './account/parent-area-screen';
import { PlayStartScreen, ProfilePickerScreen } from './account/profile-screens';
import { LoginScreen, RegisterScreen, SetPinScreen } from './account/sign-in-screens';
import { PrivacyScreen } from './legal/privacy-screen';
import { Logo, MiuOnIsland, SkyScene } from './kit/sky-scene';
import type { MusicMood } from './sound/music';
import { useMusicMood } from './sound/music-player';
// three.js is only needed on /play: keep it out of the sign-in and profile bundle.
const PlayScreen = lazy(() => import('./play/play-screen').then((m) => ({ default: m.PlayScreen })));
const CreatorScreen = lazy(() => import('./creator/creator-screen').then((m) => ({ default: m.CreatorScreen })));
const HomeScreen = lazy(() => import('./home/home-screen').then((m) => ({ default: m.HomeScreen })));
const RegionMapScreen = lazy(() => import('./region/region-screens').then((m) => ({ default: m.RegionMapScreen })));
const RegionScreen = lazy(() => import('./region/region-screens').then((m) => ({ default: m.RegionScreen })));
const BackpackScreen = lazy(() => import('./profile/profile-screens').then((m) => ({ default: m.BackpackScreen })));
const ProfileScreen = lazy(() => import('./profile/profile-screens').then((m) => ({ default: m.ProfileScreen })));
const FriendsScreen = lazy(() => import('./friends/friends-screens').then((m) => ({ default: m.FriendsScreen })));
const VillageFriendsScreen = lazy(() => import('./npc/village-friends').then((m) => ({ default: m.VillageFriendsScreen })));
const JourneyScreen = lazy(() => import('./journey/journey-screen').then((m) => ({ default: m.JourneyScreen })));
const AchievementsScreen = lazy(() => import('./journey/achievements-screen').then((m) => ({ default: m.AchievementsScreen })));
const WorksheetListScreen = lazy(() => import('./parent/worksheets/worksheets-screen').then((m) => ({ default: m.WorksheetListScreen })));
const WorksheetSheetScreen = lazy(() => import('./parent/worksheets/worksheets-screen').then((m) => ({ default: m.WorksheetSheetScreen })));

/** Plays `mood` while its screen is up (screens outside the child's area: sign-in, profile picker). */
function WithMusic({ mood, children }: { mood: MusicMood; children: ReactNode }) {
  useMusicMood(mood);
  return children;
}

/**
 * A child's screen: needs the parent session and a selected profile; loaded on demand. `music`: the
 * scene's background music; the play screen leaves it out and picks its own.
 */
function ChildScreen({ children, music }: { children: ReactNode; music?: MusicMood }) {
  useMusicMood(music);
  return (
    <RequireParent>
      <RequireActivePlayer>
        <Suspense fallback={<Loading />}>{children}</Suspense>
        <BackToGame />
      </RequireActivePlayer>
    </RequireParent>
  );
}

function Loading() {
  return (
    <SkyScene>
      <main className="scene-content" data-id="shell-loading">
        <MiuOnIsland pose="idle" size="10rem" />
        <p role="status" className="tagline">
          <T k="common.loading" />
        </p>
      </main>
    </SkyScene>
  );
}

function ServerDown() {
  return (
    <SkyScene>
      <main className="scene-content" data-id="shell-server-down">
        <h1 className="visually-hidden">Miu World</h1>
        <Logo />
        <p role="alert" className="error">
          <T k="shell.serverDown" />
        </p>
      </main>
    </SkyScene>
  );
}

/** Signed-in routes. A new account accepts the policy first; only then do profiles and play open. The PIN is optional. */
function RequireParent({ children, needsConsent = true }: { children: ReactNode; needsConsent?: boolean }) {
  const { state } = useAccount();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ServerDown />;
  if (state.status === 'signed-out') return <Navigate to="/login" replace />;
  if (needsConsent && !state.me.consentAccepted) return <Navigate to="/consent" replace />;
  return children;
}

function SignedOutOnly({ children }: { children: ReactNode }) {
  const { state } = useAccount();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'signed-in') return <Navigate to="/" replace />;
  return children;
}

/** Play needs a selected player; otherwise the start picks one (or shows the picker on a shared device). */
function RequireActivePlayer({ children }: { children: ReactNode }) {
  const { state } = useAccount();
  if (state.status === 'signed-in' && !state.me.activePlayerId) return <Navigate to="/" replace />;
  return children;
}

/**
 * The selected child's display language applies (kept per profile on this device), and a reading aloud stops
 * when the screen changes.
 */
function LanguageAndSpeech() {
  const { state } = useAccount();
  const childId = state.status === 'signed-in' ? state.me.activePlayerId : null;
  const { pathname } = useLocation();
  useEffect(() => bindLangProfile(childId), [childId]);
  useEffect(() => stopSpeaking, [pathname]);
  return null;
}

export function AppRoutes() {
  return (
    <>
      <LanguageAndSpeech />
      <Routes>
        <Route path="/" element={<WithMusic mood="home"><RequireParent><PlayStartScreen /></RequireParent></WithMusic>} />
        <Route path="/login" element={<WithMusic mood="home"><SignedOutOnly><LoginScreen /></SignedOutOnly></WithMusic>} />
        <Route path="/register" element={<WithMusic mood="home"><SignedOutOnly><RegisterScreen /></SignedOutOnly></WithMusic>} />
        <Route path="/privacy" element={<PrivacyScreen />} />
        <Route path="/set-pin" element={<RequireParent needsConsent={false}><SetPinScreen /></RequireParent>} />
        <Route path="/consent" element={<RequireParent needsConsent={false}><ConsentScreen /></RequireParent>} />
        <Route path="/profiles" element={<WithMusic mood="home"><RequireParent><ProfilePickerScreen /></RequireParent></WithMusic>} />
        <Route path="/parent" element={<RequireParent><ParentAreaScreen /></RequireParent>} />
        <Route path="/parent/worksheets" element={<RequireParent><Suspense fallback={<Loading />}><WorksheetListScreen /></Suspense></RequireParent>} />
        <Route path="/parent/worksheets/:lessonId" element={<RequireParent><Suspense fallback={<Loading />}><WorksheetSheetScreen /></Suspense></RequireParent>} />
        <Route path="/create" element={<ChildScreen music="home"><CreatorScreen /></ChildScreen>} />
        <Route path="/home" element={<ChildScreen music="home"><HomeScreen /></ChildScreen>} />
        <Route path="/map" element={<ChildScreen music="home"><RegionMapScreen /></ChildScreen>} />
        <Route path="/region/:regionId" element={<ChildScreen music="home"><RegionScreen /></ChildScreen>} />
        <Route path="/backpack" element={<ChildScreen music="home"><BackpackScreen /></ChildScreen>} />
        <Route path="/profile" element={<ChildScreen music="home"><ProfileScreen /></ChildScreen>} />
        <Route path="/friends" element={<ChildScreen music="home"><FriendsScreen /></ChildScreen>} />
        <Route path="/village" element={<ChildScreen music="home"><VillageFriendsScreen /></ChildScreen>} />
        <Route path="/journey" element={<ChildScreen music="home"><JourneyScreen /></ChildScreen>} />
        <Route path="/achievements" element={<ChildScreen music="home"><AchievementsScreen /></ChildScreen>} />
        <Route path="/play" element={<ChildScreen><PlayScreen /></ChildScreen>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export function AppShell() {
  return (
    <AccountProvider>
      <AppRoutes />
    </AccountProvider>
  );
}
