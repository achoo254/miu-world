# Pha 5: Giao diện điện thoại và hiệu năng

**Tier:** L · **Phụ thuộc:** pha 3, 4 · **Trạng thái:** pending

## Bối cảnh

- Chất lượng chỉ chọn qua `?quality=` và mặc định `mid` (`apps/web/src/game/quality.ts`); chưa tự chọn theo máy, chưa có trong Cài đặt.
- Máy chuẩn đo là iPad Gen 10 (Master Plan §12); điện thoại yếu hơn được phép dùng `low`.
- UI chủ yếu thiết kế cho iPad; minigame đã có bố cục điện thoại.
- `packages/voxel/src/sparse-world.ts` giữ các vùng gần bé; WKWebView trên iPhone bị hệ điều hành kill khi dùng quá nhiều bộ nhớ.

## Việc

1. **Chất lượng tự chọn:** `apps/web/src/platform/device-tier.ts` chọn mức theo kích thước màn, `devicePixelRatio`, `navigator.hardwareConcurrency`, thông tin GPU WebGL; điện thoại mặc định `low`, máy tính bảng `mid`. Mục chọn chất lượng trong Cài đặt, lưu theo máy. `?quality=` vẫn ưu tiên (cho E2E, preview).
2. **Bộ nhớ:** mức `low` giảm số vùng giữ trong `sparse-world` và số model giữ qua các lần vào map (`GAME_MODELS` trong `asset-loader.ts`: chỉ map đang chơi). Bắt trường hợp WebView bị kill (iOS `webViewWebContentProcessDidTerminate`, Android `onRenderProcessGone`): mở lại app ở màn Home với mức thấp hơn và ghi một dòng chẩn đoán không chứa dữ liệu cá nhân.
3. **Giao diện điện thoại:** rà mọi màn ở 390 × 844 dọc, 844 × 390 ngang, 360 × 800: HUD, cần điều khiển và nút Chạy/Nhảy trong vùng an toàn, vùng chạm ≥ 44 pt, hộp thoại cuộn được, chữ không tràn, bàn phím ảo không che ô nhập (plugin `keyboard`). Sửa trong CSS và component hiện có, dùng token của `tokens.css`; giữ giao diện theo mock (`docs/design-guidelines.md`).
4. **E2E thiết bị:** project Playwright `mobile` dùng mô phỏng iPhone và Pixel, chụp ảnh các màn ở tiêu chí 5 và kiểm không có phần tử tràn khỏi viewport; gắn `@smoke` cho một ca. Không đo hiệu năng bằng project `perf`.
5. **Kịch bản đo máy thật:** mở rộng gói DEVICE-01 của plan `261004-1617-mvp-gate-launch-readiness` (pha 2) cho một iPhone và một Android tầm trung: lộ trình 15 phút, ghi FPS (`__miuStats`), nhiệt, pin, có văng không; mẫu nhập kết quả vào trang review.

## File

Sửa: `apps/web/src/game/quality.ts`, `apps/web/src/game/asset-loader.ts`, `packages/voxel/src/sparse-world.ts` (chỉ nhận tham số giới hạn, vẫn thuần TS), màn Cài đặt trong `apps/web/src/ui/system/`, CSS các màn cần sửa, `apps/mobile/ios/**` và `apps/mobile/android/**` (bắt WebView bị kill), `apps/web/playwright.config.ts`. Mới: `apps/web/src/platform/device-tier.ts` (+ test), `apps/web/e2e/mobile-layout.spec.ts`.

## Kiểm tra

- Test đơn vị `device-tier`, giới hạn vùng ở `sparse-world`.
- `pnpm --filter @miu/web e2e --project setup --project mobile` (1 worker).
- Ảnh chụp các màn vào trang review; người đo máy thật theo kịch bản (tiêu chí 6).

## Rủi ro, hoàn tác

Sửa CSS cho điện thoại có thể làm lệch bố cục iPad/desktop: E2E hiện có và ảnh review iPad phải giữ nguyên. Hoàn tác từng màn độc lập.
