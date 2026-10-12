import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLessonPageData } from '../../apps/web/lesson-page-data';
import { REPO_ROOT } from '../assets/asset-lib';
import { CHANNELS } from './channels';
import { TEMPLATES, TEMPLATES_SET_ASIDE, TITLE_MAX, allowedTemplates, captionFor, clip, lessonLink } from './captions';

const lessons = readLessonPageData(path.join(REPO_ROOT, 'content'));
const first = lessons[0];
if (!first) throw new Error('no lesson pages');
const longest = [...lessons].sort((a, b) => b.title.length - a.title.length)[0] ?? first;

describe('captions', () => {
  it('give every lesson on every channel a title within the limit, the tagged page link and the hashtags', () => {
    for (const lesson of lessons) {
      for (const channel of CHANNELS) {
        const caption = captionFor(lesson, channel);
        expect(caption.title.length, `${lesson.lessonId} ${channel}`).toBeLessThanOrEqual(TITLE_MAX);
        expect(caption.title.length).toBeGreaterThan(10);
        expect(caption.description).toContain(`https://miu.hoandat.com/bai/${lesson.slug}/?utm_source=${channel}&utm_medium=social&utm_campaign=weekly-clip`);
        for (const tag of caption.hashtags) expect(caption.description).toContain(tag);
      }
    }
  });

  it('put #Shorts on YouTube and not on Facebook, and name the subject in a hashtag', () => {
    expect(captionFor(first, 'youtube').hashtags[0]).toBe('#Shorts');
    expect(captionFor(first, 'facebook').hashtags).not.toContain('#Shorts');
    expect(captionFor(first, 'facebook').hashtags).toContain('#Toan2');
    const tv = lessons.find((l) => l.subject.slug === 'tieng-viet-2');
    expect(tv && captionFor(tv, 'youtube').hashtags).toContain('#TiengViet2');
  });

  it('tag a link by the channel it was posted on and mention no one', () => {
    expect(lessonLink(first, 'youtube')).toContain('utm_source=youtube');
    expect(lessonLink(first, 'facebook')).toContain('utm_source=facebook');
    for (const channel of CHANNELS) expect(captionFor(first, channel).description).not.toContain('@');
  });

  it('cut a long title at a word and end it with an ellipsis', () => {
    const cut = clip(`${'từ '.repeat(60)}`, TITLE_MAX);
    expect(cut.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(cut.endsWith('…')).toBe(true);
    expect(clip('ngắn', TITLE_MAX)).toBe('ngắn');
    expect(captionFor(longest, 'youtube').title.length).toBeLessThanOrEqual(TITLE_MAX);
  });

  it('is the same for the same lesson and history', () => {
    expect(captionFor(first, 'youtube', ['adventure'])).toEqual(captionFor(first, 'youtube', ['adventure']));
  });
});

describe('rotating templates', () => {
  it('keeps the latest templates of a channel out of the next caption, newest first', () => {
    const recent = TEMPLATES.slice(0, TEMPLATES_SET_ASIDE).map((t) => t.id);
    const ids = allowedTemplates(recent).map((t) => t.id);
    for (const id of recent) expect(ids).not.toContain(id);
    expect(ids).toHaveLength(TEMPLATES.length - TEMPLATES_SET_ASIDE);
    // Older than the set-aside window is free again.
    expect(allowedTemplates([...recent, 'adventure']).map((t) => t.id)).toContain('adventure');
  });

  it('never repeats a template on consecutive posts, over a whole semester of posts', () => {
    for (const channel of CHANNELS) {
      const history: string[] = [];
      for (const lesson of lessons) {
        const { templateId } = captionFor(lesson, channel, history);
        expect(history.slice(0, TEMPLATES_SET_ASIDE), `${lesson.lessonId} ${channel}`).not.toContain(templateId);
        history.unshift(templateId);
      }
    }
  });

  it('uses most of the templates across a run of posts', () => {
    const history: string[] = [];
    for (const lesson of lessons) history.unshift(captionFor(lesson, 'youtube', history).templateId);
    expect(new Set(history).size).toBeGreaterThanOrEqual(TEMPLATES.length - 1);
  });

  it('always leaves a template to use', () => {
    expect(allowedTemplates(TEMPLATES.map((t) => t.id)).length).toBeGreaterThan(0);
    expect(TEMPLATES.length).toBeGreaterThan(TEMPLATES_SET_ASIDE + 1);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });
});
