// NEW SCREEN (Master Plan §6 MVP): Mất kết nối, theo mock "Offline" (designs/pause-settings-loading.png,
// ô 5), hướng A. No offline play: rewards are computed on the server, so the child retries
// (validation decision `offline_behavior` = block_with_retry). Progress already saved stays safe.
import { useState } from 'react';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';

export function OfflineBanner({ onRetry }: { onRetry: () => Promise<unknown> }) {
  const [retrying, setRetrying] = useState(false);
  async function retry() {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }
  return (
    <Modal title="Mất kết nối mạng" dataId="offline">
      <p className="offline-body">
        <Icon name="antennaBars" size={56} />
        Miu World cần mạng để lưu tiến độ. Những gì bé đã làm được vẫn an toàn.
      </p>
      <button type="button" className={buttonClass('primary', { block: true })} data-id="offline-retry" disabled={retrying} onClick={() => void retry()}>
        {retrying ? 'Đang kết nối lại…' : 'Thử kết nối lại'}
      </button>
    </Modal>
  );
}
