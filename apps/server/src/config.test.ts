import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('uses fixed dev defaults', () => {
    const config = loadConfig({});
    expect(config.port).toBe(8787);
    expect(config.nodeEnv).toBe('development');
    expect(config.allowedOrigins).toContain('http://localhost:5173');
  });

  it('fails fast on an invalid port', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow();
  });

  it('requires explicit origins in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db.local/miu' })).toThrow(/ALLOWED_ORIGINS/);
  });

  it('loads extra quest files only outside production', () => {
    expect(loadConfig({ NODE_ENV: 'test', EXTRA_QUEST_DIR: '/tmp/quests' }).extraQuestDir).toBe('/tmp/quests');
    expect(loadConfig({}).extraQuestDir).toBeNull();
    const production = { NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://miu.example', DATABASE_URL: 'postgres://db.local/miu', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'test-secret', GOOGLE_REDIRECT_URI: 'https://miu.example/api/auth/google/callback' };
    expect(() => loadConfig({ ...production, EXTRA_QUEST_DIR: '/tmp/quests' })).toThrow(/EXTRA_QUEST_DIR is test-only/);
  });

  it('requires a real database in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://miu.example' })).toThrow(/DATABASE_URL/);
  });

  it('parses a comma-separated origin list', () => {
    const config = loadConfig({ ALLOWED_ORIGINS: 'http://192.168.1.5:4173, http://localhost:4173' });
    expect(config.allowedOrigins).toEqual(['http://192.168.1.5:4173', 'http://localhost:4173']);
  });
});
