import type { CapacitorConfig } from '@capacitor/cli';
// appId and appName come from brand.config.json through `pnpm brand:gen` (apps/web/brand-icons.ts).
import brand from '../web/generated/capacitor.json' with { type: 'json' };

/**
 * The iPhone/Android app around the web app's native build (`vite build --mode native` into apps/web/dist-native,
 * `pnpm mobile:build`). Its page runs at capacitor://localhost (iOS) or https://localhost (Android) and talks to the
 * server's origin: the API and the multiplayer socket, and the game's files under /game-assets/, which the app does not
 * pack (only the fonts ship inside). The server answers those two origins with CORS and no credentials.
 */
const config: CapacitorConfig = {
  appId: brand.appId,
  appName: brand.appName,
  webDir: '../web/dist-native',
};

export default config;
