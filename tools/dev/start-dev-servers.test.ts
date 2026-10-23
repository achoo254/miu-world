import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { signInEnv, tokenFilePath } from './start-dev-servers';

const client = { client_id: 'miu-web-dev', client_secret: 'test-secret-dev-client-0123456789abcdef' };

describe('dev sign-in env', () => {
  it('takes the miu-web-dev client of the account service, with the localhost:5173 callback', () => {
    const file = {
      tokens: [
        { service: 'api.example', used_by: 42, token: 'unrelated entry of another shape' },
        { service: 'auth.hoandat.com', used_by: 'miu-world', token: { client_id: 'miu-web', client_secret: 'test-secret-production-0123456789abcdef' } },
        { service: 'auth.hoandat.com', used_by: ['other-app', 'miu-world dev'], token: client },
      ],
    };
    expect(signInEnv(file)).toEqual({
      OIDC_WEB_CLIENT_ID: 'miu-web-dev',
      OIDC_WEB_CLIENT_SECRET: client.client_secret,
      OIDC_REDIRECT_URI: 'http://localhost:5173/api/auth/callback',
    });
  });

  it('returns null without the entry, with a malformed client, or for an unexpected file', () => {
    expect(signInEnv({ tokens: [] })).toBeNull();
    expect(signInEnv({ tokens: [{ service: 'auth.hoandat.com', used_by: 'miu-world dev', token: { client_id: 'miu-web-dev', client_secret: 'short' } }] })).toBeNull();
    expect(signInEnv({ tokens: [{ service: 'auth.hoandat.com', used_by: 'miu-world dev', token: 'not-a-client' }] })).toBeNull();
    expect(signInEnv('nope')).toBeNull();
  });

  it('finds the token file from MIU_TOKEN_FILE, else inside iCloud Drive', () => {
    expect(tokenFilePath({ MIU_TOKEN_FILE: '/x/tokens.json' })).toBe('/x/tokens.json');
    expect(tokenFilePath({ MIU_ICLOUD_DIR: '/icloud' })).toBe(path.join('/icloud', 'cong-viec/Cong viec/ENV production/access-tokens.json'));
  });
});
