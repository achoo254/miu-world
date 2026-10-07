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

## Rủi ro, hoàn tác

Dựng Xcode và Gradle tốn RAM: không dựng hai nền tảng cùng lúc, không chạy cùng bộ test lớn. Hoàn tác: xóa `apps/mobile`, phần web chỉ thêm module `platform/*` không ảnh hưởng khi không phải bản địa.
