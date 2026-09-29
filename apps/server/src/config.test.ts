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

  it('requires a real database in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://miu.example' })).toThrow(/DATABASE_URL/);
  });

  it('parses a comma-separated origin list', () => {
    const config = loadConfig({ ALLOWED_ORIGINS: 'http://192.168.1.5:4173, http://localhost:4173' });
    expect(config.allowedOrigins).toEqual(['http://192.168.1.5:4173', 'http://localhost:4173']);
  });
});
