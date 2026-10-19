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

  it('raises the sign-up cap only outside production', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).registerLimitPerHour).toBe(10);
    expect(loadConfig({ NODE_ENV: 'test', REGISTER_LIMIT_PER_HOUR: '1000' }).registerLimitPerHour).toBe(1000);
    const production = { NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://miu.example', DATABASE_URL: 'postgres://db.local/miu', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'test-secret', GOOGLE_REDIRECT_URI: 'https://miu.example/api/auth/google/callback' };
    expect(() => loadConfig({ ...production, REGISTER_LIMIT_PER_HOUR: '1000' })).toThrow(/REGISTER_LIMIT_PER_HOUR is test-only/);
  });

  it('names moderators by sign-in email only when listed, and starts online play as the switch says', () => {
    expect(loadConfig({}).moderatorAccounts.size).toBe(0);
    expect([...loadConfig({ MODERATOR_ACCOUNTS: ' Owner@Example.vn, ,second@example.vn' }).moderatorAccounts]).toEqual(['owner@example.vn', 'second@example.vn']);
    expect(loadConfig({}).onlineMode).toBe('on');
    expect(loadConfig({ ONLINE_MODE: '' }).onlineMode).toBe('on');
    expect(loadConfig({ ONLINE_MODE: 'interaction-off' }).onlineMode).toBe('interaction-off');
    expect(() => loadConfig({ ONLINE_MODE: 'paused' })).toThrow(/ONLINE_MODE/);
  });

  it('lets a school share one address for analytics but caps one browser', () => {
    const config = loadConfig({});
    expect(config.analyticsLimitPerMinute).toBe(600);
    expect(config.analyticsClientLimitPerMinute).toBe(60);
  });

  it('takes the TURN key only as a pair, and never echoes its values', () => {
    expect(loadConfig({}).turn).toBeNull();
    expect(loadConfig({ CF_TURN_KEY_ID: '', CF_TURN_API_TOKEN: '' }).turn).toBeNull();
    const keyId = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
    const apiToken = 'test-turn-token-0123456789abcdef';
    expect(loadConfig({ CF_TURN_KEY_ID: keyId, CF_TURN_API_TOKEN: apiToken }).turn).toEqual({ keyId, apiToken });
    expect(() => loadConfig({ CF_TURN_KEY_ID: keyId })).toThrow(/go together/);
    let message = '';
    try {
      loadConfig({ CF_TURN_KEY_ID: 'not a key/../', CF_TURN_API_TOKEN: apiToken });
    } catch (err) {
      message = err instanceof Error ? err.message : '';
    }
    expect(message).toMatch(/CF_TURN_KEY_ID/);
    expect(message).not.toContain(apiToken);
  });

  it('takes the GA4 property only as a pair, and never echoes the secret', () => {
    expect(loadConfig({}).ga4).toBeNull();
    expect(loadConfig({ GA4_MEASUREMENT_ID: '', GA4_API_SECRET: '' }).ga4).toBeNull();
    const measurementId = 'G-TEST123456';
    const apiSecret = 'test-ga-secret-0123456789';
    expect(loadConfig({ GA4_MEASUREMENT_ID: measurementId, GA4_API_SECRET: apiSecret }).ga4).toEqual({ measurementId, apiSecret });
    expect(() => loadConfig({ GA4_MEASUREMENT_ID: measurementId })).toThrow(/go together/);
    expect(() => loadConfig({ GA4_API_SECRET: apiSecret })).toThrow(/go together/);
    for (const bad of ['UA-12345-1', 'G-abc', 'G-', 'G-TOOLONG1234567']) {
      expect(() => loadConfig({ GA4_MEASUREMENT_ID: bad, GA4_API_SECRET: apiSecret })).toThrow(/GA4_MEASUREMENT_ID/);
    }
    let message = '';
    try {
      loadConfig({ GA4_MEASUREMENT_ID: measurementId, GA4_API_SECRET: `${apiSecret} with spaces` });
    } catch (err) {
      message = err instanceof Error ? err.message : '';
    }
    expect(message).toMatch(/GA4_API_SECRET/);
    expect(message).not.toContain(apiSecret);
  });

  it('gives the default timetable to every account only outside production', () => {
    const production = { NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://miu.example', DATABASE_URL: 'postgres://db.local/miu', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'test-secret', GOOGLE_REDIRECT_URI: 'https://miu.example/api/auth/google/callback' };
    expect(loadConfig({}).timetableDefaultAccounts).toBeNull();
    expect(loadConfig(production).timetableDefaultAccounts).toEqual(new Set());
    expect(loadConfig({ ...production, TIMETABLE_DEFAULT_ACCOUNTS: 'A@x.vn,,b@x.vn ' }).timetableDefaultAccounts).toEqual(new Set(['a@x.vn', 'b@x.vn']));
  });

  it('requires a real database in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://miu.example' })).toThrow(/DATABASE_URL/);
  });

  it('parses a comma-separated origin list', () => {
    const config = loadConfig({ ALLOWED_ORIGINS: 'http://192.168.1.5:4173, http://localhost:4173' });
    expect(config.allowedOrigins).toEqual(['http://192.168.1.5:4173', 'http://localhost:4173']);
  });
});
