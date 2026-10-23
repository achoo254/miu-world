// The server's side of signing in through the shared account service (auth-next, OpenID Connect): its discovery
// document and signing keys (cached), the code exchange at its token endpoint, and the checks of the ID tokens and
// back-channel logout tokens it signs. The IdP keeps scope claims out of its ID tokens: the email and whether it is
// verified come from its userinfo endpoint, asked with the access token of the same exchange, for the same `sub`. Every endpoint must live on the issuer's own origin, so a tampered discovery
// document cannot send the code or the client secret anywhere else.
import { decodeJws, verifyJws, type Jwk } from './jws-verify';

const DISCOVERY_TTL_MS = 60 * 60 * 1000;
/** The signing keys are read again at least daily, so a key the IdP retired stops being trusted. */
const JWKS_TTL_MS = 24 * 60 * 60 * 1000;
/** An unknown `kid` refetches the keys (the IdP rotated them), at most this often. */
const JWKS_REFETCH_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
/** Tolerance for clock differences between the IdP and this server. */
const CLOCK_SKEW_S = 60;
/** A logout token older than this is refused (Back-Channel Logout 1.0 §2.6 leaves the window to the client). */
const LOGOUT_TOKEN_MAX_AGE_S = 5 * 60;
const BACKCHANNEL_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

export interface IdpDiscovery {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  jwksUri: string;
}

/** What the token endpoint answered: the ID token to check and the access token that reads userinfo. */
export interface IdpTokens {
  idToken: unknown;
  accessToken: string | null;
}

/** What an accepted ID token says about the person. */
export interface IdpIdentity {
  sub: string;
  /** Lower-cased; empty when the IdP sent none. */
  email: string;
  emailVerified: boolean;
  /** Seconds since epoch of the authentication at the IdP; null when not sent. */
  authTime: number | null;
  /** The IdP session (`sid`), for its back-channel logout; null when not sent. */
  sid: string | null;
  /**
   * How the IdP session signed in (`amr`): "fed", the provider ("google", "apple", "github") and "reauth" when the
   * provider proved a fresh authentication. Empty when not sent.
   */
  amr: string[];
  /** The Google account linked at the IdP (`google_sub`, userinfo, Miu's clients only); null when none. */
  googleSub: string | null;
}

export interface LogoutClaims {
  sub: string | null;
  sid: string | null;
}

export class IdpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdpError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const text = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

function audienceIncludes(claims: Record<string, unknown>, clientId: string): boolean {
  const { aud, azp } = claims;
  if (aud === clientId) return azp === undefined || azp === clientId;
  return Array.isArray(aud) && aud.includes(clientId) && (aud.length === 1 || azp === clientId);
}

export class IdpClient {
  private discovered: { value: IdpDiscovery; at: number } | null = null;
  private keys: { value: Jwk[]; at: number } | null = null;

  constructor(
    readonly issuer: string,
    private readonly fetchImpl: typeof fetch,
    private readonly now: () => number,
  ) {}

  private async getJson(url: string, init?: RequestInit): Promise<unknown> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    } catch {
      throw new IdpError('idp unreachable');
    }
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) throw new IdpError(`idp answered ${res.status}`);
    return body;
  }

  /** An endpoint of the discovery document, accepted only on the issuer's own origin. */
  private endpoint(doc: Record<string, unknown>, key: string): string {
    const value = text(doc[key]);
    const url = value ? URL.parse(value) : null;
    if (!url || url.origin !== new URL(this.issuer).origin) throw new IdpError(`discovery ${key} is not on the issuer`);
    return url.href;
  }

  async discovery(): Promise<IdpDiscovery> {
    if (this.discovered && this.now() - this.discovered.at < DISCOVERY_TTL_MS) return this.discovered.value;
    const doc = await this.getJson(`${this.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
    if (!isRecord(doc) || doc.issuer !== this.issuer) throw new IdpError('discovery of another issuer');
    const value = {
      authorizationEndpoint: this.endpoint(doc, 'authorization_endpoint'),
      tokenEndpoint: this.endpoint(doc, 'token_endpoint'),
      userinfoEndpoint: this.endpoint(doc, 'userinfo_endpoint'),
      jwksUri: this.endpoint(doc, 'jwks_uri'),
    };
    this.discovered = { value, at: this.now() };
    return value;
  }

  private async signingKeys(refetch: boolean): Promise<Jwk[]> {
    const age = this.keys ? this.now() - this.keys.at : Infinity;
    // An unknown key refetches (the IdP rotated), at most once a minute; otherwise once a day.
    if (this.keys && age < JWKS_TTL_MS && (!refetch || age < JWKS_REFETCH_MS)) return this.keys.value;
    const body = await this.getJson((await this.discovery()).jwksUri);
    const keys = isRecord(body) && Array.isArray(body.keys) ? body.keys.filter(isRecord) : [];
    this.keys = { value: keys, at: this.now() };
    return this.keys.value;
  }

  /** The verified payload of a JWS the IdP signed, or null (bad shape or signature, even after a key refetch). */
  async verifiedPayload(token: unknown): Promise<Record<string, unknown> | null> {
    if (typeof token !== 'string') return null;
    const jws = decodeJws(token);
    if (!jws) return null;
    if (verifyJws(jws, await this.signingKeys(false))) return jws.payload;
    return verifyJws(jws, await this.signingKeys(true)) ? jws.payload : null;
  }

  /** Redeems an authorization code. `clientSecret` is absent for the app's public client. */
  async exchangeCode(input: { clientId: string; clientSecret?: string; code: string; codeVerifier: string; redirectUri: string }): Promise<IdpTokens> {
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
    const form = new URLSearchParams({ grant_type: 'authorization_code', code: input.code, code_verifier: input.codeVerifier, redirect_uri: input.redirectUri });
    if (input.clientSecret === undefined) form.set('client_id', input.clientId);
    else {
      // client_secret_basic (RFC 6749 §2.3.1): both parts form-encoded before base64.
      const basic = `${encodeURIComponent(input.clientId)}:${encodeURIComponent(input.clientSecret)}`;
      headers.Authorization = `Basic ${Buffer.from(basic).toString('base64')}`;
    }
    const body = await this.getJson((await this.discovery()).tokenEndpoint, { method: 'POST', headers, body: form.toString() });
    if (!isRecord(body)) return { idToken: undefined, accessToken: null };
    return { idToken: body.id_token, accessToken: text(body.access_token) };
  }

  /** The userinfo of `accessToken` (OIDC Core §5.3); null when the IdP refuses it. */
  private async userinfo(accessToken: string): Promise<Record<string, unknown> | null> {
    const body = await this.getJson((await this.discovery()).userinfoEndpoint, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }).catch(() => null);
    return isRecord(body) ? body : null;
  }

  /**
   * Checks the ID token for `clientId` and `nonce` (OIDC Core §3.1.3.7), then reads the email from userinfo, which
   * must be about the same `sub` (§5.3.2); null when either is not acceptable.
   */
  async identity(tokens: IdpTokens, clientId: string, nonce: string): Promise<IdpIdentity | null> {
    const claims = await this.verifiedPayload(tokens.idToken);
    if (!claims || claims.iss !== this.issuer || !audienceIncludes(claims, clientId)) return null;
    const nowS = Math.floor(this.now() / 1000);
    if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_S <= nowS) return null;
    if (typeof claims.iat !== 'number' || claims.iat - CLOCK_SKEW_S > nowS) return null;
    if (claims.nonce !== nonce) return null;
    const sub = text(claims.sub);
    if (!sub || !tokens.accessToken) return null;
    const info = await this.userinfo(tokens.accessToken);
    if (!info || info.sub !== sub) return null;
    return {
      sub,
      email: (text(info.email) ?? '').trim().toLowerCase(),
      emailVerified: info.email_verified === true,
      authTime: typeof claims.auth_time === 'number' ? claims.auth_time : null,
      sid: text(claims.sid),
      amr: Array.isArray(claims.amr) ? claims.amr.filter((value): value is string => typeof value === 'string') : [],
      googleSub: text(info.google_sub),
    };
  }

  /** Checks a back-channel logout token for `clientId` (Back-Channel Logout 1.0 §2.6); null when it is not valid. */
  async logoutClaims(logoutToken: unknown, clientId: string): Promise<LogoutClaims | null> {
    const claims = await this.verifiedPayload(logoutToken);
    if (!claims || claims.iss !== this.issuer || !audienceIncludes(claims, clientId)) return null;
    const nowS = Math.floor(this.now() / 1000);
    if (typeof claims.iat !== 'number' || claims.iat - CLOCK_SKEW_S > nowS || nowS - claims.iat > LOGOUT_TOKEN_MAX_AGE_S) return null;
    if (typeof claims.exp === 'number' && claims.exp + CLOCK_SKEW_S <= nowS) return null;
    if (!text(claims.jti) || 'nonce' in claims) return null;
    if (!isRecord(claims.events) || !isRecord(claims.events[BACKCHANNEL_EVENT])) return null;
    const sub = text(claims.sub);
    const sid = text(claims.sid);
    return sub || sid ? { sub, sid } : null;
  }
}
