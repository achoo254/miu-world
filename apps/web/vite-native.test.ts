import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from './vite.config';
import { SERVER_ORIGIN_ENV, coverViewport, nativeContentSecurityPolicy, nativeServerOrigin } from './vite-native';

const directives = (policy: string): Map<string, string[]> =>
  new Map(
    policy.split(';').map((d) => {
      const [name = '', ...values] = d.trim().split(/\s+/);
      return [name, values] as const;
    }),
  );

describe('server origin of the app build', () => {
  it('defaults to the public web origin of the brand', () => {
    expect(nativeServerOrigin({})).toBe('https://miu.hoandat.com');
    expect(nativeServerOrigin({ [SERVER_ORIGIN_ENV]: '' })).toBe('https://miu.hoandat.com');
  });

  it('takes another https origin, or plain http to this machine only', () => {
    expect(nativeServerOrigin({ [SERVER_ORIGIN_ENV]: 'https://miu.tunnel.hoandat.com/' })).toBe('https://miu.tunnel.hoandat.com');
    expect(nativeServerOrigin({ [SERVER_ORIGIN_ENV]: 'http://127.0.0.1:8787' })).toBe('http://127.0.0.1:8787');
    expect(() => nativeServerOrigin({ [SERVER_ORIGIN_ENV]: 'http://192.168.1.5:8787' })).toThrow(/https/);
  });

  it('refuses anything but a bare origin', () => {
    expect(() => nativeServerOrigin({ [SERVER_ORIGIN_ENV]: 'https://miu.hoandat.com/api' })).toThrow(/origin only/);
    expect(() => nativeServerOrigin({ [SERVER_ORIGIN_ENV]: 'https://user:pw@miu.hoandat.com' })).toThrow(/origin only/);
    expect(() => nativeServerOrigin({ [SERVER_ORIGIN_ENV]: 'not a url' })).toThrow(/not a URL/);
    expect(() => nativeServerOrigin({ [SERVER_ORIGIN_ENV]: 'capacitor://localhost' })).toThrow();
  });
});

describe('content security policy of the app build', () => {
  const web = directives(CONTENT_SECURITY_POLICY);
  const app = directives(nativeContentSecurityPolicy(CONTENT_SECURITY_POLICY, 'https://miu.hoandat.com'));

  it('adds the server where the app reaches it, and nothing else', () => {
    expect(app.get('connect-src')).toEqual([...(web.get('connect-src') ?? []), 'https://miu.hoandat.com', 'wss://miu.hoandat.com']);
    expect(app.get('img-src')).toEqual([...(web.get('img-src') ?? []), 'https://miu.hoandat.com']);
    expect(app.get('media-src')).toEqual([...(web.get('media-src') ?? []), 'https://miu.hoandat.com']);
    for (const [name, values] of web) if (!['connect-src', 'img-src', 'media-src'].includes(name)) expect(app.get(name), name).toEqual(values);
  });

  it('keeps scripts to the app itself, with no eval', () => {
    expect(app.get('script-src')).toEqual(["'self'"]);
    expect([...app.values()].flat()).not.toContain("'unsafe-eval'");
  });

  it('uses ws for a loopback dev server', () => {
    expect(directives(nativeContentSecurityPolicy(CONTENT_SECURITY_POLICY, 'http://127.0.0.1:8787')).get('connect-src')).toContain('ws://127.0.0.1:8787');
  });
});

describe('viewport of the app build', () => {
  it('extends the page under the notch, once', () => {
    const html = '<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />';
    const cover = coverViewport(html);
    expect(cover).toBe('<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover" />');
    expect(coverViewport(cover)).toBe(cover);
  });
});
