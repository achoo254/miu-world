# Review bảo mật + chất lượng: auth phụ huynh và hồ sơ trẻ

Ngày: 2026-09-29 (Asia/Saigon). Người review: code-reviewer agent. Trạng thái code: chưa commit (working tree).

## Phạm vi

- `apps/server/src/**` (auth/, child-profile/, app.ts, config.ts, db/, http-error.ts, server.ts), `apps/server/test/test-app.ts`, `apps/server/drizzle/0000_initial-schema.sql`
- `packages/schema/src/account.ts`, `content.ts`
- `apps/web/src/ui/**`, `apps/web/vite.config.ts`
- Đối chiếu: phase-04, phase-03, `.claude/rules/server-and-child-safety.md`, Master Plan §9
- Kiểm chứng: `pnpm vitest run apps/server` → 6 file, 41 test pass. Thêm 1 test nháp (ngoài repo, trong scratchpad) để chứng minh race PIN và cổng phụ huynh sau khi chọn hồ sơ — kết quả ghi ở từng phát hiện.

## Đánh giá chung

Nền tảng chắc: token 32 byte lưu sha256, idle 7 ngày / tuyệt đối 30 ngày, xoay khi login, cookie `__Host-` + Secure ở production có test, Origin allow-list chặn cả Origin thiếu, mọi truy vấn hồ sơ lọc theo `parent_id` và trả 404, DTO Zod loại hash, lỗi không lộ stack, Express 5 chuyển lỗi async về error handler, giới hạn 3 hồ sơ dùng `FOR UPDATE` có test đồng thời, xóa cứng cascade có test đếm từng bảng.

Lỗ hổng thật nằm ở ba chỗ: (1) mọi rate limit dựa trên `req.ip` nhưng server luôn đứng sau proxy với `trust proxy = false`, nên IP luôn là loopback; (2) khóa PIN 5 lần có race, đã chứng minh bằng test; (3) UI không có đường nào để "đăng nhập lại bằng mật khẩu" khi PIN bị khóa.

---

## Critical

Không có.

## High

### H1. Rate limit theo IP bị vô hiệu: server sau proxy, `req.ip` luôn là 127.0.0.1

- File: `apps/server/src/app.ts:46` (`trust proxy` false), `apps/server/src/server.ts:10` (bind 127.0.0.1), `apps/web/vite.config.ts:139` (proxy không `xfwd`), `apps/server/src/auth/auth-routes.ts:39,52,54`
- Kịch bản:
  1. **Chặn đăng ký toàn hệ thống**: `registerLimit` 10 lần/giờ theo `ipKey` → mọi người dùng chung một khóa `127.0.0.1`. Một người (hoặc 1 script) đăng ký 10 lần là cả hệ thống không đăng ký được trong 1 giờ.
  2. **Khóa đăng nhập của nạn nhân**: `loginLimit` khóa `IP|email` thực chất thành `email`. Kẻ tấn công gửi 10 lần mật khẩu sai cho email của phụ huynh A → A không đăng nhập được 15 phút, lặp lại vô hạn. Comment ở dòng 53 ("one attacker cannot lock every account") sai trong triển khai thực tế.
  3. **Rải mật khẩu (password spraying) không giới hạn**: không có limiter thuần theo IP; mỗi email được 10 lần/15 phút, đổi email là đổi khóa.
- Không phải chỉ ở dev: server cứng bind loopback, nên mọi môi trường production đều phải có reverse proxy phía trước — cùng lỗi.
- Test hiện tại (`auth-routes.test.ts:119`) "pass" chính vì mọi request cùng một IP, không chứng minh giới hạn theo IP thật.
- Đề xuất:
  - Thêm `trustProxy` vào `ServerConfig` (dev/test: `'loopback'`; production: số hop của proxy thật), `app.set('trust proxy', config.trustProxy)`.
  - Vite proxy: `{ target, changeOrigin: false, xfwd: true }` cho cả `server` và `preview`. Với `trust proxy: 'loopback'`, Express lấy địa chỉ phải nhất không tin cậy, nên XFF giả mạo từ client bị bỏ qua.
  - Thêm limiter thuần IP cho login (ví dụ 50/15 phút) bên cạnh limiter IP+email.
  - Test: gửi `X-Forwarded-For` khác nhau qua supertest (với trust proxy loopback) để chứng minh hai IP có quota riêng.

### H2. Race ở khóa PIN: đoán song song vượt quá 5 lần và lần đúng xóa khóa (đã chứng minh)

- File: `apps/server/src/auth/auth-routes.ts:132` (kiểm tra khóa dùng `ctx.parent` đọc lúc đầu request), `:133-140` (verify trước, tăng đếm sau), `:143` (đúng PIN thì reset 0 vô điều kiện)
- Kịch bản (test nháp, 10 request song song cùng session, 9 PIN sai + 1 PIN đúng): trạng thái `401,401,401,401,423,423,423,423,423,200`; sau đó `/auth/me` trả `parentGateOpen: true, pinLocked: false`. Tức là PIN đã khóa (đếm ≥ 5) nhưng request đúng vẫn qua và reset khóa. Mỗi chu kỳ trẻ được ~10 lần đoán (giới hạn bởi `pinLimit`) thay vì 5; PIN 4 số → xác suất đoán trúng gấp đôi thiết kế.
- Đề xuất: giữ chỗ lượt thử bằng UPDATE nguyên tử trước khi verify:
  ```ts
  const [slot] = await db.update(parents)
    .set({ pinFailedCount: sql`${parents.pinFailedCount} + 1` })
    .where(and(eq(parents.id, id), lt(parents.pinFailedCount, PIN_MAX_FAILS)))
    .returning({ fails: parents.pinFailedCount });
  if (!slot) throw new HttpError(423, 'pin-locked');
  if (!(await verifySecret(pin, hash))) { if (slot.fails >= PIN_MAX_FAILS) throw 423; throw 401; }
  // đúng: reset có điều kiện `where pin_failed_count <= slot.fails` hoặc giảm 1
  ```
  Thêm test đồng thời giống test nháp trên (kỳ vọng: không quá 5 lần verify, lần đúng sau khi khóa trả 423).

### H3. Hàng đợi scrypt không giới hạn → DoS thời gian phản hồi

- File: `apps/server/src/auth/secret-hashing.ts:20-34`, `auth-routes.ts:93-96` (decoy verify cho email lạ)
- Kịch bản: `MAX_CONCURRENT = 2` chặn bộ nhớ nhưng `waiting` không có trần. Kết hợp H1 (không có limiter theo IP, đổi email là đổi khóa): gửi login với email ngẫu nhiên tốc độ cao → mỗi request xếp một lần scrypt N=2^17 (~vài trăm ms). Năng lực ~5–10 hash/giây; hàng đợi phình vô hạn, đăng nhập/đăng ký/mở PIN của mọi người chờ hàng phút rồi timeout. Plan phase-04 đã ghi rủi ro này; biện pháp hiện tại chỉ xử lý nửa bộ nhớ.
- Đề xuất: trần hàng đợi (ví dụ 32); vượt thì ném `HttpError(503, 'busy')` (thêm message thân thiện ở `api-client.ts`). Cộng limiter IP ở H1.

### H4. UI: PIN bị khóa là ngõ cụt, không có nút đăng xuất

- File: `apps/web/src/ui/account/parent-gate.tsx:23` (link `/login`), `apps/web/src/ui/app-shell.tsx:38-43,60` (`SignedOutOnly` chuyển người đã đăng nhập về `/`), `account-context.tsx:43` (`signOut` không có nơi gọi; grep không thấy gọi `/auth/logout` trong `apps/web`)
- Kịch bản: trẻ nhập sai 5 lần → màn hình bảo "đăng nhập lại bằng mật khẩu" → bấm link → `/login` thấy đã đăng nhập → quay về `/profiles`. Phụ huynh không có đường mở khóa trong UI cho tới khi session hết hạn (7 ngày nhàn rỗi) hoặc tự xóa cookie. Yêu cầu phase-04 "chỉ mở lại sau đăng nhập mật khẩu" đúng ở server nhưng không dùng được ở UI.
- Đề xuất: màn khóa PIN hiện form nhập mật khẩu tại chỗ (gọi `POST /auth/login` với email từ `me.parent.email`), hoặc nút "Đăng xuất" gọi `POST /auth/logout` + `signOut()` rồi điều hướng `/login`. Thêm nút đăng xuất ở khu phụ huynh. Thêm test component cho luồng khóa → mở.

## Medium

### M1. Cổng phụ huynh vẫn mở 15 phút sau khi chọn hồ sơ cho trẻ chơi (đã chứng minh)

- File: `apps/server/src/child-profile/child-profile-routes.ts:111-117`; `auth-routes.ts:84,102` (đăng ký/đăng nhập mở cổng)
- Kịch bản: phụ huynh đăng nhập (cổng tự mở) → chọn hồ sơ → đưa máy cho trẻ. Test nháp: sau `select`, `/auth/me` trả `parentGateOpen: true`. Trẻ vào `/parent` là xóa cứng được hồ sơ và toàn bộ tiến độ, không cần PIN. Nút "Xong" khóa cổng chỉ có ở khu phụ huynh; màn chọn hồ sơ không khóa.
- Đề xuất: `POST /children/:id/select` đặt `parentGateUntil = null` trong cùng câu UPDATE session (chọn người chơi = rời khu phụ huynh). Có test.

### M2. Thiếu index trên cột khóa ngoại dùng để lọc

- File: `apps/server/src/db/schema.ts:24` (child_profiles.parent_id), `:34` (sessions.parent_id), `:37` (sessions.active_child_id), `:48` (consents.parent_id); `drizzle/0000_initial-schema.sql` không có `CREATE INDEX`.
- Tác động: mọi route hồ sơ lọc `child_profiles.parent_id` (seq scan khi bảng lớn); `hasCurrentConsent` chạy mỗi `/auth/me`; xóa hồ sơ kích hoạt `ON DELETE SET NULL` trên `sessions.active_child_id` → quét cả bảng sessions mỗi lần xóa; xóa parent cascade quét sessions/consents.
- Đề xuất: thêm `index()` cho 4 cột trên (consents nên là `(parent_id, policy_version)`), chạy `drizzle-kit generate`. Migration 0000 chưa commit nên sinh lại được luôn.

### M3. UI giữ trạng thái cổng cũ sau 15 phút

- File: `apps/web/src/ui/account/profile-screens.tsx` (`ParentAreaScreen`, `ProfileRow`), `use-submit.ts`
- Kịch bản: phụ huynh ở khu phụ huynh quá 15 phút → bấm Tạo/Đổi tên/Xóa → server 403 `parent-gate-closed`; UI chỉ hiện "Cần nhập mã PIN phụ huynh." nhưng không hiện form PIN vì `me.parentGateOpen` vẫn `true`. Phải tải lại trang.
- Đề xuất: khi mã lỗi là `parent-gate-closed` (hoặc 401), gọi `refresh()` của `useAccount` để UI hiện `ParentGate`/màn đăng nhập.

### M4. Origin LAN của trang review chưa có trong allow-list dev

- File: `apps/server/src/config.ts:4`, `apps/web/package.json` (dev/preview không `--host`), `session-cookie.ts:5-9` (comment nói dev bỏ Secure vì duyệt qua LAN)
- Plan phase-04: "dev thêm origin LAN của trang review". Hiện `DEV_ORIGINS` chỉ localhost/127.0.0.1; mở từ điện thoại qua `http://192.168.x.x:4174` thì mọi POST trả 403 `forbidden-origin`. Nếu đặt `ALLOWED_ORIGINS` thì danh sách này thay thế toàn bộ `DEV_ORIGINS` (không cộng thêm).
- Đề xuất: ghi rõ cách chạy review LAN (biến `ALLOWED_ORIGINS` gồm cả localhost và IP LAN, `--host`) trong docs/review page, hoặc thêm biến `EXTRA_DEV_ORIGINS` cộng vào mặc định. Không tự động cho mọi origin private-IP.

## Low

- **L1. Consent không unique, thiếu bằng chứng** — `auth-routes.ts:125`, `schema.ts` bảng `consents`: mỗi lần POST thêm một dòng trùng `(parent_id, policy_version)`. Đề xuất unique + `onConflictDoNothing`. Có cần lưu thêm bằng chứng (IP, user-agent) không là câu hỏi pháp chế — xem mục cuối.
- **L2. Dò email qua đăng ký** — `auth-routes.ts:68-69`: 409 `email-taken` (và nhanh hơn vì không băm) cho biết email đã có tài khoản. Không tránh được khi chưa có xác minh email (đã hoãn); ghi vào nợ trước ra mắt cùng xác minh email.
- **L3. Promise decoy lỗi bị cache vĩnh viễn** — `auth-routes.ts:50,94`: nếu lần `decoyHash` đầu tiên reject (ví dụ ENOMEM), `decoy ??=` giữ promise lỗi → mọi login email lạ trả 500 tới khi restart, và 500 vs 401 lộ email tồn tại. Đề xuất reset `decoy = undefined` khi reject, hoặc tính decoy lúc khởi động.
- **L4. `NODE_ENV` mặc định `development` (fail-open)** — `config.ts:12`: quên đặt `NODE_ENV` ở production → cookie không Secure, dùng PGlite file, không bắt buộc `ALLOWED_ORIGINS`. Bind loopback giảm rủi ro nhưng không loại bỏ. Đề xuất bắt buộc `NODE_ENV` tường minh khi `DATABASE_URL` có mặt, hoặc log cảnh báo to khi chạy development.
- **L5. Session hết hạn không bao giờ bị dọn** — `session-store.ts:47-49` chỉ xóa khi token được gửi lại. Bảng `sessions` phình theo thời gian. Đề xuất job dọn định kỳ + index `expires_at` (có thể để phase sau, ghi nợ).
- **L6. Error handler mất khả năng chẩn đoán** — `app.ts:38` chỉ log `err.name`. Không lộ dữ liệu là đúng, nhưng sự cố production gần như không truy được. Đề xuất log thêm `code`/`constraint` của lỗi pg (không log `detail`, vì `detail` chứa giá trị như email).
- **L7. Rate limit MemoryStore** — reset khi restart, không chia sẻ nếu chạy nhiều instance. Chấp nhận ở giai đoạn này; ghi nợ.
- **L8. PATCH hồ sơ truy vấn 2 lần** — `child-profile-routes.ts:85-91`: `ownedProfile` rồi UPDATE có cùng điều kiện; bỏ `ownedProfile` vẫn đúng (UPDATE không trả dòng → 404).

## Không phải lỗi (đã xác minh)

- IDOR: mọi route `/children/:id` lọc `id AND parent_id`; id sai định dạng trả 404; có test 404 cho profile nhà khác (đọc/sửa/xóa/chọn). `activeChildId()` kiểm lại quyền sở hữu hồ sơ.
- Hash không rò: `loadSession` nạp cả `password_hash`/`pin_hash` vào `res.locals` nhưng mọi response đi qua `ParentDto`/`MeResponse` (Zod strip); test khẳng định response không có secret/token.
- Cookie: `readSessionToken` chỉ nhận base64url 16–128 ký tự; `__Host-` chặn cookie tossing từ subdomain.
- CSRF: Origin kiểm trước session, áp dụng cả login/logout (chặn login CSRF); không có CORS header nên trang khác không đọc được GET.
- scrypt: `maxmem` đúng công thức, `timingSafeEqual` sau kiểm độ dài, hash tự mô tả tham số; decoy làm thời gian login email lạ ≈ email đúng.
- Giới hạn 3 hồ sơ: `SELECT ... FOR UPDATE` trên dòng parent trong transaction; có test song song.
- Log: chỉ id (`parent registered`, `child profile created/deleted`). Không log email/tên hồ sơ/token.

## Tóm tắt cho mục "Báo cáo bảo mật" trên trang review

**Mô hình:** phụ huynh là chủ tài khoản; trẻ là hồ sơ con (chỉ có tên chọn từ danh sách), không đăng nhập riêng. Session phía server: token ngẫu nhiên 32 byte, DB chỉ lưu sha256; hết hạn tuyệt đối 30 ngày, nhàn rỗi 7 ngày; đổi token mỗi lần đăng nhập; đăng xuất xóa bản ghi. Cookie httpOnly, SameSite=Lax; production `__Host-miu_session` + Secure (có test), dev không Secure để duyệt qua http.

**Chống CSRF:** mọi request đổi trạng thái phải có header `Origin` thuộc danh sách cho phép (thiếu Origin cũng bị chặn) + SameSite=Lax.

**Phân quyền:** mọi truy vấn hồ sơ lọc theo phụ huynh; hồ sơ nhà khác trả 404 giống hồ sơ không tồn tại (có test IDOR cho đọc/sửa/xóa/chọn). Khu phụ huynh (tạo/sửa/xóa hồ sơ, đồng ý) cần PIN, mở 15 phút.

**Mật khẩu/PIN:** scrypt N=2^17, r=8, p=1, salt 16 byte, so sánh hằng thời gian, tối đa 2 lần băm đồng thời; đăng nhập email lạ vẫn băm giả để không lộ email tồn tại. PIN khóa sau 5 lần sai, mở lại bằng đăng nhập mật khẩu.

**Dữ liệu trẻ:** không thu tên thật/tuổi/lớp/trường; xóa hồ sơ là xóa cứng, cascade toàn bộ dữ liệu con (có test đếm từng bảng). Log chỉ id; lỗi trả client chỉ mã lỗi, không stack.

**Tồn đọng từ review (cần xử lý trước khi có người dùng thật):**
1. Rate limit theo IP chưa hoạt động sau proxy (IP luôn là loopback) → có thể chặn đăng ký toàn hệ thống, khóa đăng nhập của người khác, rải mật khẩu không giới hạn. (H1)
2. Khóa PIN có race: đoán song song vượt 5 lần và lần đúng xóa khóa. (H2)
3. Hàng đợi băm không có trần → có thể làm chậm toàn bộ đăng nhập. (H3)
4. UI chưa có đường mở khóa PIN/đăng xuất. (H4)
5. Cổng phụ huynh còn mở sau khi chọn hồ sơ cho trẻ. (M1)
6. Nợ trước ra mắt: xác minh email (hoãn), dò email qua đăng ký, văn bản đồng ý chờ pháp chế (`requiresLegalReview: true`), rate limit lưu trong bộ nhớ, dọn session hết hạn.

## Theo dõi plan phase-04

- Hoàn thành ở server: API đủ route, PIN/gate, session, cookie, CSRF, IDOR test, giới hạn hồ sơ, xóa cứng cascade, không log/không trả dữ liệu nhạy cảm.
- Chưa đạt: "rate limit theo IP + email" (H1); "sai 5 lần → khóa" dưới tải đồng thời (H2); "dev thêm origin LAN của trang review" (M4); luồng UI khóa PIN → đăng nhập lại (H4).
- Chưa kiểm ở review này: chạy test trên Postgres CI (chỉ chạy PGlite local), luồng UI end-to-end ở dev.

## Câu hỏi chưa giải quyết

1. Topology production (reverse proxy nào, bao nhiêu hop) — cần để đặt `trust proxy` đúng cho H1.
2. Bản ghi đồng ý có cần lưu thêm bằng chứng (IP, user-agent, bản sao văn bản) theo Nghị định 13/2023 không — câu hỏi pháp chế.
3. Khi `policyVersion` đổi (draft-1 → bản chính thức), hồ sơ đã có có bị chặn chọn/chơi tới khi phụ huynh đồng ý lại không? Hiện `select` không kiểm consent — quyết định sản phẩm.
4. Đăng nhập/đăng ký tự mở cổng phụ huynh 15 phút — có chấp nhận không, hay chỉ mở khi nhập PIN? (M1 đề xuất tối thiểu khóa cổng khi chọn hồ sơ.)

## Xử lý (implementer, 2026-09-29)

| Phát hiện | Xử lý | Bằng chứng |
| --- | --- | --- |
| H1 rate limit IP | `trust proxy = 'loopback'` (API chỉ nghe loopback, đứng sau proxy cùng máy); proxy Vite `xfwd: true`; thêm limiter chỉ theo IP cho login (50/15 phút) | `apps/server/src/app.ts`, `apps/web/vite.config.ts`, `auth-routes.ts` |
| H2 race khóa PIN | Giữ chỗ lượt thử bằng `UPDATE … WHERE pin_failed_count < 5 RETURNING` trước khi verify | test "cannot be out-guessed by parallel requests" (9 song song → 4×401 + 5×423, PIN đúng sau đó vẫn 423) |
| H3 hàng đợi scrypt | Trần 32 chờ, vượt → 503 `server-busy`; slot chuyển thẳng cho người chờ | test "fails fast with a queue-full error" |
| H4 PIN khóa là ngõ cụt | Màn khóa cho nhập lại mật khẩu (login → reset bộ đếm); thêm nút Đăng xuất | `parent-gate.tsx`, test "offers a password re-login" |
| M1 cổng mở sau khi chọn hồ sơ | `select` đặt `parent_gate_until = null` | test "closes the parent area when a profile is picked" |
| M2 index khóa ngoại | Thêm index `child_profiles.parent_id`, `sessions.parent_id`, `sessions.active_child_id` (migration 0000 sinh lại, chưa commit) | `apps/server/drizzle/0000_initial-schema.sql` |
| M3 UI giữ trạng thái cổng cũ | `useSubmit` gọi `refresh()` khi gặp `parent-gate-closed`/`unauthenticated`/`no-active-child`/`pin-locked` | test "shows the PIN prompt again" |
| M4 origin LAN | Giữ allow-list qua env `ALLOWED_ORIGINS`; hướng dẫn ở `CLAUDE.md`; phục vụ LAN làm ở bước duyệt cuối | `CLAUDE.md` mục Dễ vấp |
| L1 consent trùng | Unique `(parent_id, policy_version)` + `ON CONFLICT DO NOTHING` | test "records one consent row per policy version" |
| L2 lộ email đã đăng ký | Ghi nợ trước ra mắt | `docs/project-roadmap.md` |
| L3 decoy lỗi bị cache | Lỗi không được giữ lại, lần sau tạo lại | `auth-routes.ts` |
| L4 `NODE_ENV` mặc định | Production bắt buộc `DATABASE_URL` + `ALLOWED_ORIGINS`, nên quên đặt NODE_ENV sẽ chạy PGlite dev; ghi vào nợ triển khai | — |
| L5 session hết hạn không dọn | Xóa session hết hạn của phụ huynh khi đăng nhập | `auth-routes.ts` |
| L6 log chỉ `err.name` | Giữ nguyên có chủ đích (message có thể chứa dữ liệu cá nhân); cần observability ở giai đoạn triển khai | — |
| L7 rate limit trong bộ nhớ | Chấp nhận khi một instance; ghi nợ triển khai | — |
| L8 truy vấn thừa ở PATCH | Bỏ | `child-profile-routes.ts` |
| Câu hỏi 3 (đổi version đồng ý) | `select` từ chối khi chưa đồng ý bản hiện hành (403 `consent-required`) | test "refuses play when the parent has not accepted" |
