import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '../../apps/web/vite-seo-meta';
import { ASSETS_DIR } from '../assets/asset-lib';
import { CHANNEL_KIT_IMAGES, ChannelKit, FACEBOOK_SHORT_DESCRIPTION_MAX, PROFILE_PICTURE, YOUTUBE_DESCRIPTION_MAX, readChannelKit, utmUrl } from './channels';

const kit = readChannelKit();

/** Width and height from a PNG's header. */
function pngSize(rel: string): { width: number; height: number } {
  const bytes = readFileSync(path.join(ASSETS_DIR, rel));
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('the channel kit', () => {
  it('names both channels "Miu World" and fits the limits of the two sites', () => {
    expect(kit.name).toBe('Miu World');
    expect(kit.youtube.channelName).toBe('Miu World');
    expect(kit.facebook.pageName).toBe('Miu World');
    expect(kit.youtube.description.length).toBeLessThanOrEqual(YOUTUBE_DESCRIPTION_MAX);
    expect(kit.facebook.shortDescription.length).toBeLessThanOrEqual(FACEBOOK_SHORT_DESCRIPTION_MAX);
  });

  it('links only to the game, each link tagged with the channel it sits on', () => {
    const youtubeLinks = [...kit.youtube.links.map((l) => l.url), ...(kit.youtube.description.match(/https:\/\/\S+/g) ?? [])];
    for (const url of youtubeLinks) {
      expect(url.startsWith(`${SITE_ORIGIN}/`), url).toBe(true);
      expect(new URL(url).searchParams.get('utm_source'), url).toBe('youtube');
      expect(new URL(url).searchParams.get('utm_medium'), url).toBe('social');
    }
    expect(youtubeLinks.length).toBeGreaterThan(0);
    expect(kit.facebook.website.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
    expect(new URL(kit.facebook.website).searchParams.get('utm_source')).toBe('facebook');
  });

  it('offers handles in the form each site accepts, and says the clips are made for kids', () => {
    expect(kit.youtube.handleSuggestions.length).toBeGreaterThan(1);
    expect(kit.facebook.usernameSuggestions.length).toBeGreaterThan(1);
    expect(kit.youtube.madeForKids).toBe(true);
  });

  it('is rejected when a limit is broken or a field is unknown', () => {
    expect(ChannelKit.safeParse({ ...kit, youtube: { ...kit.youtube, description: 'x'.repeat(YOUTUBE_DESCRIPTION_MAX + 1) } }).success).toBe(false);
    expect(ChannelKit.safeParse({ ...kit, extra: 1 }).success).toBe(false);
    expect(ChannelKit.safeParse({ ...kit, facebook: { ...kit.facebook, website: 'http://miu.hoandat.com/' } }).success).toBe(false);
  });
});

describe('the generated pictures', () => {
  it('have the sizes the two sites ask for, and the safe area of the YouTube banner fits inside', () => {
    expect(pngSize(CHANNEL_KIT_IMAGES.youtubeBanner.file)).toEqual({ width: 2560, height: 1440 });
    expect(pngSize(CHANNEL_KIT_IMAGES.facebookCover.file)).toEqual({ width: 1640, height: 856 });
    expect(CHANNEL_KIT_IMAGES.youtubeBanner.safe.width).toBeLessThan(CHANNEL_KIT_IMAGES.youtubeBanner.width);
    expect(CHANNEL_KIT_IMAGES.youtubeBanner.safe.height).toBeLessThan(CHANNEL_KIT_IMAGES.youtubeBanner.height);
  });

  it('use the app logo as the profile picture', () => {
    expect(pngSize(PROFILE_PICTURE)).toEqual({ width: 512, height: 512 });
  });
});

describe('tagged links', () => {
  it('add the source, the medium and the campaign, keeping the rest of the address', () => {
    expect(utmUrl('https://miu.hoandat.com/bai/x/', 'facebook', 'weekly-clip')).toBe('https://miu.hoandat.com/bai/x/?utm_source=facebook&utm_medium=social&utm_campaign=weekly-clip');
    expect(utmUrl('https://miu.hoandat.com/?ref=a', 'youtube', 'c')).toBe('https://miu.hoandat.com/?ref=a&utm_source=youtube&utm_medium=social&utm_campaign=c');
  });
});
