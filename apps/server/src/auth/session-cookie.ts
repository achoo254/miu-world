import type { CookieOptions, Request, Response } from 'express';
import type { ServerConfig } from '../config';
import { SESSION_ABSOLUTE_MS } from './session-store';

/**
 * Production uses the `__Host-` prefix, which browsers only accept with `Secure`, `Path=/` and no
 * `Domain`. Dev/review drops `Secure` because reviewers open the build over plain-http LAN, where
 * browsers discard Secure cookies (they are only exempt on localhost).
 */
export function sessionCookieName(config: ServerConfig): string {
  return config.nodeEnv === 'production' ? '__Host-miu_session' : 'miu_session';
}

function cookieOptions(config: ServerConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

export function setSessionCookie(res: Response, config: ServerConfig, token: string): void {
  res.cookie(sessionCookieName(config), token, { ...cookieOptions(config), maxAge: SESSION_ABSOLUTE_MS });
}

export function clearSessionCookie(res: Response, config: ServerConfig): void {
  res.clearCookie(sessionCookieName(config), cookieOptions(config));
}

/** Minimal cookie-header read (one cookie needed; avoids a parser dependency). */
export function readSessionToken(req: Request, config: ServerConfig): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const name = sessionCookieName(config);
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const value = part.slice(eq + 1).trim();
    // Tokens are base64url; anything else is not ours.
    return /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : null;
  }
  return null;
}
