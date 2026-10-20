// NEW SCREEN: trang Quyền riêng tư công khai (không cần đăng nhập), nội dung ở content/legal/privacy-vi.json.
// Chưa có mock riêng; theo visual language M1–M3, hướng A (đảo mây kẹo hồng).
import { PrivacyDocument } from '@miu/schema/content';
import privacyJson from '../../../../../content/legal/privacy-vi.json';
import { LegalPage } from './legal-page';

const PRIVACY = PrivacyDocument.parse(privacyJson);

export function PrivacyScreen() {
  return (
    <LegalPage text={PRIVACY} dataId="privacy">
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
    </LegalPage>
  );
}
