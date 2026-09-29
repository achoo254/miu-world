---
phase: 7
title: "Runtime vào app web"
status: pending
priority: P1
effort: "L"
dependencies: [5, 6]
---

# Phase 7: Runtime vào app web (ENGINE-01)

## Overview
Chuyển runtime Three.js của POC vào `apps/web/src/game`, nối React qua `game-bridge`, chuyển trang review + E2E, rồi xóa `apps/poc-voxel`. Vào game yêu cầu hồ sơ trẻ đang chọn; nhân vật và phụ kiện đang mặc lấy từ `GET /api/character`.

## Requirements
- Chuyển (git mv, giữ lịch sử) `apps/poc-voxel/src/{world,player,entities,scene,character,content,debug,quality.ts,asset-loader.ts(+test)}` → `apps/web/src/game/`; `main.ts` thành lớp `Game` (`start(canvas)`, `stop()`, `dispose()` giải phóng geometry/texture/material, worker).
- `apps/web/src/game-bridge/`: store bất biến (`subscribe/getSnapshot`) + `useGameState(selector)` qua `useSyncExternalStore`; game phát event có kiểu (`interaction-prompt`, `interaction`, `ready`, `error`); React không nhận event theo khung hình.
- Dùng bridge thật: nhãn tương tác NPC chuyển thành component React **chỉ cho nội dung và hiện/ẩn** (event rời rạc `interaction-prompt {npcId | null}`). Vị trí nhãn đổi mỗi khung hình (`apps/poc-voxel/src/entities/npc.ts:48`) nên game tự ghi `transform` vào phần tử neo mà React đăng ký qua bridge (ref), không qua state React. Joystick/nút Chạy/Nhảy giữ trong game (đầu vào theo khung hình).
<!-- Updated: Red Team - vị trí nhãn theo khung hình không đi qua state React -->
- Trang `/play`: yêu cầu hồ sơ active (không có → chuyển về chọn hồ sơ), mount canvas, rời trang gọi `dispose()`.
- `vite.config.ts`: port middleware "chỉ phục vụ file trong manifest" + build chỉ copy file runtime dùng (nợ từ POC: không copy cả manifest ~24 MB); `review.html`, `preview.html` chuyển sang `apps/web`.
- E2E: `poc.spec.ts` → `apps/web/e2e/play.spec.ts` (Playwright `webServer` chạy server với PGlite in-memory + preview web; đăng ký phụ huynh và tạo hồ sơ qua API trong `beforeAll`); `perf.spec.ts` chuyển sang, thêm bước tạo phiên + hồ sơ giống `play.spec.ts` vì `/play` cần hồ sơ active; `tools/assets/render-preview.ts` đổi `APP_DIR`.
- Cổng: web về dev 5173 / preview 4173; server 8787. Cập nhật `CLAUDE.md` (lệnh E2E `pnpm --filter @miu/web e2e --project play`), `.claude/rules/voxel-runtime.md` (bỏ đường dẫn POC), `docs/codebase-summary.md`, `docs/design-guidelines.md`, `docs/system-architecture.md`, README.
- Xóa `apps/poc-voxel` sau khi E2E mới xanh.

## Implementation Steps
1. Test trước: store bridge (subscribe/unsubscribe, snapshot ổn định, selector không render lại khi phần khác đổi); `Game.dispose()` giải phóng (đếm `renderer.info.memory` về 0 trong test jsdom/headless nếu khả thi, nếu không kiểm ở E2E).
2. git mv file runtime, sửa import, tách `Game`.
3. Bridge + component nhãn tương tác + trang `/play`.
4. Chuyển Vite middleware, review/preview, E2E; chạy `play` project tới xanh.
5. Xóa `apps/poc-voxel`, cập nhật root `typecheck`, docs/rules.

## Success Criteria
- [ ] E2E `play`: đăng nhập sẵn → `/play` → đi tới Vẹt → nhãn React hiển thị; không request ngoài origin; không lỗi console; draw call ≤ 150, tam giác ≤ 150k
- [ ] `grep -r "poc-voxel"` trong code/docs/rules chỉ còn ở plan/report lịch sử
- [ ] Build `apps/web` không copy file ngoài danh sách runtime dùng; tải vùng đầu ≤ 8 MB nén (ghi số)
- [ ] 4 gate xanh

## Risk Assessment
- React StrictMode mount 2 lần tạo 2 renderer. Xử lý: `Game` idempotent start/dispose; test E2E đếm canvas = 1.
- Worker path đổi khi chuyển thư mục. Xử lý: `new Worker(new URL(..., import.meta.url))` như POC; E2E bắt lỗi.
- CSP web khác POC (thêm API). Xử lý: API cùng origin, `connect-src 'self'` đủ.
