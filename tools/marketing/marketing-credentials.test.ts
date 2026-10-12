import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CredentialError, FACEBOOK_ENTRY, FacebookSecret, TOKEN_FILE_ENV, YOUTUBE_ENTRY, YoutubeSecret, readSecret, tokenFilePath } from './marketing-credentials';

const dir = mkdtempSync(path.join(os.tmpdir(), 'miu-credentials-'));
const write = (name: string, content: unknown): string => {
  const file = path.join(dir, name);
  writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
  return file;
};
const youtube = { service: YOUTUBE_ENTRY.service, used_by: YOUTUBE_ENTRY.usedBy, token: { client_id: 'fake-id', client_secret: 'fake-secret-value', refresh_token: 'fake-refresh-value' } };

describe('reading a secret entry', () => {
  it('finds the entry by service and used_by among others', () => {
    const file = write('ok.json', { tokens: [{ service: 'postgresql', used_by: 'x', token: {} }, youtube] });
    expect(readSecret(file, YOUTUBE_ENTRY, YoutubeSecret)).toEqual(youtube.token);
  });

  it('names the entry that is missing, with no value', () => {
    const file = write('none.json', { tokens: [{ service: 'postgresql', used_by: 'x', token: {} }] });
    expect(() => readSecret(file, FACEBOOK_ENTRY, FacebookSecret)).toThrow('graph.facebook.com / miu-world marketing');
  });

  it('names the malformed fields and never quotes a value', () => {
    const file = write('bad.json', { tokens: [{ ...youtube, token: { client_id: 'fake-id', client_secret: 'fake-secret-value', refresh_token: 42 } }] });
    let message = '';
    try {
      readSecret(file, YOUTUBE_ENTRY, YoutubeSecret);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('refresh_token');
    expect(message).not.toContain('fake-secret-value');
    expect(message).not.toContain('42');
  });

  it('refuses a Facebook entry whose page id is not a number (a profile name, a URL)', () => {
    const entry = { service: FACEBOOK_ENTRY.service, used_by: FACEBOOK_ENTRY.usedBy, token: { page_id: 'miu.world', page_access_token: 'fake-page-token' } };
    expect(() => readSecret(write('fb.json', { tokens: [entry] }), FACEBOOK_ENTRY, FacebookSecret)).toThrow(/page_id/);
  });

  it('asks for one entry, not two', () => {
    expect(() => readSecret(write('dup.json', { tokens: [youtube, youtube] }), YOUTUBE_ENTRY, YoutubeSecret)).toThrow(/2 entries/);
  });

  it('does not quote an unreadable file', () => {
    expect(() => readSecret(write('broken.json', '{ "tokens": fake-secret-value'), YOUTUBE_ENTRY, YoutubeSecret)).toThrow(CredentialError);
    expect(() => readSecret(path.join(dir, 'absent.json'), YOUTUBE_ENTRY, YoutubeSecret)).toThrow(/cannot read the token file/);
  });

  it('takes the file path from MIU_MARKETING_TOKEN_FILE and says so when it is not set', () => {
    expect(tokenFilePath({ [TOKEN_FILE_ENV]: '/somewhere/access-tokens.json' })).toBe('/somewhere/access-tokens.json');
    expect(() => tokenFilePath({})).toThrow(TOKEN_FILE_ENV);
  });
});
