import { describe, expect, it } from 'vitest';
import { manifestVersions, versioned } from './asset-versions';

describe('asset URL versions', () => {
  it('adds the version to a URL, and leaves it plain when the version is unknown', () => {
    expect(versioned('/game-assets/a.png', 'abc123')).toBe('/game-assets/a.png?v=abc123');
    expect(versioned('/game-assets/a.png?x=1', 'abc123')).toBe('/game-assets/a.png?x=1&v=abc123');
    expect(versioned('/game-assets/a.png', undefined)).toBe('/game-assets/a.png');
  });

  it('takes the start of each file\'s sha256 from the manifest', () => {
    const versions = manifestVersions([{ path: 'a.png', sha256: '0123456789abcdef0123' }, { path: 'b.png' }]);
    expect(versions.get('a.png')).toBe('0123456789ab');
    expect(versions.has('b.png')).toBe(false);
  });
});
