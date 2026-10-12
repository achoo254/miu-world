// The words that go with a weekly clip: a title and a description for each channel, with the lesson page's address (tagged
// with where it was posted) and the hashtags. The title and the opening lines come from rotating templates, and a template
// is never one of the last few posted on that channel, so consecutive posts never read the same.
import { createHash } from 'node:crypto';
import type { LessonPageData } from '../../apps/web/lesson-page-data';
import { SITE_ORIGIN } from '../../apps/web/vite-seo-meta';
import { lessonPagePath, splitLessonTitle } from '../../packages/schema/src/lesson-pages';
import { utmUrl, type Channel } from './channels';

/** `utm_campaign` of every weekly clip's links. */
export const CAMPAIGN = 'weekly-clip';
/** YouTube cuts a title at 100 characters. */
export const TITLE_MAX = 100;
/** How many of the latest templates of a channel are set aside when the next caption is chosen. */
export const TEMPLATES_SET_ASIDE = 3;

interface Words {
  /** "Bài 7" (null for a revision lesson, which has no number). */
  label: string | null;
  /** The lesson's name without its number: "Phép cộng (qua 10) trong phạm vi 20". */
  name: string;
  /** "Toán 2" or "Tiếng Việt 2". */
  subject: string;
}

interface Template {
  id: string;
  title: (w: Words) => string;
  /** The lines before the link. */
  opening: (w: Words) => string[];
}

const numbered = (w: Words): string => (w.label ? `${w.label}: ` : '');

export const TEMPLATES: readonly Template[] = [
  {
    id: 'lesson-name',
    title: (w) => `${w.subject} ${numbered(w)}${w.name}`,
    opening: (w) => [`Tuần này ở lớp học ${w.subject}: ${w.name}.`, 'Cùng Miu bay một vòng qua nơi có nhiệm vụ của bài này, rồi vào game chơi thật nhé.'],
  },
  {
    id: 'revise-with-miu',
    title: (w) => `Cùng Miu ôn ${w.subject}: ${w.name}`,
    opening: (w) => [`Ôn lại “${w.name}” (${w.subject}) bằng cách đi làm nhiệm vụ trong thế giới khối.`, 'Clip ngắn, game thật, chơi ngay trên trình duyệt.'],
  },
  {
    id: 'book-line',
    title: (w) => `${w.name} | ${w.subject} Kết nối tri thức`,
    opening: (w) => [`${w.subject}, bộ Kết nối tri thức với cuộc sống${w.label ? `, ${w.label.toLowerCase()}` : ''}: ${w.name}.`, 'Mỗi nhiệm vụ trong game ôn đúng một bài của sách.'],
  },
  {
    id: 'play-and-learn',
    title: (w) => `Vừa chơi vừa học: ${w.name} (${w.subject})`,
    opening: (w) => ['Học mà chơi, chơi mà học.', `Hôm nay: ${w.name}, bài của sách ${w.subject}.`],
  },
  {
    id: 'quick-review',
    title: (w) => `Ôn nhanh ${w.subject}: ${w.name}`,
    opening: (w) => [`Chỉ cần vài phút để nhớ lại ${w.label ? w.label.toLowerCase() : 'bài ôn tập'} “${w.name}”.`, 'Vào game, làm nhiệm vụ, chép đáp án đúng vào vở là xong.'],
  },
  {
    id: 'adventure',
    title: (w) => `Cuộc phiêu lưu của ${w.subject}: ${w.name}`,
    opening: (w) => [`Một nhiệm vụ mới đang chờ ở khu vực của bài “${w.name}”.`, 'Miu bay qua trước cho bạn xem đường đi.'],
  },
  {
    id: 'friends-quest',
    title: (w) => `${w.name}: nhiệm vụ ${w.subject} trong game 3D`,
    opening: (w) => [`Rủ bạn cùng vào game làm nhiệm vụ “${w.name}”.`, `Bài này thuộc sách ${w.subject}${w.label ? `, ${w.label.toLowerCase()}` : ''}.`],
  },
];

const SUBJECT_HASHTAG: Readonly<Record<string, string>> = { 'toan-2': '#Toan2', 'tieng-viet-2': '#TiengViet2' };

export interface Caption {
  /** The template the words came from, to be remembered by the ledger. */
  templateId: string;
  title: string;
  description: string;
  hashtags: string[];
}

/** `text` cut to `max` characters at a word end, with an ellipsis. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const room = text.slice(0, max - 1);
  const cut = room.lastIndexOf(' ');
  return `${(cut > max / 2 ? room.slice(0, cut) : room).replace(/[\s,;:–-]+$/, '')}…`;
}

export function hashtagsFor(lesson: LessonPageData, channel: Channel): string[] {
  const subject = SUBJECT_HASHTAG[lesson.subject.slug];
  if (!subject) throw new Error(`no hashtag for subject ${lesson.subject.slug}`);
  return [...(channel === 'youtube' ? ['#Shorts'] : []), '#MiuWorld', subject, '#KetNoiTriThuc', '#HocMaChoi'];
}

/** The address of the lesson page as it is posted on a channel. */
export const lessonLink = (lesson: LessonPageData, channel: Channel): string => utmUrl(`${SITE_ORIGIN}${lessonPagePath(lesson.slug)}`, channel, CAMPAIGN);

/**
 * The templates a caption may use: all but the `recent` ones (most recent first) that are still set aside. At least one is
 * always left, so a short list or a long run of posts never leaves nothing to choose.
 */
export function allowedTemplates(recent: readonly string[]): Template[] {
  const keep = Math.min(TEMPLATES_SET_ASIDE, TEMPLATES.length - 1);
  const aside = new Set(recent.slice(0, keep));
  return TEMPLATES.filter((t) => !aside.has(t.id));
}

/** The caption of a lesson's clip on a channel; `recentTemplateIds` are the templates of that channel's latest posts, newest first. */
export function captionFor(lesson: LessonPageData, channel: Channel, recentTemplateIds: readonly string[] = []): Caption {
  const { label, name } = splitLessonTitle(lesson.title);
  const words: Words = { label, name, subject: lesson.subject.name };
  const choices = allowedTemplates(recentTemplateIds);
  const hash = createHash('sha256').update(`${lesson.lessonId}:${channel}`).digest().readUInt32BE(0);
  const template = choices[hash % choices.length];
  if (!template) throw new Error('no caption template');
  const hashtags = hashtagsFor(lesson, channel);
  const description = [
    ...template.opening(words),
    '',
    `Chơi bài này miễn phí: ${lessonLink(lesson, channel)}`,
    '',
    `Sách ${lesson.subject.name} (Kết nối tri thức với cuộc sống), trang ${lesson.page}. Không quảng cáo.`,
    '',
    hashtags.join(' '),
  ].join('\n');
  return { templateId: template.id, title: clip(template.title(words), TITLE_MAX), description, hashtags };
}
