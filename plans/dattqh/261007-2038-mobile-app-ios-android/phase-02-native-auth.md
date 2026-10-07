# Pha 2: Đăng nhập bản địa Google và Apple

**Tier:** L · **Phụ thuộc:** pha 1 · **Trạng thái:** pending

## Bối cảnh

- Web đăng nhập Google bằng OAuth redirect (`apps/server/src/auth/google-auth-routes.ts`), phiên là cookie `httpOnly; SameSite=Lax` (`session-cookie.ts`), mọi route đọc phiên qua `readSessionToken` (`auth-context.ts`), WebSocket cũng đọc cookie lúc upgrade (`apps/server/src/multiplayer/multiplayer-store.ts:62`).
- Trong app: Google chặn OAuth trong WebView; cookie không đi theo request chéo site; Apple bắt buộc có Sign in with Apple khi có Google (Guideline 4.8) và bắt buộc thu hồi token Apple khi xóa tài khoản.
- Bảng `parents` có `googleSub` unique (`apps/server/src/db/schema.ts:21`); chưa có cột cho Apple.

## Việc

1. **Server, kiểm ID token:** `POST /api/auth/native/google` và `POST /api/auth/native/apple` nhận `{ idToken, nonce }`, kiểm chữ ký theo JWKS của Google/Apple, `iss`, `aud` (client ID iOS, Android, Services ID của Apple, đọc từ config), hạn, `nonce`. Tìm hoặc tạo tài khoản theo `google_sub` / `apple_sub`, đi qua đúng luồng đồng ý (consent) và chọn người chơi như web (`sign-in.ts`). Trả `{ token, expiresAt }` trong body, không đặt cookie.
2. **Migration:** thêm `apple_sub text unique null` vào `parents`; lưu refresh token Apple (mã hóa khi lưu, khóa từ env) để thu hồi khi xóa. Sao lưu database trước khi chạy migration ở staging/production.
3. **Phiên Bearer:** `readSessionToken` nhận thêm `Authorization: Bearer <token>`; cùng bảng `sessions`, cùng hạn tuyệt đối. Request có Bearer không cần cookie; request có cookie vẫn qua kiểm `Origin` như cũ.
4. **Vé WebSocket:** `POST /api/ws-ticket` (cần phiên) trả vé ngẫu nhiên dùng một lần, sống 30 s; upgrade `/api/ws?ticket=` nhận vé thay cookie. Không đưa token phiên vào URL. Tín hiệu chat thoại đi qua cùng socket nên dùng chung.
5. **Xóa tài khoản:** luồng xóa sẵn có gọi thêm `https://appleid.apple.com/auth/revoke` khi tài khoản có `apple_sub`.
6. **Client:** `apps/web/src/platform/native-auth.ts` dùng plugin đăng nhập (Google trên iOS/Android, Apple trên iOS); lưu token trong Keychain/Keystore qua plugin lưu bảo mật; `api-client` gắn Bearer khi `isNativeApp()`; đăng xuất xóa token và gọi API đăng xuất. Màn đăng nhập (`apps/web/src/ui/account/**`) hiện nút Apple trên iOS, nút Google trên cả hai, theo đúng hướng dẫn hiển thị của Apple/Google. Không có nút đăng nhập mật khẩu trong app.
7. Ghi log không chứa token, email (`.claude/rules/product-audience.md`).

## Cổng của người

Tạo OAuth client iOS + Android trên Google Cloud, App ID + Services ID + khóa Sign in with Apple trên Apple Developer (cần tài khoản Apple Developer). Giá trị đặt trong file env ngoài repo (`docs/STAG-DEV-README.md` §3), không commit.

## File

Sửa: `apps/server/src/auth/{auth-context,session-cookie,sign-in,account-routes,auth-routes}.ts`, `apps/server/src/multiplayer/multiplayer-store.ts`, `apps/server/src/db/schema.ts`, `apps/server/src/config.ts`, `apps/web/src/ui/api-client.ts`, `apps/web/src/game/multiplayer/multiplayer-client.ts`, màn đăng nhập trong `apps/web/src/ui/account/`, `apps/web/src/ui/i18n/locales/{vi,en}.json`.
Mới: `apps/server/src/auth/native-auth-routes.ts` (+ test), `apps/server/src/auth/ws-ticket.ts` (+ test), migration Drizzle, `apps/web/src/platform/native-auth.ts`.

## Kiểm tra

- Test server với JWKS giả lập khóa của test (không gọi mạng): token sai chữ ký, sai `aud`, hết hạn, sai `nonce` đều 401; token đúng tạo đúng một tài khoản; lần hai ra cùng tài khoản; tài khoản Google đã có trên web đăng nhập từ app thấy cùng người chơi.
- Test vé WebSocket: dùng lại vé, vé hết hạn, vé của phiên đã đăng xuất đều bị từ chối.
- Test IDOR: Bearer của tài khoản A không đọc được người chơi của B (theo bảng endpoint của `security`).
- `pnpm test`, `pnpm typecheck`, `pnpm lint`; E2E `--project setup --project account-flow` cho bản web.

## Rủi ro, hoàn tác

Migration chỉ thêm cột null, hoàn tác bằng migration xóa cột. Đổi `readSessionToken` ảnh hưởng mọi route: test hiện có của auth phải xanh trước khi merge. Deploy production hỏi người trước.
