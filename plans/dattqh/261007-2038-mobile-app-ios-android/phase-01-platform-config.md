# Pha 1: Gốc API, asset, WebSocket cấu hình được

**Tier:** M · **Phụ thuộc:** — · **Trạng thái:** pending

## Bối cảnh

Bản web giả định chạy cùng origin với server. Trong app, trang chạy ở `capacitor://localhost` / `https://localhost`, nên mọi đường dẫn tương đối phải đổi sang gốc server khi chạy bản địa. Hiện có các chỗ cố định:

- API: `apps/web/src/ui/api-client.ts:22`, `apps/web/src/ui/mail/mail-api.ts`, `apps/web/src/ui/i18n/i18n.ts:130`.
- Asset: `apps/web/src/game/asset-loader.ts:7` (`ASSET_PREFIX`, và `window.location.origin` ở dòng 48), `apps/web/src/ui/kit/ui-art.ts:228`, `apps/web/src/asset-versions.ts`, `apps/web/src/ui/fonts.css` (font sẽ nằm trong gói app, xem pha 4).
- WebSocket: `apps/web/src/game/multiplayer/multiplayer-client.ts:65`.
- Server: `apps/server/src/auth/origin-check.ts` (danh sách origin), `apps/server/src/config.ts` (`ALLOWED_ORIGINS`), CSP ở `apps/web/vite.config.ts:26`.

## Việc

1. Tạo `apps/web/src/platform/endpoints.ts`: `apiUrl(path)`, `assetUrl(path)`, `wsUrl(path)`, `isNativeApp()`. Bản web trả đường dẫn tương đối như cũ; bản build `--mode native` đọc `VITE_MIU_SERVER_ORIGIN` (vd `https://miu.hoandat.com`). Không đọc biến nào lúc chạy từ người dùng.
2. Đổi các chỗ ở trên sang hàm mới; mail và i18n đi qua `api-client` nếu được (gom lại thay vì thêm chỗ gọi `fetch` riêng).
3. `vite.config.ts`: thêm mode `native` (đầu ra `apps/web/dist-native`, không copy `game-assets` lớn, xem pha 4), CSP của bản native thêm origin server vào `connect-src`, `img-src`, `media-src`, `font-src`.
4. Server: CORS cho `/api` và `/game-assets` chỉ với origin của app (`capacitor://localhost`, `https://localhost`), khai qua `ALLOWED_ORIGINS` như các origin khác; `Access-Control-Allow-Headers: Authorization, Content-Type`; không bật `credentials` (app dùng Bearer, xem pha 2). Preflight `OPTIONS` không cần phiên.
5. `origin-check.ts` giữ nguyên luật (thiếu `Origin` thì từ chối); origin app chỉ hợp lệ khi có trong danh sách.
6. Kiểm `pnpm security:dist` chạy cả trên `dist-native`.

## File

Sửa: `apps/web/src/ui/api-client.ts`, `apps/web/src/ui/mail/mail-api.ts`, `apps/web/src/ui/i18n/i18n.ts`, `apps/web/src/game/asset-loader.ts`, `apps/web/src/ui/kit/ui-art.ts`, `apps/web/src/asset-versions.ts`, `apps/web/src/game/multiplayer/multiplayer-client.ts`, `apps/web/vite.config.ts`, `apps/server/src/app.ts`, `apps/server/src/config.ts`, script `security:dist`.
Mới: `apps/web/src/platform/endpoints.ts` (+ test), test CORS ở server.

## Kiểm tra

- Test đơn vị `endpoints` cho hai chế độ; test server: origin app được CORS, origin lạ không, POST thiếu `Origin` vẫn 403.
- `pnpm --filter @miu/web build` (web không đổi hành vi), build `--mode native` thành công.
- E2E `@smoke` của web xanh (bản web không bị ảnh hưởng).

## Tiến độ (23/10/2026)

- [x] `apps/web/src/platform/endpoints.ts` (`apiUrl`, `assetUrl`, `assetOrigin`, `wsUrl`, `webOrigin`, `NATIVE_APP`) + test hai chế độ. Gốc server đọc lúc build từ `VITE_MIU_SERVER_ORIGIN`, mặc định là origin web của brand (`https://miu.hoandat.com`); chỉ nhận https, http chỉ tới loopback (`apps/web/vite-native.ts`).
- [x] Đổi các chỗ gọi: `api-client.ts`, `mail-api.ts` (nay đi qua `api()`), `i18n.ts`, `analytics/track.ts`, `asset-loader.ts`, `ui-art.ts`, `multiplayer-client.ts`; link chia sẻ (mời bạn, kết quả, thẻ tuần) dùng `webOrigin()` để app không chia sẻ link `capacitor://`. `asset-versions.ts` không cần sửa.
- [x] `vite.config.ts` mode `native`: ra `apps/web/dist-native`, không trang bài học, không trang review, không asset game ngoài font; CSP bản native thêm origin server vào `connect-src` (cả `wss:`), `img-src`, `media-src` (font nằm trong gói nên `font-src` giữ `'self'`); `viewport-fit=cover` chỉ ở bản native. CSP bản web giữ nguyên (test `content-security-policy.test.ts`).
- [x] Server: `apps/server/src/auth/app-cors.ts` trả CORS cho đúng `capacitor://localhost` và `https://localhost` trên `/api` (không `credentials`, header `Authorization, Content-Type, x-miu-ga`, preflight không cần phiên); hai origin đó được nhận ở kiểm `Origin` chống CSRF và WebSocket; origin khác và request thiếu `Origin` vẫn bị từ chối (test `app-cors.test.ts`). Hằng số trong code, không qua `ALLOWED_ORIGINS`, nên production không cần đổi env.
- [x] `/game-assets/` (nginx): `nginx-prod.conf` trả `Access-Control-Allow-Origin: *` chỉ ở `/game-assets/` (test `nginx-prod.test.ts`). 23/10/2026: đổi từ "đúng hai origin + `Vary: Origin`" sang `*` vì Cloudflare không chia cache theo `Vary` và file game công khai; bỏ được Cache Rule.
- [x] `pnpm security:dist --native` quét `dist-native` (không đáp án quest, không asset game ngoài font).
- [ ] Deploy nginx + server (`docs/deployment-guide.md` §6); user cho phép deploy khi CI xanh (23/10/2026).
- [ ] Phiếu viết in (`/parent/worksheets`) dùng font qua `url('/api/worksheets/fonts/…')` trong CSS; trong app đường dẫn này không tới server. Làm cùng đăng nhập trong app (cần đăng nhập mới vào được màn đó).
- [ ] E2E `@smoke` của web chạy trên CI (không chạy ở máy dev).

## Rủi ro, hoàn tác

Sai CSP làm trắng trang web: test `apps/web/src/content-security-policy.test.ts` giữ CSP bản web y nguyên. Hoàn tác: revert commit, server không có migration ở pha này.
