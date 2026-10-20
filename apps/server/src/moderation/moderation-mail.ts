// The letters moderation sends to the in-game mailbox: the moderator's daily digest of new reports, and the decision
// a reported player is told of. Each letter is a mail row whose template id is `<kind>:<key>` (one per digest day or
// per report and decision), with the values it fills in (`mail.params`: a count, a new name, a date) chosen by the
// server, never typed by a player. `{name}` is her character's name, filled in when the mailbox is read.
import { defineBrand } from '@shared-next/brand';
import type { MailTemplate } from '@miu/schema/mail';
import config from '../../../../brand.config.json' with { type: 'json' };

export const MODERATION_MAIL_KINDS = ['moderation-digest', 'moderation-warning', 'moderation-renamed', 'moderation-locked-temp', 'moderation-locked', 'moderation-reopened'] as const;
export type ModerationMailKind = (typeof MODERATION_MAIL_KINDS)[number];

// The bundle inlines brand.config.json; its schema is checked at build time (pnpm brand:gen, the web build).
const SENDER = defineBrand(config).appName;

const TEMPLATES: Record<ModerationMailKind, MailTemplate> = {
  'moderation-digest': {
    id: 'moderation-digest',
    sender: SENDER,
    category: 'system',
    icon: 'package',
    title: { vi: 'Báo cáo mới cần xem: {count}', en: 'New reports to review: {count}' },
    body: {
      vi: 'Từ bản tóm tắt trước có {count} báo cáo mới; tổng cộng {open} báo cáo đang chờ quyết định. Mở màn Kiểm duyệt (trang /kiem-duyet) để xem từng báo cáo và xử lý. Ca gấp thì dùng công tắc khẩn cấp ở đầu màn đó.',
      en: 'Since the last digest there are {count} new reports; {open} reports in all are waiting for a decision. Open the Moderation screen (page /kiem-duyet) to review and handle each one. For an emergency, use the switch at the top of that screen.',
    },
  },
  'moderation-warning': {
    id: 'moderation-warning',
    sender: SENDER,
    category: 'system',
    icon: 'package',
    title: { vi: 'Nhắc nhở về cách chơi cùng mọi người', en: 'A reminder about playing with others' },
    body: {
      vi: 'Chào {name}! Có người chơi đã báo cáo rằng cách chơi online của bạn làm người khác không vui. Người kiểm duyệt đã xem và gửi lời nhắc này: hãy chào hỏi, mời và trò chuyện thật thân thiện nhé. Nếu còn bị báo cáo, việc chơi online có thể bị tạm khóa.',
      en: 'Hi {name}! A player reported that the way you play online upset others. A moderator looked into it and sends you this reminder: greet, invite and chat in a friendly way. If more reports come in, online play may be locked for a while.',
    },
  },
  'moderation-renamed': {
    id: 'moderation-renamed',
    sender: SENDER,
    category: 'system',
    icon: 'package',
    title: { vi: 'Tên nhân vật đã được đổi', en: 'Your character has a new name' },
    body: {
      vi: 'Chào {name}! Tên nhân vật trước đây của bạn bị báo cáo là không hợp khi chơi cùng mọi người, nên người kiểm duyệt đã đổi thành {newName}. Bạn vẫn chọn được tên khác trong danh sách tên ở màn nhân vật; hãy chọn một tên thân thiện nhé.',
      en: 'Hi {name}! Your previous character name was reported as unsuitable when playing with others, so a moderator changed it to {newName}. You can still pick another name from the list on the character screen; please choose a friendly one.',
    },
  },
  'moderation-locked-temp': {
    id: 'moderation-locked-temp',
    sender: SENDER,
    category: 'system',
    icon: 'package',
    title: { vi: 'Chơi online tạm nghỉ', en: 'Online play is paused for a while' },
    body: {
      vi: 'Chào {name}! Sau khi xem các báo cáo, người kiểm duyệt tạm khóa việc chơi online của bạn tới {until} (giờ Việt Nam). Trong lúc đó bạn vẫn chơi một mình, học bài và nhận thưởng như thường; người chơi khác tạm thời không thấy bạn.',
      en: 'Hi {name}! After looking at the reports, a moderator paused your online play until {until} (Vietnam time). Meanwhile you can still play on your own, do lessons and earn rewards as usual; other players will not see you for now.',
    },
  },
  'moderation-locked': {
    id: 'moderation-locked',
    sender: SENDER,
    category: 'system',
    icon: 'package',
    title: { vi: 'Chơi online đã bị khóa', en: 'Online play is locked' },
    body: {
      vi: 'Chào {name}! Sau khi xem các báo cáo, người kiểm duyệt đã khóa việc chơi online của bạn. Bạn vẫn chơi một mình, học bài và nhận thưởng như thường; người chơi khác không thấy bạn nữa.',
      en: 'Hi {name}! After looking at the reports, a moderator locked your online play. You can still play on your own, do lessons and earn rewards as usual; other players no longer see you.',
    },
  },
  'moderation-reopened': {
    id: 'moderation-reopened',
    sender: SENDER,
    category: 'system',
    icon: 'package',
    title: { vi: 'Chơi online đã mở lại', en: 'Online play is open again' },
    body: {
      vi: 'Chào {name}! Người kiểm duyệt đã xem lại các báo cáo và mở lại việc chơi online cho bạn. Chúc bạn chơi vui cùng mọi người!',
      en: 'Hi {name}! A moderator reviewed the reports and opened online play for you again. Have fun playing with everyone!',
    },
  },
};

/** The template of a moderation letter (`<kind>:<key>`), or undefined for any other mail. */
export function moderationTemplate(templateId: string): MailTemplate | undefined {
  const kind = templateId.split(':')[0];
  return (MODERATION_MAIL_KINDS as readonly string[]).includes(kind ?? '') ? TEMPLATES[kind as ModerationMailKind] : undefined;
}

/** The template id of one letter: one per kind and key (a digest day, a report). */
export const moderationMailId = (kind: ModerationMailKind, key: string): string => `${kind}:${key}`;

/** Fills `{key}` placeholders with the server's values (anything not given stays as it is, `{name}` included). */
export function fillParams(text: string, params: Readonly<Record<string, string>> | null | undefined): string {
  if (!params) return text;
  return text.replace(/\{([a-zA-Z]+)\}/g, (whole, key: string) => (key !== 'name' && Object.hasOwn(params, key) ? (params[key] ?? whole) : whole));
}
