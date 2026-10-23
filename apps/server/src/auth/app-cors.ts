import type { RequestHandler } from 'express';
import { ANALYTICS_HEADER } from '@miu/schema/analytics';

/**
 * The page origins of the iPhone/Android app (Capacitor): iOS serves it at capacitor://localhost, Android at
 * https://localhost. No web page can claim either origin, so they join the CSRF allow-list (origin-check.ts) and
 * the multiplayer origin check without opening those to any website.
 */
export const APP_ORIGINS: readonly string[] = ['capacitor://localhost', 'https://localhost'];

const ALLOWED_METHODS = 'GET, HEAD, POST, PUT, PATCH, DELETE';
/** What the app sends: JSON bodies, its sign-in token (Bearer) and the anonymous analytics ids of api-client.ts. */
const ALLOWED_HEADERS = ['Authorization', 'Content-Type', ANALYTICS_HEADER].join(', ');
const PREFLIGHT_MAX_AGE_S = '600';

/**
 * Cross-origin access to the API for the app's origins only. Credentials stay off: the session cookie is the web's
 * (same origin, SameSite=Lax) and never answers a cross-origin call; the app authenticates with a Bearer token
 * instead. Any other origin gets no CORS header at all, so the browser keeps refusing it, and the Origin check that
 * follows still rejects its state-changing requests. A preflight from the app is answered here without a session.
 */
export function appCors(appOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(appOrigins);
  return (req, res, next) => {
    res.vary('Origin');
    const origin = req.headers.origin;
    if (!origin || !allowed.has(origin)) return next();
    res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method !== 'OPTIONS') return next();
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Max-Age', PREFLIGHT_MAX_AGE_S);
    res.status(204).end();
  };
}
