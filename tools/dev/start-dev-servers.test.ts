import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { googleEnv, tokenFilePath } from './start-dev-servers';

const client = (redirects: string[]) => ({
  client_id: 'id.apps.example',
  client_secret: 'test-secret',
  redirect_uris: redirects,
});

describe('dev google env', () => {
  it('takes the miu-world Google client and its localhost:5173 redirect', () => {
    const file = {
      tokens: [
        { service: 'api.example', used_by: 42, token: 'unrelated entry of another shape' },
        { service: 'accounts.google.com', used_by: 'other-app', token: client(['http://localhost:3000/cb']) },
        { service: 'accounts.google.com', used_by: ['other-app', 'miu-world'], token: client(['https://miu.example/api/auth/google/callback', 'http://localhost:5173/api/auth/google/callback']) },
      ],
    };
    expect(googleEnv(file)).toEqual({
      GOOGLE_CLIENT_ID: 'id.apps.example',
      GOOGLE_CLIENT_SECRET: 'test-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:5173/api/auth/google/callback',
    });
  });

  it('returns null without the entry, without a dev redirect, or for an unexpected file', () => {
    expect(googleEnv({ tokens: [] })).toBeNull();
    expect(googleEnv({ tokens: [{ service: 'accounts.google.com', used_by: 'miu-world', token: client(['http://localhost:4173/cb']) }] })).toBeNull();
    expect(googleEnv({ tokens: [{ service: 'accounts.google.com', used_by: 'miu-world', token: 'not-a-client' }] })).toBeNull();
    expect(googleEnv('nope')).toBeNull();
  });

  it('finds the token file from MIU_TOKEN_FILE, else inside iCloud Drive', () => {
    expect(tokenFilePath({ MIU_TOKEN_FILE: '/x/tokens.json' })).toBe('/x/tokens.json');
    expect(tokenFilePath({ MIU_ICLOUD_DIR: '/icloud' })).toBe(path.join('/icloud', 'cong-viec/Cong viec/ENV production/access-tokens.json'));
  });
});
