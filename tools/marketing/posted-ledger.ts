// The ledger of what the weekly run has posted (`content/marketing/posted.json`). A lesson's clip is posted once per
// channel: the run skips what is in the ledger, and writes to it only after a post succeeded for real, so a failed or dry
// run leaves it alone and the next run tries again. The ledger also remembers which caption template each post used, so the
// next caption on that channel can differ.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { REPO_ROOT } from '../assets/asset-lib';
import { CHANNELS, type Channel } from './channels';
import { PRIVACY } from './post-common';

export const LEDGER_PATH = path.join(REPO_ROOT, 'content/marketing/posted.json');

export const PostedEntry = z.strictObject({
  lessonId: z.string().min(1),
  channel: z.enum(CHANNELS),
  /** School week of the schedule the clip went out in. */
  week: z.number().int().min(1),
  postedAt: z.iso.datetime(),
  templateId: z.string().min(1),
  /** What the post was made as; a `private` first post is made public by hand in the channel. */
  privacy: z.enum(PRIVACY),
  url: z.url(),
});
export type PostedEntry = z.infer<typeof PostedEntry>;

export const PostedLedger = z.strictObject({ version: z.literal(1), posts: z.array(PostedEntry) });
export type PostedLedger = z.infer<typeof PostedLedger>;

export function readLedger(file: string = LEDGER_PATH): PostedLedger {
  const ledger = PostedLedger.parse(JSON.parse(readFileSync(file, 'utf8')));
  const seen = new Set<string>();
  for (const post of ledger.posts) {
    const key = `${post.lessonId}/${post.channel}`;
    if (seen.has(key)) throw new Error(`${path.relative(REPO_ROOT, file)}: ${post.lessonId} is posted twice on ${post.channel}`);
    seen.add(key);
  }
  return ledger;
}

export const hasPosted = (ledger: PostedLedger, lessonId: string, channel: Channel): boolean => ledger.posts.some((p) => p.lessonId === lessonId && p.channel === channel);

/** The caption templates of a channel's posts, newest first. */
export const recentTemplateIds = (ledger: PostedLedger, channel: Channel): string[] =>
  ledger.posts
    .filter((p) => p.channel === channel)
    .map((p) => p.templateId)
    .reverse();

/** Adds a post and writes the ledger whole (to a temporary file first, so an interrupted write cannot leave half a ledger). Returns the new ledger. */
export function appendPost(entry: PostedEntry, file: string = LEDGER_PATH): PostedLedger {
  const ledger = readLedger(file);
  if (hasPosted(ledger, entry.lessonId, entry.channel)) throw new Error(`${entry.lessonId} is already in the ledger for ${entry.channel}`);
  const next: PostedLedger = { version: 1, posts: [...ledger.posts, PostedEntry.parse(entry)] };
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`);
  renameSync(temporary, file);
  return next;
}
