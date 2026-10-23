// Where the web app reaches the server: the API, the game's asset files and the multiplayer WebSocket. The web build
// runs on the server's own origin, so every address stays relative as it always was. The iPhone/Android app
// (`vite build --mode native`, apps/mobile) runs at capacitor://localhost or https://localhost instead, so its build
// bakes in the server's origin (vite.config.ts, `__MIU_SERVER_ORIGIN__`) and every address gets that origin in front.
// Nothing here is read from the user or the page at run time.
declare const __MIU_SERVER_ORIGIN__: string | undefined;

/** The server's origin in the app build (`https://miu.hoandat.com`); empty on the web, where it is the page's own. */
export const SERVER_ORIGIN: string = typeof __MIU_SERVER_ORIGIN__ === 'string' ? __MIU_SERVER_ORIGIN__ : '';

/** True in the iPhone/Android app build. A build-time constant, so the web bundle drops the app-only code. */
export const NATIVE_APP: boolean = SERVER_ORIGIN !== '';

/** Where the server serves the files of assets/manifest.json. */
export const ASSET_PREFIX = '/game-assets/';

/** The page's location, as far as the addresses need it (injectable for tests). */
export interface PageLocation {
  readonly protocol: string;
  readonly host: string;
  readonly origin: string;
}

export interface Endpoints {
  readonly native: boolean;
  /** `/api<path>` on the web; on the server's origin in the app. `path` starts with `/`. */
  apiUrl(path: string): string;
  /** A file under /game-assets/ (`path` relative to it, already URL-encoded), on the origin that serves it. */
  assetUrl(path: string): string;
  /** The origin game assets are served from: the page's own on the web, the server's in the app. */
  assetOrigin(): string;
  /** `ws(s)://<host><path>` of the server, for the multiplayer connection. `path` starts with `/`. */
  wsUrl(path: string): string;
  /** The public web address links are shared with (invites, results): the page's origin, the server's in the app. */
  webOrigin(): string;
}

function rooted(path: string): string {
  if (!path.startsWith('/')) throw new Error(`endpoint path must start with "/": ${path}`);
  return path;
}

/** The addresses for a build that talks to `serverOrigin` (empty: the page's own origin, the web build). */
export function createEndpoints(serverOrigin: string, location: () => PageLocation): Endpoints {
  const native = serverOrigin !== '';
  const server = native ? new URL(serverOrigin) : null;
  return {
    native,
    apiUrl: (path) => `${serverOrigin}/api${rooted(path)}`,
    assetUrl: (path) => `${serverOrigin}${ASSET_PREFIX}${path}`,
    assetOrigin: () => (server ? server.origin : location().origin),
    wsUrl: (path) => {
      const { protocol, host } = server ?? location();
      return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}${rooted(path)}`;
    },
    webOrigin: () => (server ? server.origin : location().origin),
  };
}

const endpoints = createEndpoints(SERVER_ORIGIN, () => window.location);

export const { apiUrl, assetUrl, assetOrigin, wsUrl, webOrigin } = endpoints;
