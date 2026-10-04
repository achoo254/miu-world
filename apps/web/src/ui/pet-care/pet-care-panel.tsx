import { useEffect, useState } from 'react';
import { PetCareResponse, PetCareStats, PetCareStatusResponse } from '@miu/schema/pet-care';
import { api } from '../api-client';
import { buttonClass } from '../kit/button';
import './pet-care.css';

export interface PetCarePanelProps {
  onClose?: () => void;
  onActionFeedback?: (action: string, message: string, emote: string) => void;
}

export function PetCarePanel({ onClose, onActionFeedback }: PetCarePanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PetCareStatusResponse | null>(null);
  const [acting, setActing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api('GET', '/character/pet/care', PetCareStatusResponse)
      .then((res) => {
        if (alive) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleAction(action: 'feed' | 'pet' | 'bath' | 'play') {
    if (acting) return;
    setActing(true);
    try {
      const res = await api('POST', '/character/pet/care', PetCareResponse, { action });
      setData((prev) => (prev ? { ...prev, stats: res.stats, friendshipTier: res.friendshipTier, title: res.title } : prev));
      setFeedback(res.message);
      onActionFeedback?.(action, res.message, res.emote);
    } catch {
      setFeedback('Chưa thể thực hiện lúc này, thử lại sau nhé!');
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return <div className="pet-care-loading">Đang mở sổ chăm thú cưng... 🐾</div>;
  }

  if (!data || !data.hasPet) {
    return (
      <div className="pet-care-empty" data-id="pet-care-empty">
        <p className="pet-care-empty-icon">🐱</p>
        <p className="pet-care-empty-text">Bé chưa chọn thú cưng đồng hành!</p>
        <p className="pet-care-empty-hint">Hãy ghé màn Hồ sơ để dẫn theo một bé thú cưng đáng yêu nhé.</p>
        {onClose && (
          <button type="button" className={buttonClass('primary', { block: true })} onClick={onClose}>
            Đóng
          </button>
        )}
      </div>
    );
  }

  const stats: PetCareStats = data.stats ?? { happiness: 80, fullness: 75, cleanliness: 85 };
  const tier = data.friendshipTier ?? 1;

  return (
    <div className="pet-care-panel" data-id="pet-care-panel">
      <header className="pet-care-header">
        <div className="pet-care-avatar">🐾</div>
        <div className="pet-care-title-box">
          <h3 className="pet-care-name">{data.petName ?? 'Thú cưng'}</h3>
          <span className="pet-care-badge" data-tier={tier}>
            {'⭐'.repeat(tier)} {data.title ?? 'Bạn Đồng Hành'}
          </span>
        </div>
      </header>

      {feedback && (
        <div className="pet-care-message" data-id="pet-care-feedback">
          {feedback}
        </div>
      )}

      <div className="pet-care-stats">
        <div className="pet-stat-row">
          <span className="pet-stat-label">💖 Vui vẻ</span>
          <div className="pet-stat-bar-bg">
            <div className="pet-stat-bar pet-stat-happy" style={{ width: `${stats.happiness}%` }} />
          </div>
          <span className="pet-stat-val">{stats.happiness}%</span>
        </div>

        <div className="pet-stat-row">
          <span className="pet-stat-label">🥕 No bụng</span>
          <div className="pet-stat-bar-bg">
            <div className="pet-stat-bar pet-stat-full" style={{ width: `${stats.fullness}%` }} />
          </div>
          <span className="pet-stat-val">{stats.fullness}%</span>
        </div>

        <div className="pet-stat-row">
          <span className="pet-stat-label">🫧 Sạch sẽ</span>
          <div className="pet-stat-bar-bg">
            <div className="pet-stat-bar pet-stat-clean" style={{ width: `${stats.cleanliness}%` }} />
          </div>
          <span className="pet-stat-val">{stats.cleanliness}%</span>
        </div>
      </div>

      <div className="pet-care-actions">
        <button
          type="button"
          className="pet-care-btn pet-btn-feed"
          data-id="pet-action-feed"
          disabled={acting}
          onClick={() => handleAction('feed')}
        >
          <span className="pet-btn-icon">🥕</span>
          <span className="pet-btn-text">Cho ăn</span>
        </button>

        <button
          type="button"
          className="pet-care-btn pet-btn-pet"
          data-id="pet-action-pet"
          disabled={acting}
          onClick={() => handleAction('pet')}
        >
          <span className="pet-btn-icon">❤️</span>
          <span className="pet-btn-text">Vuốt ve</span>
        </button>

        <button
          type="button"
          className="pet-care-btn pet-btn-bath"
          data-id="pet-action-bath"
          disabled={acting}
          onClick={() => handleAction('bath')}
        >
          <span className="pet-btn-icon">🫧</span>
          <span className="pet-btn-text">Tắm rửa</span>
        </button>

        <button
          type="button"
          className="pet-care-btn pet-btn-play"
          data-id="pet-action-play"
          disabled={acting}
          onClick={() => handleAction('play')}
        >
          <span className="pet-btn-icon">🎵</span>
          <span className="pet-btn-text">Chơi đùa</span>
        </button>
      </div>
    </div>
  );
}
