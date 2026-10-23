# Pha 3: Vỏ app Capacitor cho iOS và Android

**Tier:** M · **Phụ thuộc:** pha 1 · **Trạng thái:** pending

## Bối cảnh

Máy dev có Xcode 27, Java; chưa có Android SDK (cần cài command-line tools hoặc Android Studio) và CocoaPods (Capacitor bản mới dùng Swift Package Manager, có thể không cần). Game đã có điều khiển cảm ứng (`apps/web/src/game/player/input.ts`), viewport chặn zoom (`apps/web/index.html:6`).

## Việc

1. Workspace mới `apps/mobile` (`@miu/mobile`): `capacitor.config.ts` (`appId: com.hoandat.miuworld`, `appName: Miu World`, `webDir: ../web/dist-native`), dự án `ios/` và `android/` sinh bằng Capacitor CLI và commit (trừ thư mục build, `Pods`, `.gradle`, file ký).
2. Icon và màn chờ sinh từ ảnh đã có trong manifest bằng `@capacitor/assets`; nguồn ảnh khai trong `tools/assets/sources.json` theo `.claude/rules/assets-pipeline.md`, không vẽ mới.
3. Vòng đời: `apps/web/src/platform/app-lifecycle.ts` nghe `pause`/`resume` của `@capacitor/app` → tạm dừng vòng lặp game, nhạc, micro; resume thì nối lại WebSocket. Bản web dùng `visibilitychange` như hiện tại.
4. Nút Back Android: đóng hộp thoại đang mở, rồi về màn trước, ở Home thì hỏi thoát.
5. Giữ màn sáng khi đang ở `/play`; thả khi rời.
6. Thanh trạng thái và vùng an toàn: `viewport-fit=cover`, CSS `env(safe-area-inset-*)` cho HUD, nút, hộp thoại (token trong `apps/web/src/ui/tokens.css`).
7. Quyền micro: `NSMicrophoneUsageDescription` (iOS), `RECORD_AUDIO` (Android), câu giải thích tiếng Việt và tiếng Anh; chỉ hỏi lúc bấm ghi âm hoặc bật chat thoại.
8. Âm thanh: phát được khi gạt im lặng theo cài đặt Âm thanh của game; dừng khi app xuống nền.
9. Hướng màn hình: cho cả dọc và ngang (minigame đã hỗ trợ cả hai, `docs/minigames.md`).

## File

Mới: `apps/mobile/**`, `apps/web/src/platform/app-lifecycle.ts`, `apps/web/src/platform/back-button.ts`. Sửa: `apps/web/index.html`, `apps/web/src/ui/tokens.css`, `apps/web/src/ui/play/play-screen.tsx`, `apps/web/src/ui/sound/music-player.ts`, `pnpm-workspace.yaml`, `package.json` gốc (lệnh `mobile:*`), `.gitignore`.

## Kiểm tra

- `pnpm mobile:ios` mở được app trên Simulator iPhone, `pnpm mobile:android` trên Emulator; đăng nhập (sau pha 2), vào Home, vào một map.
- Test đơn vị cho lifecycle và back-button với plugin giả lập.
- Bản web không đổi: `pnpm --filter @miu/web build`, E2E `@smoke`.

## Tiến độ (23/10/2026)

- [x] Workspace `apps/mobile` (`@miu/mobile`, Capacitor 8.5.3, `@capacitor/app` 8.1.2, `@capacitor-community/keep-awake` 8.0.1): `capacitor.config.ts` lấy `appId`/`appName` từ `apps/web/generated/capacitor.json` (`brand.config.json`: `com.hoandat.miu`, "Miu World"), `webDir: ../web/dist-native`; `ios/` (Swift Package Manager, không CocoaPods) và `android/` sinh bằng `cap add`, commit trừ `public/`, build, keystore.
- [x] Icon và màn chờ: `pnpm --filter @miu/mobile icons` (`apps/mobile/scripts/native-icons.ts`) vẽ lại mọi icon và màn chờ của template từ logo brand đã có trong manifest (`generated/brand/miu-logo-512.png`, bản maskable cho lớp trước icon Android) trên màu nền brand; không vẽ mới, không dùng `@capacitor/assets` (gói cũ, kéo `sharp` và CLI Capacitor 5). Icon App Store 1024 px phóng từ logo 512 px: cần `pnpm assets:logo` thêm bản 1024 trước khi gửi store.
- [x] Vòng đời: `apps/web/src/platform/app-lifecycle.ts` gộp `visibilitychange` với `pause`/`resume` của app; nhạc, micro (chat thoại, ghi âm), vòng minigame, lưu chỗ đứng và đếm giờ chơi dùng chung tín hiệu này; về lại app thì WebSocket nối lại ngay thay vì chờ back-off (test `app-lifecycle.test.ts`, `multiplayer-client.test.ts`).
- [x] Nút Back Android (`platform/back-button.ts`, test): đóng hộp thoại trên cùng (như Esc), trong game mở menu tạm dừng, màn khác lùi một màn, ở `/`, `/home`, `/login` hỏi "Thoát Miu World?".
- [x] Giữ màn sáng khi ở `/play` (`platform/keep-awake.ts`), thả khi rời.
- [x] `viewport-fit=cover` cho bản app (bản web giữ nguyên); HUD, cần điều khiển, toast đã có `env(safe-area-inset-*)`. Rà từng màn theo vùng an toàn (kể cả biến `--safe-area-inset-*` mà Capacitor 8 tiêm trên Android) để pha 5.
- [x] Quyền micro: `NSMicrophoneUsageDescription` tiếng Việt (iOS), `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS` (Android); hệ điều hành chỉ hỏi khi bật chat thoại hoặc ghi âm. Chưa có bản tiếng Anh của câu iOS (cần `en.lproj/InfoPlist.strings`).
- [x] Âm thanh iOS: `AVAudioSession` loại `playback` (trộn với âm khác) nên nhạc theo cài đặt Âm thanh của game, không theo gạt im lặng; dừng khi app xuống nền (nhạc nghe tín hiệu vòng đời).
- [x] Hướng màn hình: dọc và ngang (mặc định của template, cả iPad).
- [x] Màn đăng nhập trong app: "Đăng nhập trên app sẽ có sớm" thay nút Google (Google OAuth không bao giờ mở trong WebView), xem quyết định 23/10/2026 ở `plan.md`.
- [x] Dựng thử iOS Simulator không ký trên máy dev: `BUILD SUCCEEDED`, app 12 MB (phần web 6,4 MB). Android chưa dựng ở máy dev (không có Android SDK): CI dựng APK debug.
- [ ] Mở app trên Simulator/Emulator, vào Home, vào một map: cần đăng nhập trong app (chờ auth-next).

## Rủi ro, hoàn tác

Dựng Xcode và Gradle tốn RAM: không dựng hai nền tảng cùng lúc, không chạy cùng bộ test lớn. Hoàn tác: xóa `apps/mobile`, phần web chỉ thêm module `platform/*` không ảnh hưởng khi không phải bản địa.
