// Mailbox Modal Panel (Master Plan §6, system-screens-v1).
import { useEffect, useState } from 'react';
import type { MailDto } from '@miu/schema/mail';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { UI_ICONS, type UiIcon } from '../kit/ui-art';
import { T, useT } from '../i18n/use-t';
import { claimMailReward, fetchMailList, markMailRead } from './mail-api';
import './mail.css';

function resolveMailIcon(iconName: string | undefined, category: string): UiIcon {
  if (iconName && iconName in UI_ICONS) {
    return iconName as UiIcon;
  }
  return category === 'gift' ? 'gift' : 'package';
}

export interface MailPanelProps {
  onClose: () => void;
  onCoinsUpdated?: (coins: number) => void;
}

export function MailPanel({ onClose, onCoinsUpdated }: MailPanelProps) {
  const { t } = useT();
  const [mailList, setMailList] = useState<MailDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchMailList()
      .then((data) => {
        if (!alive) return;
        setMailList(data.mail);
        const first = data.mail[0];
        if (first) {
          setSelectedId(first.id);
        }
      })
      .catch(() => {
        // Ignored
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSelectMail = (item: MailDto) => {
    setSelectedId(item.id);
    if (!item.isRead) {
      void markMailRead(item.id).catch(() => undefined);
      setMailList((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, isRead: true } : m)),
      );
    }
  };

  const handleClaim = async (item: MailDto) => {
    if (claiming || item.isClaimed) return;
    setClaiming(true);
    try {
      const res = await claimMailReward(item.id);
      setMailList((prev) =>
        prev.map((m) =>
          m.id === item.id ? { ...m, isClaimed: true, isRead: true } : m,
        ),
      );
      if (onCoinsUpdated && typeof res.totalCoins === 'number') {
        onCoinsUpdated(res.totalCoins);
      }
    } catch {
      // Ignored
    } finally {
      setClaiming(false);
    }
  };

  const filteredMail =
    filter === 'unread' ? mailList.filter((m) => !m.isRead) : mailList;
  const selectedMail =
    mailList.find((m) => m.id === selectedId) || filteredMail[0] || null;
  const unreadCount = mailList.filter((m) => !m.isRead).length;

  return (
    <Modal title={<T k="mail.title" />} onClose={onClose} dataId="mailbox-dialog">
      <div className="mail-container">
        <div className="mail-header-tabs">
          <div className="mail-tabs">
            <button
              type="button"
              className="mail-tab-btn"
              aria-selected={filter === 'all'}
              data-id="mail-tab-all"
              onClick={() => setFilter('all')}
            >
              <T k="mail.tabAll" />
              <span className="mail-count-badge">{mailList.length}</span>
            </button>
            <button
              type="button"
              className="mail-tab-btn"
              aria-selected={filter === 'unread'}
              data-id="mail-tab-unread"
              onClick={() => setFilter('unread')}
            >
              <T k="mail.tabUnread" />
              {unreadCount > 0 ? (
                <span className="mail-count-badge">{unreadCount}</span>
              ) : null}
            </button>
          </div>
          <button
            type="button"
            className={buttonClass('ghost', { small: true })}
            data-id="mail-close-btn"
            onClick={onClose}
          >
            <T k="common.done" />
          </button>
        </div>

        <div
          className={`mail-content-layout ${selectedMail ? 'has-selected' : ''}`}
        >
          <div className="mail-list-pane" data-id="mail-list">
            {filteredMail.length === 0 ? (
              <div className="mail-empty-state">
                <p>
                  <T k="mail.empty" />
                </p>
              </div>
            ) : (
              filteredMail.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mail-card ${item.id === selectedMail?.id ? 'mail-card--active' : ''} ${!item.isRead ? 'mail-card--unread' : ''}`}
                  data-id={`mail-card-${item.id}`}
                  onClick={() => handleSelectMail(item)}
                >
                  <div className="mail-card-icon">
                    <Icon
                      name={resolveMailIcon(item.icon, item.category)}
                      size={28}
                    />
                  </div>
                  <div className="mail-card-info">
                    <div className="mail-card-header">
                      <span className="mail-card-sender">{item.sender}</span>
                      {item.reward && !item.isClaimed ? (
                        <span title={t('mail.hasReward')}>🎁</span>
                      ) : null}
                    </div>
                    <span className="mail-card-title">{item.title}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mail-detail-pane" data-id="mail-detail">
            {selectedMail ? (
              <>
                <button
                  type="button"
                  className={`mail-back-mobile ${buttonClass('ghost', { small: true })}`}
                  onClick={() => setSelectedId(null)}
                >
                  ← <T k="common.back" />
                </button>
                <div className="mail-detail-header">
                  <div className="mail-detail-sender">
                    <Icon
                      name={resolveMailIcon(
                        selectedMail.icon,
                        selectedMail.category,
                      )}
                      size={36}
                    />
                    <span className="mail-detail-sender-name">
                      {selectedMail.sender}
                    </span>
                  </div>
                  <span className="mail-detail-date">
                    {new Date(selectedMail.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="mail-detail-title">{selectedMail.title}</h3>
                <div className="mail-detail-body">{selectedMail.body}</div>

                {selectedMail.reward ? (
                  <div className="mail-reward-box">
                    <div className="mail-reward-info">
                      <span className="mail-reward-title">
                        <T k="mail.attachedReward" />
                      </span>
                      <div className="mail-reward-items">
                        {selectedMail.reward.coins ? (
                          <span className="mail-reward-chip">
                            <Icon name="coin" size={24} />+
                            {selectedMail.reward.coins}
                          </span>
                        ) : null}
                        {selectedMail.reward.xp ? (
                          <span className="mail-reward-chip">
                            <Icon name="glowingStar" size={24} />+
                            {selectedMail.reward.xp} XP
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={buttonClass(
                        selectedMail.isClaimed ? 'secondary' : 'primary',
                      )}
                      data-id="mail-claim-button"
                      disabled={selectedMail.isClaimed || claiming}
                      onClick={() => handleClaim(selectedMail)}
                    >
                      {selectedMail.isClaimed ? (
                        <T k="mail.claimed" />
                      ) : claiming ? (
                        <T k="mail.claiming" />
                      ) : (
                        <T k="mail.claim" />
                      )}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mail-empty-state">
                <p>
                  <T k="mail.selectPrompt" />
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
