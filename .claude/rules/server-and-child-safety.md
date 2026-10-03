---
paths:
  - "apps/server/**"
  - "packages/schema/**"
---

# Server và an toàn trẻ em

Lý do: Master Plan v3 §8, §9, §11; chuẩn test ở `docs/code-standards.md` mục Backend.

- Server là nguồn sự thật: mọi XP, Xu, Skill XP, vật phẩm, kết quả thử thách, mở khóa do server tính bằng `packages/quest`. Bỏ qua mọi giá trị thưởng client gửi lên.
- Mọi endpoint kiểm quyền theo phụ huynh và hồ sơ đang chọn; mỗi endpoint có test IDOR (tài nguyên của người khác trả 404, không 403).
- Endpoint ghi thưởng/tiến độ phải idempotent và có test chống gian lận (lặp, nhảy bước, gọi đồng thời).
- Phụ huynh đăng nhập bằng Google OAuth (code + PKCE + state + nonce phía server, scope chỉ `openid email`, lưu `sub` + email đã xác minh); không nhúng SDK Google phía trình duyệt; client secret chỉ ở env server. Đăng nhập mật khẩu chỉ dev/test, không bao giờ bật ở production.
- Không thu tên thật, email, tuổi của trẻ; hồ sơ trẻ chỉ có tên hiển thị chọn từ danh sách. Ngoại lệ duy nhất là thời khóa biểu tự gõ của từng hồ sơ (môn, đồng phục, tùy chọn trường/lớp/GVCN), mặc định trống, ghi trong lời đồng ý v2 (`plans/dattqh/reports/jev-261003-1340-timetable-consent.md`). Thêm hay đổi trường dữ liệu trẻ, cách thu hoặc chia sẻ dữ liệu trẻ là quyết định phải hỏi người trước, và phải sửa lời đồng ý, chính sách, nâng phiên bản.
- Không log email, tên hồ sơ, token, mật khẩu, PIN; log chỉ id. Lỗi trả client không có stack.
- Không bao giờ trả `password_hash`, `pin_hash`, token trong response; DTO lấy từ `packages/schema`.
- Schema DB chỉ đổi qua `drizzle-kit generate` (SQL commit và review như code); không `drizzle-kit push` lên DB thật; không sửa tay migration đã commit.
- Xóa hồ sơ trẻ là xóa cứng, cascade mọi dữ liệu con trong một transaction.
- Không đưa secret hay dữ liệu thật của trẻ vào code, fixture, log, prompt; fixture chỉ dùng dữ liệu giả.
