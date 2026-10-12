// The two channels the weekly clips go to (`content/marketing/channels.json`): what the owner types when creating the
// YouTube channel and the Facebook Page, and what the image generator (`pnpm assets:channel-kit`) draws on their
// banners. Also the one place that builds a link with its campaign tags, so every address a post carries is tagged the
// same way.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { REPO_ROOT } from '../assets/asset-lib';

export const CHANNELS_PATH = path.join(REPO_ROOT, 'content/marketing/channels.json');

/** Where a post is published: the `utm_source` of its links. */
export const CHANNELS = ['youtube', 'facebook'] as const;
export type Channel = (typeof CHANNELS)[number];

/** YouTube takes at most 1000 characters in a channel description and Facebook 255 in a Page's short description. */
export const YOUTUBE_DESCRIPTION_MAX = 1000;
export const FACEBOOK_SHORT_DESCRIPTION_MAX = 255;

/** The pictures `pnpm assets:channel-kit` draws, in `assets/` (the profile picture is the app logo, `generated/brand/miu-logo-512.png`). */
export const CHANNEL_KIT_IMAGES = {
  /** YouTube banner; the middle 1546 × 423 is what every screen (phone to TV) shows, so the words stay inside it. */
  youtubeBanner: { file: 'generated/channel-kit/youtube-banner.png', width: 2560, height: 1440, safe: { width: 1546, height: 423 } },
  /** Facebook Page cover; a computer shows the middle 624 of its 856 rows, and the profile picture covers the lower left. */
  facebookCover: { file: 'generated/channel-kit/facebook-cover.png', width: 1640, height: 856 },
} as const;
export const PROFILE_PICTURE = 'generated/brand/miu-logo-512.png';

const Url = z.url({ protocol: /^https$/ });

export const ChannelKit = z.strictObject({
  version: z.literal(1),
  name: z.string().min(1),
  tagline: z.string().min(1),
  youtube: z.strictObject({
    channelName: z.string().min(1),
    /** Handles to try, best first: a handle is global and may already be taken. */
    handleSuggestions: z.array(z.string().regex(/^@[A-Za-z0-9._-]{3,30}$/)).min(1),
    category: z.string().min(1),
    /** YouTube makes the owner declare whether a video is made for kids; these clips are about a grade 2 lesson, so they are. */
    madeForKids: z.boolean(),
    language: z.string().length(2),
    country: z.string().length(2),
    description: z.string().min(1).max(YOUTUBE_DESCRIPTION_MAX),
    keywords: z.array(z.string().min(1)).min(1),
    links: z.array(z.strictObject({ title: z.string().min(1).max(30), url: Url })).min(1).max(14),
  }),
  facebook: z.strictObject({
    pageName: z.string().min(1),
    usernameSuggestions: z.array(z.string().regex(/^[a-z0-9.]{5,50}$/)).min(1),
    category: z.string().min(1),
    shortDescription: z.string().min(1).max(FACEBOOK_SHORT_DESCRIPTION_MAX),
    description: z.string().min(1),
    website: Url,
    callToAction: z.string().min(1),
  }),
});
export type ChannelKit = z.infer<typeof ChannelKit>;

export function readChannelKit(file: string = CHANNELS_PATH): ChannelKit {
  return ChannelKit.parse(JSON.parse(readFileSync(file, 'utf8')));
}

/** `url` with the tags analytics reads a visit by: where the link was posted (`source`) and which campaign. */
export function utmUrl(url: string, source: Channel, campaign: string): string {
  const tagged = new URL(url);
  tagged.searchParams.set('utm_source', source);
  tagged.searchParams.set('utm_medium', 'social');
  tagged.searchParams.set('utm_campaign', campaign);
  return tagged.toString();
}
