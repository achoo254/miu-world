---
phase: 4
title: "Auth phụ huynh + hồ sơ trẻ"
status: pending
priority: P1
effort: "L"
dependencies: [3]
---

# Phase 4: Auth phụ huynh + hồ sơ trẻ (FOUNDATION-02, Master Plan task #7)

## Overview
Phụ huynh là chủ tài khoản; trẻ là hồ sơ con, không đăng nhập riêng. Đồng ý của phụ huynh bắt buộc trước khi tạo hồ sơ. Session phía server, cookie httpOnly. Giao diện tối thiểu trong `apps/web/src/ui/account/` (NEW SCREEN §6: đăng nhập, chọn hồ sơ, cổng phụ huynh, đồng ý).

## Requirements
- API (`apps/server/src/auth/`, `src/child-profile/`):
  - `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
  - `POST /api/consents` (policy_version hiện hành)
  - `GET/POST /api/children`, `PATCH/DELETE /api/children/:id` (xóa cứng, cascade toàn bộ dữ liệu trẻ trong một transaction), `POST /api/children/:id/select` (gắn `active_child_id` vào session)
  - Cổng phụ huynh bằng **PIN 4–6 số**: đặt lúc đăng ký, băm scrypt như mật khẩu; `POST /api/parent-gate/unlock` mở khu phụ huynh 15 phút (ghi vào session); sai 5 lần liên tiếp → khóa PIN, phải đăng nhập lại bằng mật khẩu; rate limit riêng
<!-- Updated: Validation Session 1 - PIN phụ huynh, tối đa 3 hồ sơ, xóa cứng, hoãn xác minh email -->
- Mật khẩu: `node:crypto` scrypt (N=2^17, r=8, p=1, salt 16 byte, **`maxmem` ≥ 256 MB** vì mặc định Node 32 MB sẽ báo lỗi, so sánh `timingSafeEqual`); không thêm dependency băm.
- Session: token 32 byte ngẫu nhiên, lưu sha256; hết hạn tuyệt đối 30 ngày, nhàn rỗi 7 ngày; xoay token khi đăng nhập; logout xóa bản ghi. Cookie production `__Host-miu_session` (httpOnly, Secure, SameSite=Lax, Path=/). Dev/review (`NODE_ENV !== 'production'`) dùng `miu_session` không Secure, vì duyệt trên điện thoại qua LAN là http và trình duyệt bỏ cookie Secure ngoài localhost; test khẳng định production luôn Secure.
- CSRF: mọi request đổi trạng thái kiểm header `Origin` thuộc danh sách `ALLOWED_ORIGINS` (env, Zod); dev thêm origin LAN của trang review; kèm SameSite.
- Xác minh email: hoãn tới trước người dùng thật (cần nhà cung cấp email, chi phí + DNS do người làm); ghi vào nợ trước ra mắt trên trang review.
- Rate limit `express-rate-limit` cho register/login (theo IP + email); thông báo lỗi đăng nhập không phân biệt "email không tồn tại" và "sai mật khẩu".
- Hồ sơ trẻ: tên hiển thị **chọn từ danh sách sinh sẵn** (`content/names/child-display-names.json`), không nhập tự do; tối đa **3 hồ sơ**/phụ huynh; không thu tên thật, email, trường, tuổi, lớp của trẻ (§9).
- Đồng ý: văn bản `content/legal/consent-vi.json` (version `draft-1`, cờ `requiresLegalReview: true`); hiển thị cờ này trên trang review; không có người dùng thật trước khi pháp chế duyệt.
- Không log email, tên hồ sơ hay token; log chỉ id.
- UI: đăng ký, đăng nhập, màn đồng ý, danh sách/tạo/chọn hồ sơ, cổng phụ huynh; gọi API qua `fetch` cùng origin; lỗi hiển thị thân thiện; token màu/font dùng biến CSS như POC.

## Implementation Steps
1. Test trước (supertest + PGlite in-memory):
   - Đăng ký/đăng nhập/đăng xuất; cookie đúng cờ; session hết hạn bị từ chối.
   - IDOR: phụ huynh B không đọc/sửa/xóa/chọn hồ sơ của A (404, không 403 để không lộ tồn tại).
   - Tạo hồ sơ khi chưa đồng ý → 403; tên ngoài danh sách → 400; vượt số hồ sơ → 409.
   - Thiếu/sai `Origin` ở POST → 403; rate limit trả 429.
   - PIN: đúng → mở khu phụ huynh 15 phút; hết 15 phút → 403; sai 5 lần → khóa, chỉ mở lại sau đăng nhập mật khẩu; route khu phụ huynh (tạo/sửa/xóa hồ sơ, đồng ý) từ chối khi chưa mở.
   - Xóa hồ sơ: mọi dòng liên quan biến mất (đếm từng bảng = 0).
   - Cookie: production có `Secure` + tiền tố `__Host-`.
   - Response không bao giờ chứa `password_hash`, token.
2. Viết service + route; middleware `requireParent`, `requireParentGate`, `requireActiveChild` (dùng ở phase 5).
3. UI + test component (form validate, luồng chọn hồ sơ).
4. Báo cáo bảo mật ngắn cho trang review: mô hình session, CSRF, danh sách test.

## Success Criteria
- [ ] Mọi endpoint có test IDOR; toàn bộ test pass trên PGlite và Postgres CI
- [ ] Luồng UI đăng ký → đồng ý → tạo hồ sơ → chọn hồ sơ chạy được ở dev
- [ ] `code-reviewer` review phần auth; phát hiện đã xử lý hoặc ghi lý do

## Risk Assessment
- Scrypt N=2^17 tốn ~128 MB/lần băm → rủi ro DoS. Xử lý: rate limit + giới hạn băm đồng thời (hàng đợi đơn giản); tham số để trong config.
- `__Host-` cookie cần Secure: trình duyệt cho phép trên `http://localhost`; E2E chạy localhost.
- Pháp lý chưa duyệt: chỉ dùng dữ liệu giả trong dev/test.
