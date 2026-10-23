// Parent sign-in in the iPhone/Android app (RFC 8252): the app opens the account service in the system browser
// (ASWebAuthenticationSession / Custom Tabs, never its WebView) with the IdP's public client `miu-mobile`, making and
// keeping its own PKCE verifier, `state` and `nonce`. It hands the code back here; this server redeems it at the IdP,
// checks the ID token like the web's, and answers with a Miu session of its own: an opaque token (only its sha256 is
// stored) that the app keeps in the Keychain/Keystore and sends as `Authorization: Bearer`. No IdP token reaches the
// app, and the token is the only credential this API ever returns in a body (it is the app's session cookie).
import { Router, type Response } from 'express';
import { NativeAuthConfig, NativeExchangeRequest, type NativeSessionResponse } from '@miu/schema/account';
import { HttpError, parseInput } from '../http-error';
import type { IdpIdentity } from './idp-client';
import { signInWithIdentity } from './idp-sign-in';
import { IDP_SCOPE, idpFailure, signInLimiter, type IdpRouteDeps } from './idp-web-routes';
import { createSignIn } from './sign-in';

export function idpNativeRoutes({ db, config, clock, idp }: IdpRouteDeps): Router {
  const router = Router();
  const signIn = createSignIn({ db, config, clock });
  const limiter = (name: string) => signInLimiter(config, `native-${name}`, (res: Response) => res.status(429).json({ error: 'rate-limited' }));

  const configured = () => {
    const mobile = config.idp?.mobile;
    if (!idp || !mobile) throw new HttpError(503, 'idp-unavailable');
    return { idp, mobile };
  };

  router.get('/auth/native/config', limiter('config'), async (_req, res) => {
    const { idp: client, mobile } = configured();
    let authorizationEndpoint: string;
    try {
      authorizationEndpoint = (await client.discovery()).authorizationEndpoint;
    } catch (err) {
      console.warn('native sign-in config failed:', idpFailure(err));
      throw new HttpError(503, 'idp-unavailable');
    }
    const body: NativeAuthConfig = { authorizationEndpoint, clientId: mobile.clientId, redirectUri: mobile.redirectUri, scope: IDP_SCOPE };
    res.set('Cache-Control', 'no-store').json(body);
  });

  router.post('/auth/native/exchange', limiter('exchange'), async (req, res) => {
    const { idp: client, mobile } = configured();
    const input = parseInput(NativeExchangeRequest, req.body);
    // The redirect is fixed for the public client; anything else is not this app's sign-in.
    if (input.redirectUri !== mobile.redirectUri) throw new HttpError(400, 'idp');
    let identity: IdpIdentity | null;
    try {
      const tokens = await client.exchangeCode({ clientId: mobile.clientId, code: input.code, codeVerifier: input.codeVerifier, redirectUri: mobile.redirectUri });
      identity = await client.identity(tokens, mobile.clientId, input.nonce);
    } catch (err) {
      console.warn('native sign-in exchange failed:', idpFailure(err));
      throw new HttpError(401, 'idp');
    }
    // `reauth` only says the app asked for one; whether it happened is read from the ID token (idp-sign-in.ts).
    const result = await signInWithIdentity({ db, issuer: client.issuer, clock, signIn }, res, identity, { reauth: input.reauth, kind: 'native' });
    if (!result.ok) throw new HttpError(result.code === 'idp-conflict' ? 409 : 401, result.code);
    const body: NativeSessionResponse = { token: result.signedIn.token };
    res.set('Cache-Control', 'no-store').status(201).json(body);
  });

  return router;
}
