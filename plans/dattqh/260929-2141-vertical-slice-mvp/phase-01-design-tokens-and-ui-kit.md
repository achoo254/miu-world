---
phase: 1
title: "Design token + component UI + màn hệ thống"
status: in-progress
priority: P1
effort: "M"
dependencies: []
---

# Phase 1: Design token + component UI + màn hệ thống (SLICE-00, task #4)

## Goal
Một bộ token và component dùng chung theo visual language của 3 mock (hồng chủ đạo, bo tròn, panel kem/gỗ), để mọi màn SLICE dựng nhanh và đổi diện mạo khi có mock voxel mà không viết lại chức năng (Master Plan §2).

## Requirements
- Token CSS (`apps/web/src/ui/tokens.css`, tách khỏi `styles.css`): màu (primary hồng, secondary xanh, success, warning, danger, ink, surface, panel, parchment), cỡ chữ (Baloo 2 tiêu đề/HUD, Nunito nội dung), spacing, radius, shadow, z-index lớp (game, HUD, dialog, modal, toast). Giá trị lấy từ mock hiện tại, ghi nguồn `M?.?` trong comment. Không hardcode màu mới ngoài file token.
- Component (`apps/web/src/ui/kit/`): `Button` (primary/secondary/ghost/danger, size), `IconButton` (HUD tròn có nhãn), `Panel` (kem/gỗ), `Modal` (focus trap, Esc, nền mờ), `ProgressBar` (XP), `Badge`, `Tabs`, `Toast`, `ItemIcon` (Fluent Emoji qua loader manifest). Mỗi component có test render + a11y cơ bản (role, nhãn, điều khiển bằng bàn phím).
- Icon: danh sách icon Fluent Emoji dùng ở MVP (`content/ui/icons.json`: id → file trong pack `fluent-emoji`), kiểm trong `content:check` rằng file có trong manifest; `vite-repo-assets.ts` ship các file đó.
<!-- Updated: Red Team - pack fluent-emoji là mode `files` chỉ 22 file cố định (tools/assets/sources.json), thiếu icon kẹo, đá, rương, ổ khóa đã có; phải khai báo thêm file ghim URL+sha256 rồi `assets:fetch` → `assets:manifest` → `assets:check` -->
- Bổ sung icon còn thiếu cho MVP (kẹo, đá, rương/kho báu…) vào `tools/assets/sources.json` (URL ghim commit, `sha256` điền sau lần tải đầu, license MIT), rồi chạy `pnpm assets:fetch` → `pnpm assets:manifest` → `pnpm assets:check`. Không nâng version pack.
<!-- Updated: Red Team - các phase song song (3/4/6) cùng sửa game-store.ts, playwright.config.ts; khai báo trước để không đụng file -->
- Bridge: khai báo TRƯỚC toàn bộ kiểu event/lệnh mà các phase sau dùng trong `game-store.ts` (`loading-progress`, `set-outfit`, `set-world-state`, `set-target-hint`, `interaction-prompt {targetId,label,kind}`, `interaction {targetId}`), mỗi cái có test reducer; các phase sau chỉ thêm handler, không sửa lại union kiểu.
- E2E: khai báo trước trong `apps/web/playwright.config.ts` các project `creator`, `home`, `quest-flow`, `challenges`, `mvp-loop` (mỗi project `testMatch` theo `e2e/<tên>.spec.ts`, phụ thuộc `setup`); thêm `retries: 1` khi `CI`, `trace: 'retain-on-failure'`; thêm script `e2e:ci` trong `apps/web/package.json` chạy mọi project trừ `perf`; `ci.yml` job `e2e` gọi `pnpm --filter @miu/web e2e:ci`, để mỗi phase sau chỉ thêm file spec và CI tự chạy.
<!-- Updated: Red Team - iPad Safari có thể mất context WebGL khi thiếu bộ nhớ hoặc khi tab bị nền; Game hiện chưa nghe webglcontextlost -->
- `Game`: nghe `webglcontextlost` / `webglcontextrestored`; khi mất context phát event `error` có mã `context-lost`, hiện lớp phủ "Mất kết nối đồ họa, tải lại" (nút tải lại `/play`), không đổ vỡ khi đã `dispose()`.
- Cài đặt âm lượng lưu `localStorage` bọc try/catch, mặc định bật, vẫn chạy khi trình duyệt chặn (theo `web-ui.md`).
- Màn hệ thống (NEW SCREEN, §6 MVP): Pause (tiếp tục, về Home, cài đặt âm lượng tắt/bật lưu localStorage), Đang tải khu vực (tiến độ theo bước tải của `Game`), Mất mạng (bắt `ApiError` code `network`, nút thử lại; không mất tiến độ đã ghi ở server).
- `Game.stop()`/`resume()` khi mở màn toàn màn hình (Pause, Ba lô, thử thách) — §12 "tạm dừng render".
- Tuân `.claude/rules/web-ui.md`: comment đầu file ghi mock (`M3.2`…) hoặc NEW SCREEN.

## Files
- Create: `apps/web/src/ui/tokens.css`, `apps/web/src/ui/kit/*.tsx` (+ `*.test.tsx`), `content/ui/icons.json`, `apps/web/src/ui/system/{pause-screen,loading-overlay,offline-banner}.tsx`
- Modify: `apps/web/src/ui/styles.css`, `apps/web/src/game/game.ts` (resume, loading progress event, context lost), `apps/web/src/game-bridge/game-store.ts` (toàn bộ kiểu event/lệnh khai báo trước), `apps/web/vite-repo-assets.ts`, `apps/web/playwright.config.ts`, `apps/web/package.json` (`e2e:ci`), `.github/workflows/ci.yml` (job e2e), `tools/assets/sources.json` (+ `assets/manifest.json`, `assets/LICENSES.md` qua script), `docs/design-guidelines.md`

## Steps
1. Test trước: component render/keyboard; store `loading-progress`; `Game.stop/resume` không rò (E2E đếm canvas 1 + khung hình dừng khi pause).
2. Token + kit; thay các màn tài khoản hiện có sang kit (không đổi luồng).
3. Màn Pause/Loading/Offline; nối vào `/play`.
4. Cập nhật `docs/design-guidelines.md` (token nằm đâu, cách thêm component).

## Verification
- `pnpm vitest run --project web`; `pnpm --filter @miu/web build`; E2E `play` xanh (pause → khung hình dừng, resume chạy lại)
- `grep -rn "#[0-9a-fA-F]\{3,8\}" apps/web/src/ui --include=*.tsx --include=*.css | grep -v tokens.css` = 0 (màu chỉ ở tokens.css; `apps/web/src/game/**` dùng màu Three.js riêng nên không tính)
- `pnpm assets:check` xanh sau khi thêm icon; `pnpm --filter @miu/web e2e:ci` chạy được (project chưa có spec thì bỏ qua)

## Tiến độ (2026-09-30)
Chia việc giữa hai phiên trên `main` (thống nhất qua tin nhắn giữa phiên):
- Phiên restyle màn trước game (hướng "Đảo mây kẹo hồng", người sở hữu chọn): `tokens.css`, `styles.css`, `ui/kit/**`, `ui/account/**`, `app-shell.tsx`, `main.tsx`, `vite-repo-assets.ts`, `vite.config.ts`, `docs/design-guidelines.md`.
- Phiên cook plan: phần không phải UI — đã xong, commit `1034869` (18 icon Fluent mới), `749cf65` (kiểu bridge khai báo trước, `Game.stop/resume`, `loading-progress`, `webglcontextlost` + E2E), `896fe45` (`e2e:ci` = mọi project trừ `perf`, project Playwright khai báo trước, retry/trace, CI upload trace).
- Lệch so với Requirements: danh sách icon UI nằm ở `apps/web/src/ui/kit/ui-art.ts` (`UI_ICONS`, được `vite-repo-assets` ship và build lỗi nếu file rời manifest) thay cho `content/ui/icons.json` + `content:check`.
- Còn lại (sau commit kit): màn `ui/system/{pause,loading,offline}`, nối vào `/play`, E2E pause → khung hình dừng/chạy lại, cài đặt âm lượng.

## Risk
- Mock là ảnh render AI: token là xấp xỉ; ghi rõ "tạm, chờ mock voxel" trong design-guidelines.
