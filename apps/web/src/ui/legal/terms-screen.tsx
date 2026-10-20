// NEW SCREEN: trang Điều khoản sử dụng công khai (không cần đăng nhập), nội dung ở content/legal/terms-vi.json.
// Chưa có mock riêng; cùng khung với trang Quyền riêng tư (legal-page.tsx).
import { Link } from 'react-router';
import { LegalPage } from './legal-page';
import { PRIVACY, TERMS } from './legal-texts';

export function TermsScreen() {
  return (
    <LegalPage text={TERMS} dataId="terms">
      <section data-id="terms-contact">
        <h2>Liên hệ</h2>
        <p>
          Chúng tôi lưu gì và giữ bao lâu: xem trang <Link to="/privacy">Quyền riêng tư</Link>.
        </p>
        {PRIVACY.contactEmail ? (
          <p>
            Mọi câu hỏi về điều khoản này, gửi thư tới <a href={`mailto:${PRIVACY.contactEmail}`}>{PRIVACY.contactEmail}</a>. Đừng gửi mã PIN hay thông tin của trẻ qua thư.
          </p>
        ) : null}
      </section>
    </LegalPage>
  );
}
