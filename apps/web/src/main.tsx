import './zod-config';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { NATIVE_APP } from './platform/endpoints';
import { AppShell } from './ui/app-shell';
import './ui/fonts.css';
import './ui/tokens.css';
import './ui/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');

const render = (): void =>
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </StrictMode>,
  );

// The iPhone/Android app's own events (background, Back button) and its stored session, read before the first API
// call so a signed-in parent opens straight into the game; the web build drops this branch.
if (NATIVE_APP) {
  import('./platform/native-app')
    .then(({ startNativeApp }) => startNativeApp())
    .catch(() => console.warn('native app events unavailable'));
  import('./platform/native-session')
    .then(({ loadNativeSession }) => loadNativeSession())
    .catch(() => console.warn('native session unavailable'))
    .finally(render);
} else {
  render();
}
