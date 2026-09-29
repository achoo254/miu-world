import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../vite.config';

describe('web content security policy', () => {
  const directives = new Map(
    CONTENT_SECURITY_POLICY.split(';').map((d) => {
      const [name = '', ...values] = d.trim().split(/\s+/);
      return [name, values] as const;
    }),
  );

  it('allows scripts and connections from our own origin only', () => {
    expect(directives.get('script-src')).toEqual(["'self'"]);
    expect(directives.get('default-src')).toEqual(["'self'"]);
    expect(directives.get('connect-src')?.every((v) => ["'self'", 'blob:', 'data:'].includes(v))).toBe(true);
  });

  it('blocks plugins and base/form hijacking', () => {
    expect(directives.get('object-src')).toEqual(["'none'"]);
    expect(directives.get('base-uri')).toEqual(["'self'"]);
    expect(directives.get('form-action')).toEqual(["'self'"]);
  });

  it('never enables eval or third-party hosts', () => {
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval');
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/https?:\/\//);
  });
});
