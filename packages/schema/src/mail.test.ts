import { describe, expect, it } from 'vitest';
import { MailCatalog, MailDto, MailListResponse, MailTemplate } from './mail';

describe('Mail schema', () => {
  it('validates a complete mail template and catalog', () => {
    const template = {
      id: 'welcome-mail',
      sender: 'Thị trưởng Miu',
      title: { vi: 'Chào mừng bé!', en: 'Welcome!' },
      body: { vi: 'Chào mừng bé đến với thế giới Miu World!', en: 'Welcome to Miu World!' },
      category: 'system' as const,
      reward: { coins: 50, xp: 50, items: {} },
    };

    expect(MailTemplate.parse(template)).toEqual(expect.objectContaining({ id: 'welcome-mail' }));

    const catalog = { templates: [template] };
    expect(MailCatalog.parse(catalog).templates).toHaveLength(1);
  });

  it('validates MailDto and MailListResponse', () => {
    const mailItem = {
      id: '11111111-1111-4111-8111-111111111111',
      templateId: 'welcome-mail',
      sender: 'Thị trưởng Miu',
      title: 'Chào mừng bé!',
      body: 'Chào mừng bé đến với Miu World!',
      category: 'system' as const,
      isRead: false,
      isClaimed: false,
      reward: { coins: 50, xp: 50, items: {} },
      createdAt: new Date().toISOString(),
    };

    expect(MailDto.parse(mailItem)).toEqual(expect.objectContaining({ isRead: false, isClaimed: false }));

    const response = {
      mail: [mailItem],
      unreadCount: 1,
    };
    expect(MailListResponse.parse(response).unreadCount).toBe(1);
  });
});
