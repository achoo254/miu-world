// NEW SCREEN: trang Quyền riêng tư công khai (không cần đăng nhập), nội dung ở content/legal/privacy-vi.json.
// Chưa có mock riêng; theo visual language M1–M3, hướng A (đảo mây kẹo hồng).
import { Link } from 'react-router';
import { PrivacyDocument } from '@miu/schema/content';
import privacyJson from '../../../../../content/legal/privacy-vi.json';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';

const PRIVACY = PrivacyDocument.parse(privacyJson);

/** `2026-09-30` → `30/09/2026`. */
const vietnameseDate = (iso: string) => iso.split('-').reverse().join('/');

export function PrivacyScreen() {
  return (
    <SkyScene>
      <main className="scene-content" data-id="privacy">
        <article className="panel consent-panel">
          <h1>{PRIVACY.title}</h1>
          <p className="hint">Cập nhật ngày {vietnameseDate(PRIVACY.updatedOn)}</p>
          {PRIVACY.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
          <section data-id="privacy-contact">
            <h2>Liên hệ</h2>
            {PRIVACY.contactEmail ? (
              <p>
                Mọi câu hỏi hay yêu cầu về dữ liệu, gửi thư tới <a href={`mailto:${PRIVACY.contactEmail}`}>{PRIVACY.contactEmail}</a>. Đừng gửi mã PIN hay thông tin của trẻ qua thư.
              </p>
            ) : (
              <p>Tải và xóa dữ liệu bạn tự làm được ngay trong mục Quản lý tài khoản, không cần chờ ai.</p>
            )}
          </section>
          <Link to="/" className={buttonClass('ghost')}>
            Về Miu World
          </Link>
        </article>
      </main>
    </SkyScene>
  );
}
