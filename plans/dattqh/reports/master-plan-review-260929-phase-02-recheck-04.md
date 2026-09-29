# Review Master Plan: phase 2 (kiểm lại) và phase 4

Ngày: 2026-09-29. Người review: master-plan-reviewer.

## Verdict

| Phase | Verdict |
| --- | --- |
| 2 FOUNDATION-01 (kiểm lại) | PASS (CI chưa chạy nên tiêu chí CI còn mở) |
| 4 FOUNDATION-02 | CẦN LÀM TIẾP (việc nhỏ, không có lỗi bảo mật chặn) |

## Lệnh đã chạy
- `pnpm assets:check` OK; `pnpm test` 18 file, 110 pass, 1 skip; `pnpm typecheck` xanh; `pnpm lint` xanh.
- `pnpm --filter @miu/web build` xanh (`dist/index.html` 0.76 kB, css 1.77 kB, js 362 kB).
- `ci.yml:28` có bước `pnpm --filter @miu/web build`.

## Phase 2 kiểm lại
Đủ: `styles.css` có token (`--ink`, `--accent`, `--danger`...), build web xanh, CI có build web, `content-security-policy.test.ts` giữ CSP. Mục "dev + proxy" do implementer smoke; reviewer không chạy lại nhưng build và test đều xanh. Còn mở: job `check`, `integration`, `sast` chỉ đóng sau lần push đầu.

## Phase 4: đối chiếu yêu cầu
Đạt (bằng chứng đọc code + test):
- Endpoint: register, login, logout, me, consents (+ `GET /consents/policy`), children GET/POST/PATCH/DELETE, select, parent-gate unlock (+ lock). `auth-routes.ts`, `child-profile-routes.ts`.
- scrypt N=2^17, r=8, p=1, salt 16 byte, `maxmem` 256 MB + 128·N·r, `timingSafeEqual`, NFKC, tối đa 2 hash đồng thời; hash lưu dạng `scrypt$logN$r$p$salt$hash` (`secret-hashing.ts`); có test chạy đúng chi phí production.
- Session: 32 byte ngẫu nhiên, lưu sha256, hết hạn tuyệt đối 30 ngày + nhàn rỗi 7 ngày, xóa bản ghi khi hết hạn, xoay token khi đăng nhập/đăng ký, logout xóa bản ghi (`session-store.ts`).
- Cookie: production `__Host-miu_session` + Secure + HttpOnly + SameSite=Lax + Path=/ không Domain; dev `miu_session` không Secure; có test production (`auth-routes.test.ts:170`).
- CSRF: `Origin` phải thuộc `ALLOWED_ORIGINS` cho mọi phương thức đổi trạng thái, thiếu Origin cũng bị 403 (`origin-check.ts`); có test.
- Rate limit: register theo IP, login theo IP+email, PIN theo session; đăng nhập trả cùng một lỗi cho email lạ và sai mật khẩu, kèm decoy hash để thời gian tương đương.
- PIN: 5 lần sai khóa (423), chỉ mở lại bằng đăng nhập mật khẩu; cổng 15 phút ghi trong session; consent, tạo/sửa/xóa hồ sơ đều qua `requireParentGate`.
- Hồ sơ: tên phải nằm trong danh sách (kể cả NFD), tối đa 3 (khóa dòng parent trong transaction), cần consent trước khi tạo, 404 cho hồ sơ người khác hoặc id sai định dạng, xóa cứng trong transaction; test IDOR cho GET/PATCH/select/DELETE.
- Không log email/tên/token (chỉ log id). DTO qua `ParentDto`/`ChildProfileDto` nên không lộ hash.
- UI: `/login /register /consent /profiles /parent /play`, mỗi file ghi "NEW SCREEN", gọi API cùng origin, xác nhận trước khi xóa hồ sơ, lỗi thân thiện, token qua biến CSS, có `account-flow.test.tsx`.
- Nội dung: `content/legal/consent-vi.json` (draft-1, `requiresLegalReview`), `content/names/*.json`.

## Quyết định (a)–(e) của implementer: xét theo mô hình mối đe dọa
Tôi tự quyết theo mô hình mối đe dọa vì đều dễ đảo và không đổi cách thu thập dữ liệu trẻ; không gọi Jev. Người sở hữu có thể đảo.

| # | Quyết định | Kết luận | Lý do |
| --- | --- | --- | --- |
| a | Mở cổng phụ huynh 15 phút sau đăng ký và sau đăng nhập mật khẩu | Chấp nhận | Mật khẩu đã chứng minh phụ huynh còn mạnh hơn PIN; cửa sổ chỉ 15 phút; có `lock`. Điều kiện: UI khu phụ huynh nên có nút "Khóa lại" gọi `/parent-gate/lock` (kiểm nếu chưa có) |
| b | Chọn hồ sơ không cần PIN | Chấp nhận | Trẻ tự chọn hồ sơ của mình trên máy chung; chỉ đổi `active_child_id` trong hồ sơ cùng phụ huynh (có test IDOR); không mở khu phụ huynh |
| c | Thêm `POST /api/parent-gate/lock` | Chấp nhận | Chỉ thu hẹp quyền, đi qua kiểm Origin |
| d | Nhân vật mặc định "Miu" khi tạo hồ sơ + `character-names.json` | Chấp nhận | Tên từ danh sách cố định, không thu dữ liệu trẻ. Lưu ý `content-catalog.ts` nạp `characterNames` nhưng chưa dùng ở phase 4: phase 5 phải dùng nó để validate đổi tên nhân vật, nếu không thì xóa |
| e | `start` chạy bằng tsx, chưa bundle production | Chấp nhận, ghi nợ | Không có môi trường triển khai; đưa vào nợ trước ra mắt trên trang review phase 8 |

## Việc cần làm tiếp (theo ưu tiên)
1. [TRUNG BÌNH] Đóng tiêu chí "code-reviewer review auth": khi report `plans/dattqh/reports/code-reviewer-260929-auth-review.md` có, mọi phát hiện phải xử lý hoặc ghi lý do; gửi lại tôi kiểm.
2. [TRUNG BÌNH] Test còn thiếu: cổng đóng thì `PATCH` và `DELETE /api/children/:id` cũng bị 403 (hiện chỉ test `POST /children` và `POST /consents`), và cổng đóng không chặn `select` (khẳng định quyết định b). Thêm vào `child-profile-routes.test.ts`.
3. [THẤP] Hai chỗ `// eslint-disable-line react-hooks/set-state-in-effect` (`account-context.tsx:35`, `profile-screens.tsx:30`): kiểm xem có thể tránh bằng cách gọi từ handler hoặc khởi tạo trạng thái đúng cách; nếu không thể, ghi lý do ngắn cạnh dòng disable.
4. [THẤP] Tài liệu: ghi cách đặt `ALLOWED_ORIGINS` khi duyệt bằng điện thoại qua LAN (origin `http://<ip-lan>:<cổng>`) và việc web dev/preview hiện không có `--host` nên phase 8 phải quyết cách mở cổng LAN. Đặt ở `CLAUDE.md` mục Lệnh hoặc `docs/code-standards.md`.
5. [THẤP] `app.set('trust proxy', false)`: khi triển khai sau reverse proxy thì `req.ip` là IP proxy và rate limit gộp mọi người vào một khóa. Ghi vào nợ triển khai (cùng mục e).
6. [THẤP] `POST /auth/register` trả 409 `email-taken` (lộ email đã đăng ký). Chấp nhận ở giai đoạn này (phase chỉ yêu cầu đăng nhập không phân biệt); ghi vào báo cáo bảo mật phase 8.
7. [THẤP] Test đồng thời "tối đa 3 hồ sơ" chạy trên PGlite (một kết nối) chưa thực sự thử khóa dòng; chỉ có bằng chứng thật khi job `integration` Postgres 17 chạy sau push. Không sửa test, chỉ theo dõi kết quả CI.
8. Chưa có bằng chứng luồng UI chạy trong trình duyệt thật (chỉ có test component và smoke API qua proxy). Chụp ảnh hoặc ghi đường đi đăng ký → đồng ý → tạo hồ sơ → chọn hồ sơ cho trang review phase 8.

Câu hỏi chưa giải quyết: không có.
