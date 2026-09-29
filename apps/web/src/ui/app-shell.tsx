// Khung ứng dụng và điều hướng theo trạng thái tài khoản (NEW SCREEN, Master Plan §6 Tài khoản).
import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AccountProvider, useAccount } from './account/account-context';
import { ConsentScreen } from './account/consent-screen';
import { ParentAreaScreen, ProfilePickerScreen } from './account/profile-screens';
import { LoginScreen, RegisterScreen, SetPinScreen } from './account/sign-in-screens';
// three.js is only needed on /play: keep it out of the sign-in and profile bundle.
const PlayScreen = lazy(() => import('./play/play-screen').then((m) => ({ default: m.PlayScreen })));

function Loading() {
  return (
    <main className="shell" data-id="shell-loading">
      <p role="status">Đang tải…</p>
    </main>
  );
}

function ServerDown() {
  return (
    <main className="shell" data-id="shell-server-down">
      <h1>Miu World</h1>
      <p role="alert" className="error">
        Không kết nối được máy chủ. Thử tải lại trang nhé.
      </p>
    </main>
  );
}

/**
 * Signed-in routes. A parent fresh from the first Google sign-in sets the PIN first, then consents;
 * only then do profiles and play open.
 */
function RequireParent({ children, needsConsent = true, needsPin = true }: { children: ReactNode; needsConsent?: boolean; needsPin?: boolean }) {
  const { state } = useAccount();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ServerDown />;
  if (state.status === 'signed-out') return <Navigate to="/login" replace />;
  if (needsPin && !state.me.pinSet) return <Navigate to="/set-pin" replace />;
  if (!needsPin && state.me.pinSet) return <Navigate to="/" replace />;
  if (needsConsent && !state.me.consentAccepted) return <Navigate to="/consent" replace />;
  return children;
}

function SignedOutOnly({ children }: { children: ReactNode }) {
  const { state } = useAccount();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'signed-in') return <Navigate to="/" replace />;
  return children;
}

/** Play needs a selected child profile; otherwise the child picks one first. */
function RequireActiveChild({ children }: { children: ReactNode }) {
  const { state } = useAccount();
  if (state.status === 'signed-in' && !state.me.activeChildId) return <Navigate to="/profiles" replace />;
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RequireParent>{<Navigate to="/profiles" replace />}</RequireParent>} />
      <Route path="/login" element={<SignedOutOnly><LoginScreen /></SignedOutOnly>} />
      <Route path="/register" element={<SignedOutOnly><RegisterScreen /></SignedOutOnly>} />
      <Route path="/set-pin" element={<RequireParent needsPin={false} needsConsent={false}><SetPinScreen /></RequireParent>} />
      <Route path="/consent" element={<RequireParent needsConsent={false}><ConsentScreen /></RequireParent>} />
      <Route path="/profiles" element={<RequireParent><ProfilePickerScreen /></RequireParent>} />
      <Route path="/parent" element={<RequireParent><ParentAreaScreen /></RequireParent>} />
      <Route path="/play" element={<RequireParent><RequireActiveChild><Suspense fallback={<Loading />}><PlayScreen /></Suspense></RequireActiveChild></RequireParent>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function AppShell() {
  return (
    <AccountProvider>
      <AppRoutes />
    </AccountProvider>
  );
}
