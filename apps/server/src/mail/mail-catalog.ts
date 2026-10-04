import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { MailCatalog, type LocalizedText, type MailTemplate } from '@miu/schema/mail';
import { CONTENT_DIR } from '../content/content-dir';

export function loadMailCatalog(contentDir: string = CONTENT_DIR): MailTemplate[] {
  const filePath = path.join(contentDir, 'mail/templates.json');
  if (!existsSync(filePath)) {
    return [];
  }
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  const parsed = MailCatalog.parse(raw);
  return parsed.templates;
}

export function resolveLocalizedText(
  text: LocalizedText,
  language: 'vi' | 'en' | 'both' = 'vi',
  name: string = 'bé',
): string {
  let str: string;
  if (typeof text === 'string') {
    str = text;
  } else if (language === 'en') {
    str = text.en;
  } else {
    str = text.vi;
  }
  return str.replace(/\{name\}/g, name);
}
