# Review bảo mật: đăng nhập Google OAuth (phụ huynh)

Ngày: 2026-09-29 (Asia/Saigon). Người review: code-reviewer. Không sửa code.

## Phạm vi

- Lúc bắt đầu review thay đổi còn chưa commit; trong lúc review đã được commit thành `95c16d3` (server), `cd25d9c` (web), `1998690` (docs). Review dựa trên `git diff 403c348 HEAD` + file mới; working tree sạch khi kết thúc.
- File: `apps/server/src/auth/{google-auth-routes.ts,google-auth-routes.test.ts,sign-in.ts,auth-routes.ts,auth-context.ts,account-summary.ts}`, `config.ts`, `app.ts`, `db/schema.ts`, `drizzle/0001_google-sign-in.sql`, `packages/schema/src/account.ts`, `apps/web/src/ui/{account/sign-in-screens.tsx,account/parent-gate.tsx,app-shell.tsx,api-client.ts}`, `apps/web/vite.config.ts`, `apps/web/e2e/fake-google-server.ts`, `apps/web/playwright.config.ts`, `CLAUDE.md` (hướng dẫn tunnel).
- Đã chạy: `pnpm vitest run apps/server` → 9 file, 82 test pass. `pnpm typecheck` → pass. Không chạy Playwright/generator.
- Đối chiếu: `plans/dattqh/reports/jev-260929-google-oauth-decisions.md`.

## Tổng quan

Luồng OAuth lõi đúng bài: code + PKCE S256, `state` 32 byte gắn cookie + map dùng một lần, `nonce`, kiểm `iss`/`aud`/`exp`/`email_verified`, redirect cố định, scope tối thiểu, không SDK bên thứ ba. Chỗ yếu không nằm ở giao thức OAuth mà ở **mô hình cổng phụ huynh**: phiên Google trong trình duyệt là "credential sẵn có" trên máy gia đình, và code hiện coi mọi lần đăng nhập Google là bằng chứng phụ huynh (mở cổng + xóa khóa PIN). Ngoài ra đường mật khẩu dev đang bật mặc định và CLAUDE.md hướng dẫn mở nó ra Internet qua tunnel, tái tạo đúng kịch bản pre-hijacking mà quyết định Jev #1 muốn chặn.

## Critical

Không có.

## High

### H1. Đăng nhập Google bất kỳ mở cổng phụ huynh và xóa khóa PIN — trẻ vượt PIN trên máy dùng chung
- `apps/server/src/auth/sign-in.ts:26` (reset `pinFailedCount`), `:28` (`openParentGate: true`); `google-auth-routes.ts:116` (`prompt` do query `intent` của client quyết); callback không biết lượt đó có phải reauth.
- Kịch bản: máy tính/tablet gia đình đang đăng nhập Gmail của phụ huynh (rất phổ biến). Trẻ bấm "Đăng xuất" → "Đăng nhập bằng Google" → chọn tài khoản (`prompt=select_account`, không cần mật khẩu Google) → phiên mới với `parentGateUntil = now + 15 phút` → tạo/xóa/đổi tên hồ sơ, chấp nhận đồng ý. Nếu PIN đang bị khóa 5 lần, cùng thao tác đó cũng xóa khóa. Test `google-auth-routes.test.ts` "reopens a locked PIN…" chứng minh chính hành vi này dùng `select_account`, không phải `prompt=login`.
- Trước đây (mật khẩu) trẻ không biết mật khẩu nên cơ chế tương đương an toàn; với SSO thì không. Quyết định #5 chỉ định `prompt=login` cho reauth nhưng server không cưỡng chế: `intent=reauth` là tham số tùy chọn phía client, bỏ đi là xong.
- Đề xuất:
  1. `signIn` chỉ mở cổng khi `pinHash IS NULL` (lần đầu, để đặt PIN). Parent đã có PIN → phiên mới cổng đóng, phải nhập PIN.
  2. Reset khóa PIN chỉ qua luồng reauth do server ràng buộc: lưu `reauth: true` vào entry `pending` ở `/start`, luôn gửi `prompt=login` (+ `max_age=0`) cho entry đó; ở callback chỉ reset `pinFailedCount` khi `entry.reauth` và (nếu Google trả `auth_time`) `auth_time` trong vài phút gần đây. Lượt thường không đụng `pinFailedCount`.
  3. Thêm test: đăng nhập thường khi PIN đã đặt → `parentGateOpen: false`; đăng nhập thường khi PIN khóa → vẫn `pinLocked: true`.

### H2. Mật khẩu dev bật mặc định + hướng dẫn tunnel công khai → pre-hijacking/chiếm tài khoản trên bản review
- `apps/server/src/config.ts:15` (`NODE_ENV` mặc định `development`), `:105` (`passwordLogin: !production && PASSWORD_LOGIN !== '0'` — fail-open); `CLAUDE.md` (dòng mới: `tunelo http 4173:miu` → `https://miu.tunnel.inetdev.io.vn`); `google-auth-routes.ts:158-162` (gộp theo email, giữ nguyên `passwordHash`).
- Kịch bản: server chạy review qua tunnel không đặt `NODE_ENV=production` (hướng dẫn không yêu cầu, và production bắt buộc `DATABASE_URL` nên thực tế không thể) → `/api/auth/register` mở trên URL công khai. Kẻ tấn công đăng ký `email-cua-phu-huynh@gmail.com` + mật khẩu tự chọn. Phụ huynh/người duyệt đăng nhập Google → code gộp vào tài khoản của kẻ tấn công, **mật khẩu và các phiên cũ vẫn sống** → kẻ tấn công đăng nhập bằng mật khẩu, thấy/chỉnh hồ sơ trẻ phụ huynh tạo ra. Kẻ tấn công còn biết PIN nếu chính họ đặt lúc đăng ký (register nhận PIN).
- Cùng lỗi fail-open: bất kỳ triển khai nào quên `NODE_ENV=production` đều bật lại mật khẩu, cho phép ghi đè `GOOGLE_TOKEN_URL` (xem M3) và cookie không Secure.
- Đề xuất:
  1. Đảo mặc định: `passwordLogin = !production && PASSWORD_LOGIN === '1'`; đặt `PASSWORD_LOGIN: '1'` trong `playwright.config.ts` và script review cần nó.
  2. Khi gộp theo email: `passwordHash = null`, `pinHash = null` (buộc đặt lại PIN) và xóa mọi session hiện có của `byEmail.id` trong cùng transaction — người giữ email đã xác minh là chủ mới, mọi credential cũ bị thu hồi.
  3. Hướng dẫn tunnel trong `CLAUDE.md` ghi rõ `PASSWORD_LOGIN=0` (hoặc nhờ mặc định mới).

## Medium

### M1. `POST /api/auth/pin` không bị giới hạn thời gian — ai cầm phiên chưa có PIN đều đặt được PIN
- `apps/server/src/auth/auth-routes.ts:141-153`. Chỉ `requireParent`, không kiểm `parentGateUntil`.
- Kịch bản: phụ huynh đăng nhập Google lần đầu rồi đóng tab (phiên sống 30 ngày, idle 7 ngày). Trẻ mở lại app → UI đẩy tới `/set-pin` → trẻ đặt PIN của mình → sở hữu khu phụ huynh; phụ huynh bị 409 `pin-already-set` và không có đường khôi phục ngoài H1.
- Đề xuất: yêu cầu `ctx.session.parentGateUntil > now` (cửa sổ 15 phút từ lúc đăng nhập); hết hạn thì trả 403 và UI chuyển về đăng nhập Google lại. Thêm test hết cửa sổ.

### M2. Map `pending` toàn cục 1000 mục — DoS đăng nhập cho mọi người, kích hoạt được từ trình duyệt nạn nhân
- `google-auth-routes.ts:25`, `:96-101`. `/start` là GET (miễn kiểm Origin) và tạo mục 10 phút mỗi lần gọi; khi đầy, **mọi** người dùng nhận `rate-limited`.
- Kịch bản: rate limit 30/15 phút/IP (IPv6 gộp /56) → 34 IP là đủ lấp map trong 10 phút; hoặc một trang bên thứ ba nhúng `<img src="https://<host>/api/auth/google/start">` để trình duyệt khách truy cập làm việc đó bằng IP của họ. Ngoài ra map nằm trong bộ nhớ một tiến trình: restart hoặc chạy >1 instance làm callback thất bại.
- Đề xuất: bỏ map, đưa `verifier` + `nonce` (+ cờ `reauth`) vào cookie state httpOnly (có thể mã hóa/HMAC bằng secret server). Tính dùng-một-lần đã có nhờ xóa cookie ở callback + code của Google chỉ đổi được một lần + PKCE. Nếu giữ map: đặt trần theo IP và/hoặc đuổi mục cũ nhất thay vì từ chối toàn cục.

### M3. Không verify chữ ký ID token là hợp lệ **chỉ khi** `tokenUrl` là HTTPS của Google — điều này phụ thuộc `NODE_ENV`
- `google-auth-routes.ts:52-73`, `:131-145`; `config.ts` chặn `GOOGLE_*_URL` chỉ khi `production`.
- Kiểm tra: với `tokenUrl` mặc định `https://oauth2.googleapis.com/token`, `fetch` của Node kiểm TLS, nên theo OIDC Core §3.1.3.7 bước 6 được bỏ verify chữ ký — cách gọi hiện tại đúng. Nhưng (a) môi trường không đặt `production` cho phép trỏ token endpoint tùy ý (E2E dùng `http://127.0.0.1:8788` và token `alg: none`), (b) `NODE_TLS_REJECT_UNAUTHORIZED=0` bất kỳ đâu trong môi trường cũng vô hiệu giả định này.
- Đề xuất: ngoài `production`, chỉ chấp nhận override là `http://127.0.0.1`/`localhost` (hoặc chỉ khi `NODE_ENV=test`); ở startup từ chối chạy nếu `NODE_TLS_REJECT_UNAUTHORIZED === '0'` khi có Google config; khi `tokenUrl` không phải hằng mặc định thì log cảnh báo. Không bắt buộc verify JWKS.

## Low

- **L1** `google-auth-routes.ts:157-167`: `.for('update')` trên SELECT không trả dòng không khóa gì; hai callback đồng thời cho cùng `sub`/email mới → vi phạm unique → 500 JSON trên một điều hướng trình duyệt. Bắt lỗi unique và thử lại lookup, hoặc `insert … onConflictDoNothing` rồi select.
- **L2** Email Google đổi không được đồng bộ: `byGoogle` trả id cũ, cột `email` giữ giá trị cũ; account Google khác sau này mang email cũ sẽ bị `google-conflict`. Cập nhật `email` khi `byGoogle` và email khác (nếu email mới chưa bị dùng).
- **L3** `:65` `aud` dạng mảng nhiều phần tử: OIDC yêu cầu kiểm `azp === clientId`. Google thực tế trả chuỗi; thêm kiểm `azp` khi `aud` là mảng.
- **L4** `:87` cookie state không có tiền tố; production nên dùng `__Secure-miu_oauth_state` (`__Host-` không dùng được vì `path` khác `/`) để chống cookie tossing từ subdomain.
- **L5** Rate limiter dùng chung một bộ đếm cho `/start` và `/callback` (một lượt đăng nhập tốn 2); 30/15 phút sau NAT trường học có thể chạm ngưỡng. Chấp nhận được, ghi nhận.
- **L6** Test phantom: `google-auth-routes.test.ts` tính `challenge` từ `code_verifier` rồi chỉ kiểm độ dài 43 — không so với `code_challenge` trong URL `/start`. Fake Google E2E (`fake-google-server.ts`) cũng không kiểm PKCE. Nên so `sha256(verifier) === code_challenge` ở cả hai.
- **L7** Thiếu test: `iss` không phải chuỗi, `sub`/email rỗng, callback với `error=access_denied`, cookie state đúng nhưng hết TTL, `/auth/pin` khi đã hết cửa sổ (M1), đăng nhập Google khi PIN đã đặt (H1).

## Đã kiểm là đúng

- CSRF/login-CSRF: `state` 256 bit, so khớp với cookie httpOnly `SameSite=Lax` path `/api/auth/google`; kẻ tấn công không cài được cookie của mình vào trình duyệt nạn nhân (trừ cookie tossing, L4). Cookie bị xóa ngay ở callback, mục map xóa trước khi kiểm hạn → dùng một lần; test replay có.
- `SameSite=Lax` vẫn gửi cookie state khi Google chuyển hướng top-level GET về callback — đúng.
- PKCE S256 với verifier 256 bit; secret client chỉ gửi trong body POST tới token endpoint, không vào URL/log/redirect.
- `nonce` so khớp tuyệt đối; `iss` ∈ hai giá trị Google; `exp` kiểm theo `clock()`; `email_verified` bắt buộc true.
- Open redirect: mọi redirect là hằng (`/`, `/login?error=<mã cố định>`); không có `returnTo`; `authUrl`/`redirect_uri` lấy từ config. UI chỉ ánh xạ `error` qua bảng cố định, React escape.
- Session fixation: `signIn` xóa phiên đang có và cấp token mới; cookie phiên `__Host-` + Secure ở production (không đổi).
- Lộ dữ liệu: log chỉ in UUID parent; lỗi token endpoint không log body; scope `openid email`, chỉ lưu `sub` + email; không lưu access/refresh token.
- Production: `PASSWORD_LOGIN=1` và `GOOGLE_*_URL` bị từ chối lúc khởi động; thiếu Google env thì fail-fast; route mật khẩu trả 404 khi tắt; đăng nhập mật khẩu vào tài khoản Google-only trả 401 với decoy hash (không lộ tồn tại tài khoản).
- `/auth/pin` chống ghi đè bằng `WHERE pin_hash IS NULL` (nguyên tử), có `pinLimit` và kiểm Origin (POST). `/parent-gate/unlock` trả 409 khi chưa có PIN; `isParentGateOpen` yêu cầu `pinHash` → không có PIN thì không vào được consent/hồ sơ/chơi.
- Gộp tài khoản từ chối khi email đã gắn `sub` khác (`google-conflict`).
- Migration `0001`: chỉ nới NOT NULL + thêm cột unique, không mất dữ liệu; unique cho phép nhiều NULL (Postgres).
- `vite.config.ts` `allowedHosts` rỗng → giữ bảo vệ DNS rebinding mặc định; chỉ thêm host tường minh.
- Express 5 (`^5.2.1`) bắt rejection trong handler async → không có unhandled rejection.
- Fake Google chỉ bind `127.0.0.1`; không có secret thật trong fixture.

## Hành động đề xuất (ưu tiên)

1. H1: không mở cổng khi đăng nhập Google nếu PIN đã có; reset khóa chỉ qua reauth do server ràng buộc (`prompt=login`, `max_age`, kiểm `auth_time`).
2. H2: đảo mặc định `PASSWORD_LOGIN` sang opt-in; khi gộp theo email thì thu hồi mật khẩu, PIN, phiên cũ; cập nhật hướng dẫn tunnel.
3. M1: `/auth/pin` chỉ trong cửa sổ 15 phút sau đăng nhập.
4. M2: chuyển PKCE verifier/nonce vào cookie, bỏ map toàn cục.
5. M3: siết override endpoint ngoài production; chặn `NODE_TLS_REJECT_UNAUTHORIZED=0`.
6. Low: L1–L7 theo thời gian.

## Câu hỏi mở

1. H1 thay đổi hành vi so với quyết định Jev #5 (mở lại bằng đăng nhập Google): hướng "đăng nhập thường không mở cổng, chỉ reauth `prompt=login` mới reset khóa" có cần người sở hữu xác nhận không, hay coi là chi tiết thực thi của #5?
2. Bản review qua tunnel có dùng tài khoản Google thật của người sở hữu không? Nếu có, dữ liệu PGlite dev trên tunnel hiện có tài khoản mật khẩu nào trùng email thật cần dọn trước khi áp H2?
3. Có kế hoạch chạy nhiều instance server không? Nếu có, M2 (map trong bộ nhớ) là lỗi chức năng chứ không chỉ DoS.

## Xử lý (implementer, 2026-09-29)

| Phát hiện | Xử lý | Bằng chứng |
| --- | --- | --- |
| H1 đăng nhập Google mở cổng + xóa khóa PIN | Đăng nhập Google chỉ mở khu phụ huynh khi chưa có PIN. Xóa khóa PIN và mở khu chỉ sau đăng nhập lại do server yêu cầu (`prompt=login`, `max_age=0`, `auth_time` ≤ 5 phút) | test "does not let a plain Google sign-in skip an existing PIN", "reopens a locked PIN only after a fresh Google re-authentication" |
| H2 mật khẩu tự bật + gộp email | `PASSWORD_LOGIN` phải đặt `1` tường minh (E2E đặt; bản review không đặt). Gộp theo email xóa mật khẩu, PIN và mọi phiên cũ | test "is off unless explicitly enabled", "links a verified email … dropping its password, PIN and sessions" |
| M1 đặt PIN lần đầu không giới hạn | `POST /api/auth/pin` chỉ trong cửa sổ 15 phút mở bởi lần đăng nhập; UI có link đăng nhập lại | test "lets the first PIN be set only within 15 minutes" |
| M2 bộ nhớ state chung | Bỏ bộ nhớ: state, PKCE verifier, nonce, cờ reauth nằm trong cookie httpOnly một lần (`__Host-` ở production) | test "keeps no per-login state on the server", "tampered" |
| M3 override endpoint / TLS | Ngoài production chỉ cho endpoint loopback; từ chối khởi động khi `NODE_TLS_REJECT_UNAUTHORIZED=0` và có Google | test "only lets the Google endpoints point at loopback…" |
| L1 callback đồng thời → 500 | Lỗi unique khi tạo → đọc lại theo `sub` | `google-auth-routes.ts` |
| L3 `azp` | Khi `aud` là mảng, bắt buộc `azp` = client id | `checkIdToken` |
| L4 cookie `__Secure-` | `__Host-miu_oauth` ở production | `google-auth-routes.ts` |
| L5 chung bộ đếm | Tách limiter `start` và `callback` | `google-auth-routes.ts` |
| L6 test PKCE | Test so `code_challenge` với sha256(verifier); fake Google E2E kiểm PKCE | test + `fake-google-server.ts` |
| L2 đổi email bên Google | Chưa làm: giữ email lúc tạo; ghi nợ | — |
| Câu hỏi 1 (Jev #5) | Giữ ý Jev (mở khóa PIN bằng đăng nhập Google lại), chỉ ép đúng nghĩa "đăng nhập lại" | — |
