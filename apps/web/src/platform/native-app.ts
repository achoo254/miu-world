// What the iPhone/Android app adds around the web app, started once from main.tsx in the app build only (the web
// bundle never loads this file): the app's background/foreground events and the Android Back button.
import { App } from '@capacitor/app';
import { t } from '../ui/i18n/i18n';
import { setAppInBackground } from './app-lifecycle';
import { pressBack } from './back-button';

export function startNativeApp(): void {
  const failed = (what: string) => (): void => console.warn(`native ${what} listener unavailable`);
  App.addListener('pause', () => setAppInBackground(true)).catch(failed('pause'));
  App.addListener('resume', () => setAppInBackground(false)).catch(failed('resume'));
  App.addListener('backButton', () =>
    pressBack({
      root: document,
      view: window,
      pathname: () => window.location.pathname,
      historyBack: () => window.history.back(),
      confirmExit: () => window.confirm(t('app.exitConfirm')),
      exitApp: () => void App.exitApp().catch(failed('exit')),
    }),
  ).catch(failed('back button'));
}
