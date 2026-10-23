import { describe, expect, it } from 'vitest';
import { createEndpoints, NATIVE_APP, SERVER_ORIGIN } from './endpoints';

const page = { protocol: 'https:', host: 'miu.hoandat.com', origin: 'https://miu.hoandat.com' };

describe('endpoints of the web build', () => {
  const web = createEndpoints('', () => page);

  it('keeps every address relative to the page, as before', () => {
    expect(web.native).toBe(false);
    expect(web.apiUrl('/me')).toBe('/api/me');
    expect(web.assetUrl('manifest.json')).toBe('/game-assets/manifest.json');
    expect(web.assetOrigin()).toBe('https://miu.hoandat.com');
    expect(web.webOrigin()).toBe('https://miu.hoandat.com');
  });

  it('opens the WebSocket on the page host, wss on https and ws on http', () => {
    expect(web.wsUrl('/api/ws?ticket=a')).toBe('wss://miu.hoandat.com/api/ws?ticket=a');
    const dev = createEndpoints('', () => ({ protocol: 'http:', host: 'localhost:5173', origin: 'http://localhost:5173' }));
    expect(dev.wsUrl('/api/ws')).toBe('ws://localhost:5173/api/ws');
  });

  it('is the build these tests run in: no server origin baked in', () => {
    expect(SERVER_ORIGIN).toBe('');
    expect(NATIVE_APP).toBe(false);
  });
});

describe('endpoints of the app build', () => {
  const appPage = { protocol: 'capacitor:', host: 'localhost', origin: 'capacitor://localhost' };
  const app = createEndpoints('https://miu.hoandat.com', () => appPage);

  it('puts the server origin in front of the API and the assets, never the app page origin', () => {
    expect(app.native).toBe(true);
    expect(app.apiUrl('/online-ticket')).toBe('https://miu.hoandat.com/api/online-ticket');
    expect(app.assetUrl('generated/world/forest/entities.json')).toBe('https://miu.hoandat.com/game-assets/generated/world/forest/entities.json');
    expect(app.assetOrigin()).toBe('https://miu.hoandat.com');
  });

  it('connects the WebSocket to the server and shares links of the public web', () => {
    expect(app.wsUrl('/api/ws?ticket=t')).toBe('wss://miu.hoandat.com/api/ws?ticket=t');
    expect(app.webOrigin()).toBe('https://miu.hoandat.com');
  });

  it('uses ws for a plain-http dev server', () => {
    const dev = createEndpoints('http://127.0.0.1:8787', () => appPage);
    expect(dev.wsUrl('/api/ws')).toBe('ws://127.0.0.1:8787/api/ws');
  });

  it('refuses a path without its leading slash', () => {
    expect(() => app.apiUrl('me')).toThrow(/must start with/);
    expect(() => app.wsUrl('api/ws')).toThrow(/must start with/);
  });
});
