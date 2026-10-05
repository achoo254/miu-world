---
paths:
  - "apps/server/**"
  - "packages/schema/**"
---

# Server, tài khoản và dữ liệu người chơi

Lý do: Master Plan v3 §8, §9, §11; chuẩn test ở `docs/code-standards.md` mục Backend.

- Server là nguồn sự thật: mọi XP, Xu, Skill XP, vật phẩm, kết quả thử thách, mở khóa do server tính bằng `packages/quest`. Bỏ qua mọi giá trị thưởng client gửi lên.
- Mọi endpoint kiểm quyền theo tài khoản và người chơi đang chọn; mỗi endpoint có test IDOR (tài nguyên của người khác trả 404, không 403).
- Endpoint ghi thưởng/tiến độ phải idempotent và có test chống gian lận (lặp, nhảy bước, gọi đồng thời).
- Người chơi chính (`child_profiles.is_primary`) tạo khi đồng ý chính sách, mỗi phiên mới chọn sẵn nó, chỉ xóa cùng tài khoản; người chơi phụ thêm/xóa qua `/api/players` sau cổng. Tên bảng cũ giữ nguyên.
- PIN tài khoản là tùy chọn: chưa đặt PIN thì cổng luôn mở; đã đặt thì các endpoint cổng vẫn cần mở khóa. Đặt PIN lần đầu không cần cửa sổ 15 phút; đổi (`POST /auth/pin`) và gỡ (`DELETE /auth/pin`) cần cổng đang mở.
- Chủ tài khoản đăng nhập bằng Google OAuth (code + PKCE + state + nonce phía server, scope chỉ `openid email`, lưu `sub` + email đã xác minh); không nhúng SDK Google phía trình duyệt; client secret chỉ ở env server. Đăng nhập mật khẩu chỉ dev/test, không bao giờ bật ở production.
- Không thu tên thật, tuổi của người chơi; mỗi người chơi chỉ có tên hiển thị chọn từ danh sách. Ngoại lệ duy nhất là thời khóa biểu tự gõ của từng người chơi (môn, đồng phục, tùy chọn trường/lớp/GVCN), mặc định trống, ghi trong lời đồng ý (v2 thêm, v3 giữ; `plans/dattqh/reports/jev-261003-1340-timetable-consent.md`). Thêm hay đổi trường dữ liệu trẻ, cách thu hoặc chia sẻ dữ liệu trẻ là quyết định phải hỏi người trước, và phải sửa lời đồng ý, chính sách, nâng phiên bản.
- Không log email, tên người chơi, token, mật khẩu, PIN; log chỉ id. Lỗi trả client không có stack.
- Không bao giờ trả `password_hash`, `pin_hash`, token trong response; DTO lấy từ `packages/schema`.
- Schema DB chỉ đổi qua `drizzle-kit generate` (SQL commit và review như code); không `drizzle-kit push` lên DB thật; không sửa tay migration đã commit.
- Xóa người chơi phụ hay tài khoản là xóa cứng, cascade mọi dữ liệu con trong một transaction.
- Không đưa secret hay dữ liệu thật của trẻ vào code, fixture, log, prompt; fixture chỉ dùng dữ liệu giả.
