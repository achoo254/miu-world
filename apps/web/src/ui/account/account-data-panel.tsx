// Khu phụ huynh: quyền với dữ liệu (tải về, xóa tài khoản). Theo visual language M1–M3, hướng A.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { AccountExport } from '@miu/schema/account';
import { api } from '../api-client';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { useAccount } from './account-context';
import { useSubmit } from './use-submit';

/** Hands the export to the browser as a file; nothing is kept in the page. */
function saveJson(data: AccountExport): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `miu-world-du-lieu-${data.exportedAt.slice(0, 10)}.json`;
  link.click();
  // Safari starts the download asynchronously; revoking at once can cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AccountDataPanel() {
  const { signOut } = useAccount();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const download = useSubmit(async () => saveJson(await api('GET', '/account/export', AccountExport)));
  const remove = useSubmit(async () => {
    await api('DELETE', '/account', z.undefined());
    signOut();
    navigate('/login');
  });
  const error = download.error ?? remove.error;

  return (
    <section className="panel" data-id="parent-data" aria-labelledby="parent-data-title">
      <div className="panel-title">
        <Icon name="heart" size={40} />
        <h2 id="parent-data-title">Dữ liệu của bạn</h2>
      </div>
      <p className="hint">
        Xem chúng tôi lưu gì ở trang <Link to="/privacy">Quyền riêng tư</Link>.
      </p>
      <div className="row">
        <button type="button" className={buttonClass('secondary')} data-id="parent-data-export" disabled={download.busy} onClick={() => void download.onSubmit()}>
          Tải dữ liệu của tôi
        </button>
        {confirming ? null : (
          <button type="button" className={buttonClass('danger')} data-id="parent-data-delete" onClick={() => setConfirming(true)}>
            Xóa tài khoản
          </button>
        )}
      </div>
      {confirming ? (
        <div className="row" role="group" aria-label="Xác nhận xóa tài khoản">
          <p>Xóa hẳn tài khoản, mọi hồ sơ và toàn bộ tiến độ của bé? Không khôi phục được.</p>
          <button type="button" className={buttonClass('danger')} data-id="parent-data-delete-confirm" disabled={remove.busy} onClick={() => void remove.onSubmit()}>
            Xóa hẳn tài khoản
          </button>
          <button type="button" className={buttonClass('ghost')} onClick={() => setConfirming(false)}>
            Không
          </button>
        </div>
      ) : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
    </section>
  );
}
