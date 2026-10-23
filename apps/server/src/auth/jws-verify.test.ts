import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decodeJws, verifyJws, type Jwk } from './jws-verify';

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const ec = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const rsaJwk: Jwk = { ...rsa.publicKey.export({ format: 'jwk' }), kid: 'rsa-1' };
const ecJwk: Jwk = { ...ec.publicKey.export({ format: 'jwk' }), kid: 'ec-1' };

function token(header: Record<string, unknown>, signer: (input: string) => Buffer): string {
  const input = `${b64(header)}.${b64({ sub: 'x' })}`;
  return `${input}.${signer(input).toString('base64url')}`;
}

const check = (jws: string, keys: Jwk[]): boolean => {
  const decoded = decodeJws(jws);
  return decoded !== null && verifyJws(decoded, keys);
};

describe('JWS signature check', () => {
  it('accepts ES256 and RS256 signatures of a published key', () => {
    expect(check(token({ alg: 'ES256', kid: 'ec-1' }, (i) => sign('sha256', Buffer.from(i), { key: ec.privateKey, dsaEncoding: 'ieee-p1363' })), [rsaJwk, ecJwk])).toBe(true);
    expect(check(token({ alg: 'RS256', kid: 'rsa-1' }, (i) => sign('sha256', Buffer.from(i), rsa.privateKey)), [rsaJwk, ecJwk])).toBe(true);
  });

  it('refuses another kid, a tampered payload, HMAC with the public key as secret, and alg none', () => {
    const good = token({ alg: 'ES256', kid: 'ec-1' }, (i) => sign('sha256', Buffer.from(i), { key: ec.privateKey, dsaEncoding: 'ieee-p1363' }));
    expect(check(good, [{ ...ecJwk, kid: 'other' }])).toBe(false);
    const [head, , sig] = good.split('.');
    expect(check(`${head}.${b64({ sub: 'admin' })}.${sig}`, [ecJwk])).toBe(false);
    const hmac = token({ alg: 'HS256', kid: 'rsa-1' }, (i) => createHmac('sha256', JSON.stringify(rsaJwk)).update(i).digest());
    expect(check(hmac, [rsaJwk])).toBe(false);
    expect(check(`${b64({ alg: 'none' })}.${b64({ sub: 'x' })}.`, [ecJwk])).toBe(false);
    expect(decodeJws('not-a-jws')).toBeNull();
  });
});
