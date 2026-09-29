# Quyết định Jev: chuyển đăng ký sang Google OAuth

Ngày: 2026-09-29. Model: `jev-1.13.0` (Choice, `tools/decisions/jev-decide.py`). Theo chỉ đạo người sở hữu, dùng lựa chọn của Jev kể cả khi script trả `escalate`. Người sở hữu có thể đảo các mục đánh dấu "dưới ngưỡng".

Yêu cầu của người dùng: "chuyển /register sang dạng sử dụng Google OAuth để login bằng Gmail".

Bối cảnh đưa vào state: phụ huynh là chủ tài khoản, trẻ là hồ sơ con không đăng nhập; hiện có email + mật khẩu (scrypt), session cookie phía server, PIN phụ huynh, đồng ý bản nháp; Master Plan §9 (thu tối thiểu, không script bên thứ ba, CSP chặt); chưa có người dùng thật; kỹ thuật dự kiến là OAuth 2.0 authorization code + PKCE + state qua redirect phía server, lấy `sub` và email từ ID token nhận trực tiếp từ token endpoint.

## Kết quả

| # | Câu hỏi | Stakes | Jev chọn | Xác suất | Confidence | Quyết định script | Cờ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `password_mode` | medium | `google_plus_password_hidden` (giữ code mật khẩu cho dev/test, ẩn khỏi UI) | 0.65 (google_plus_password 0.27, google_only 0.08) | 0.47 | escalate | DƯỚI NGƯỠNG (0.8), người sở hữu có thể đảo |
| 2 | `scopes` | high | `openid_email` (chỉ `sub` + email) | 1.00 | 1.00 | escalate (mọi câu high đều chuyển người theo chính sách script) | Theo Jev; trùng phương án thu ít dữ liệu nhất, không vượt §9 |
| 3 | `pin_after_google` | medium | `pin_required_at_first_login` | 0.96 | 0.94 | auto | Trên ngưỡng |
| 4 | `account_linking` | medium | `link_by_verified_email` | 0.56 (not_applicable_google_only 0.35, separate_accounts 0.09) | 0.35 | escalate | DƯỚI NGƯỠNG (0.8), người sở hữu có thể đảo |
| 5 | `gate_reopen_after_pin_lock` | low | `google_reauth` (prompt=login) | 0.90 | 0.80 | auto | Trên ngưỡng (0.6) |

## Chỉ thị cho implementer (theo lựa chọn Jev)
1. Google là đường đăng ký/đăng nhập duy nhất trong UI production; `/register` và `/login` đổi thành nút "Đăng nhập bằng Google". Đường email + mật khẩu và các route liên quan chỉ còn cho dev/test, không hiện ở UI, và phải bị vô hiệu bằng cấu hình khi `NODE_ENV=production` (test khẳng định route trả 404 ở production). Lý do: nếu route mật khẩu còn mở ở production thì kẻ tấn công đăng ký trước bằng email của nạn nhân rồi chờ gộp tài khoản (pre-hijacking).
2. Scope chỉ `openid email`. Chỉ lưu `sub` (định danh chính) và email; không lưu tên, ảnh, token truy cập, refresh token. Không yêu cầu offline access.
3. Lần đăng nhập Google đầu tiên phải đặt PIN phụ huynh 4–6 số trước khi vào app; PIN vẫn gate khu phụ huynh 15 phút như hiện tại. Bảng `parents` cần tách khỏi bắt buộc `password_hash` (cột cho phép null hoặc bảng định danh riêng) và thêm `google_sub` duy nhất; đổi schema qua `drizzle-kit generate`, không sửa tay migration đã commit.
4. Gộp tài khoản chỉ khi ID token có `email_verified = true`; khớp email không phân biệt hoa thường; khi gộp, ghi `google_sub` vào tài khoản cũ. Vì người dùng thật chưa có, ở thực tế chỉ ảnh hưởng dữ liệu dev/test.
5. PIN bị khóa 5 lần thì mở lại bằng đăng nhập Google lại với `prompt=login` (thay cho mật khẩu). Thay thế UI "nhập lại mật khẩu" ở màn PIN khóa.
6. Bảo mật OAuth bắt buộc: `state` gắn với phiên trước đăng nhập và kiểm khi callback; PKCE (S256); kiểm `iss`, `aud`, `exp`, `nonce` của ID token; redirect URI cố định qua env; secret client chỉ ở env phía server, không vào repo, log, fixture. CSP phía web không đổi (dùng redirect, không SDK Google).
7. Đổi test: thay nhánh đăng ký/đăng nhập bằng test callback OAuth giả lập (mock token endpoint, không gọi Google thật); giữ test IDOR, cổng PIN, cookie production.

## Ghi nhận (không cần Jev)
Việc thu `sub` và email từ Google là thay đổi thu thập dữ liệu phụ huynh: phải cập nhật văn bản đồng ý bản nháp `content/legal/consent-vi.json` (tăng `version`, giữ `requiresLegalReview: true`) và các đoạn liên quan trong trang review/nợ pháp lý. Người sở hữu cần cung cấp Google OAuth client id/secret (credential chỉ người sở hữu có, không đặt vào repo).

## Việc cần người
Chỉ cần xem lại các mục dưới ngưỡng nếu muốn đổi: #1 (giữ hay bỏ hẳn mật khẩu) và #4 (gộp hay tách tài khoản). Cả hai gần như không ảnh hưởng người dùng thật vì chưa có ai đăng ký.
