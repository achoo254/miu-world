---
title: Mobile app Miu World cho iPhone và Android
description: Đóng gói game web hiện có thành app iPhone và Android (Capacitor), đăng nhập bản địa, tải asset theo map, giao diện điện thoại, thử nội bộ rồi phát hành công khai trên App Store và Google Play.
status: pending
priority: P1
tier: XL
branch: main
tags: [feature, frontend, backend, auth, infra, mobile]
blockedBy: [261004-1617-moderation-safety]  # chỉ chặn bước phát hành công khai (pha 7)
blocks: []
created: 2026-10-07
---

# Mobile app Miu World: iPhone và Android

**Trạng thái:** đã duyệt hướng (07/10/2026), chờ bắt đầu · **Tier:** XL · **Nhánh:** `main` · **Ngày:** 07/10/2026
**Nguồn:** người sở hữu 07/10/2026 "chuẩn bị plan làm mobile app, ưu tiên iPhone và Android"; `.claude/rules/product-audience.md` (web hôm nay, mobile app sau; logic ở server và `packages/*` để app dùng lại); Master Plan v3 §12 (hiệu năng mobile).

## Kết quả mong muốn

Một app cài được trên iPhone (TestFlight) và Android (Google Play, kênh thử nội bộ), cùng một tài khoản và tiến độ với bản web: đăng nhập trong app bằng Google hoặc Apple, vào mọi map, làm quest, chơi online, chat thoại, ghi âm. App chơi mượt trên điện thoại, giao diện vừa màn điện thoại cả dọc lẫn ngang, không cần sửa logic game. Sau khi thử nội bộ, app được phát hành công khai trên App Store và Google Play, ngay khi kiểm duyệt (plan `261004-1617-moderation-safety`) đã chạy trên production và pháp lý đã được xác nhận.

## Tiêu chí nghiệm thu

1. `pnpm mobile:ios` và `pnpm mobile:android` dựng được app từ cùng mã `apps/web`; CI dựng bản Android debug và kiểm bản iOS (không ký) mỗi lần push.
2. Đăng nhập trong app bằng Google (iOS, Android) và Apple (iOS) ra đúng tài khoản; tài khoản Google đã có trên web thì thấy đủ người chơi và tiến độ cũ. Xóa tài khoản trong app có thu hồi token Apple.
3. Mọi API, WebSocket multiplayer, tín hiệu chat thoại chạy từ app tới server thật; server vẫn từ chối request web không có `Origin` hợp lệ như hiện nay.
4. Gói app không chứa toàn bộ 488 MB asset: app tải asset theo map từ server, giữ trong bộ nhớ đệm theo phiên bản, lần sau vào map không tải lại.
5. Mỗi màn chính (đăng nhập, chọn người chơi, Home, `/play` với HUD, quest, thử thách, minigame, cửa hàng, bạn bè, cài đặt) không tràn và không bị tai thỏ che ở 390 × 844 (dọc, ngang) và 360 × 800 (Android), có ảnh chụp trong trang review.
6. Điện thoại tự chọn mức chất lượng hợp máy, người chơi đổi được trong Cài đặt; app không văng khi chơi 15 phút trên một iPhone và một máy Android tầm trung (người đo, theo kịch bản pha 5).
7. Có bản TestFlight và bản Google Play internal testing để người sở hữu và bé cài thử; sau đó app qua duyệt và có mặt công khai trên App Store và Google Play (Play phát hành dần theo tỉ lệ).
8. Gate repo xanh: `pnpm assets:check` → `pnpm content:check` → `pnpm test` → `pnpm typecheck` → `pnpm lint`, `pnpm --filter @miu/web build`, `pnpm security:dist`.

## Quyết định kỹ thuật: Capacitor bọc đúng app web hiện có

Game là React 19 + Three.js + Web Worker + WebRTC, toàn bộ UI ở `apps/web/src/ui`, điều khiển cảm ứng đã có (`apps/web/src/game/player/input.ts`: cần điều khiển, Chạy/Nhảy, kéo xoay camera, chụm zoom), minigame đã thiết kế cho điện thoại (`docs/minigames.md`: arena 600 × 1298). Capacitor chạy chính bundle đó trong WKWebView/Android WebView, thêm plugin bản địa cho đăng nhập, giữ màn sáng, vòng đời app.

| Phương án | Vì sao không chọn |
| --- | --- |
| React Native / Expo | Viết lại toàn bộ UI; Three.js trên `expo-gl` yếu, không có Web Worker cho mesher, WebRTC phải đổi thư viện. |
| Flutter / Swift + Kotlin | Viết lại cả game lẫn UI, hai mã nguồn. |
| Chỉ PWA | Không có mặt trên store; iOS giới hạn PWA (bộ nhớ, âm thanh nền, cài đặt khó cho người chơi). |
| WebView mở thẳng `https://miu.hoandat.com` | Dễ bị Apple từ chối theo mục 4.2 (app chỉ bọc trang web); không có vỏ chạy khi mạng chập chờn; đăng nhập Google bị chặn trong WebView. |

Hệ quả cần xử lý (đã kiểm trong code):
- App chạy ở origin `capacitor://localhost` (iOS) và `https://localhost` (Android), khác origin server. Code hiện gọi `/api` tương đối (`apps/web/src/ui/api-client.ts:22`), WebSocket theo `window.location.host` (`apps/web/src/game/multiplayer/multiplayer-client.ts:65`), asset ở `/game-assets/` (`apps/web/src/game/asset-loader.ts:7`). Cần một chỗ cấu hình gốc API và asset.
- Phiên đăng nhập là cookie `httpOnly; SameSite=Lax` (`apps/server/src/auth/session-cookie.ts`). Cookie này không đi kèm request chéo site từ WebView, nên app dùng token `Authorization: Bearer`, còn WebSocket dùng vé dùng một lần.
- Google chặn OAuth trong WebView (`disallowed_useragent`), nên app đăng nhập bằng SDK bản địa và gửi ID token cho server kiểm.
- Apple bắt buộc có "Sign in with Apple" khi app có đăng nhập Google (App Store Review Guideline 4.8), nên bảng `parents` cần thêm `apple_sub` (migration).

## Pha

| Pha | Tier | Nội dung | Phụ thuộc |
| --- | --- | --- | --- |
| [1](phase-01-platform-config.md) | M | Gốc API/asset/WebSocket cấu hình được, chế độ build `native`, CORS và origin của app ở server, CSP | — |
| [2](phase-02-native-auth.md) | L | Đăng nhập Google/Apple bản địa, token Bearer, vé WebSocket, `apple_sub` + migration, thu hồi token Apple khi xóa tài khoản | 1 |
| [3](phase-03-capacitor-shell.md) | M | Workspace `apps/mobile`, dự án iOS/Android, icon và màn chờ, vòng đời app, quyền micro, nút Back Android, giữ màn sáng | 1 |
| [4](phase-04-asset-delivery.md) | L | Chia asset: vỏ trong app, map tải theo nhu cầu từ server, đệm theo phiên bản, báo lỗi mạng | 1, 3 |
| [5](phase-05-phone-ux-performance.md) | L | Chất lượng tự chọn theo máy, giới hạn bộ nhớ, giao diện điện thoại dọc/ngang, vùng an toàn, E2E thiết bị giả lập, kịch bản đo máy thật | 3, 4 |
| [6](phase-06-build-ci.md) | M | Lệnh `pnpm mobile:*`, CI dựng Android debug và iOS không ký, ký bản phát hành ngoài repo | 3 |
| [7](phase-07-store-internal-release.md) | M | TestFlight + Play internal testing, hồ sơ store (vi/en), ảnh, nhãn quyền riêng tư, xếp hạng tuổi, gửi duyệt và phát hành công khai, trang review, tài liệu | 2, 4, 5, 6; công khai chờ `moderation-safety` + pháp lý |

Pha 2, 3 chạy song song được sau pha 1 (file không trùng: pha 2 ở `apps/server/src/auth/**` và `apps/web/src/ui/account/**`; pha 3 ở `apps/mobile/**`).

## Quyết định của người sở hữu (07/10/2026)

Tài khoản nhà phát triển cá nhân cho cả Apple và Google; phát hành công khai khi xong (không dừng ở thử nội bộ); bundle ID `com.hoandat.miuworld`, tên app "Miu World".

## Cổng của người

- **Chi phí (đã chốt 07/10/2026):** tài khoản **cá nhân** cả Apple Developer Program (99 USD/năm) và Google Play Console (25 USD một lần); người sở hữu tự đăng ký. Tài khoản Play cá nhân mới phải có ít nhất 12 người thử trong 14 ngày (closed testing) trước khi được phát hành công khai; số người và thời gian theo quy định Google lúc làm.
- **Pháp lý:** game online nhiều người chơi phát hành ở Việt Nam có thể cần giấy phép trò chơi G1 trước khi lên store và quảng cáo; cần người có chuyên môn xác nhận trước khi phát hành **công khai**. Bản thử nội bộ không bị chặn bởi việc này. Có thể phát hành công khai trước ở các nước khác và loại Việt Nam khỏi danh sách nước cho tới khi rõ, nếu người sở hữu muốn.
- **Kiểm duyệt trước khi công khai:** Apple (mục 1.2) và Google yêu cầu app có nội dung người dùng tạo ra hoặc chat với người lạ phải có báo cáo, chặn người, xử lý vi phạm. Plan `261004-1617-moderation-safety` phải xong và chạy trên production trước khi gửi duyệt công khai; plan đó cần có lối báo cáo/chặn dùng được trong app. Thử nội bộ (người sở hữu, bé) không cần chờ.
- **Máy đo:** một iPhone và một máy Android tầm trung để đo 15 phút (pha 5). Máy chuẩn iPad Gen 10 (DEVICE-01) vẫn giữ nguyên.
- **Deploy production:** pha 1, 2 đổi server (CORS, đăng nhập mới, migration). Mỗi lần deploy production đều hỏi trước.

## Không làm (ghi rõ)

- Không thêm tính năng mới chỉ có trên mobile (thông báo đẩy, rung, mua trong app, widget). Thông báo đẩy để plan sau nếu người sở hữu muốn.
- Không viết lại UI hay logic game cho app; chỉ sửa chỗ cần cho điện thoại.
- Không đổi luồng đăng nhập web (cookie + OAuth redirect giữ nguyên).
- Không chơi offline hoàn toàn: server vẫn là nguồn sự thật cho thưởng, XP (CLAUDE.md).
- Không commit keystore, chứng chỉ ký, file `GoogleService-Info.plist`/`google-services.json` có khóa thật, hay client ID bí mật (repo công khai).

## Rủi ro

| Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- |
| WKWebView trên iPhone hết bộ nhớ khi map lớn (process bị kill) | Cao | Pha 5: mức `low` mặc định trên điện thoại, giới hạn số vùng giữ trong `sparse-world.ts`, bắt sự kiện WebView bị kill để mở lại ở mức thấp hơn. |
| Apple từ chối bản review (4.2, 4.8, 1.2, 5.1.1 xóa tài khoản) | Trung bình | Game là bundle thật có plugin bản địa; Sign in with Apple; kiểm duyệt trước khi công khai; xóa tài khoản đã có (`apps/web/src/ui/account/account-data-panel.tsx`). |
| Tải asset trên mạng di động lâu, tốn dung lượng | Trung bình | Pha 4: tải theo map, đệm theo phiên bản, đo MB mỗi map và đưa vào trang review. |
| Token Bearer bị lộ trên máy | Thấp | Lưu trong Keychain/Keystore, hạn như phiên cookie, thu hồi khi đăng xuất. |
| Máy dev 16 GB phải dựng Xcode + Gradle | Trung bình | Không dựng iOS và Android cùng lúc; mỗi lần một bản (`~/.claude/rules/process-management.md`). |

## Dependency mới (ghi vào trang review của đợt)

`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`, `@capacitor-community/keep-awake` (hoặc tương đương), một plugin đăng nhập Google + Apple, một plugin lưu bảo mật Keychain/Keystore, `@capacitor/assets` (dev), ở server `jose` (kiểm JWT Google/Apple) nếu chưa có. Phiên bản chốt lúc làm pha theo docs mới nhất.
