# Bản đồ codebase

Chỉ để định hướng: bắt đầu đọc từ đâu, ai làm chủ việc gì. Danh sách file đầy đủ: `git ls-files`.

| Vùng | Bắt đầu đọc | Làm chủ |
| --- | --- | --- |
| Nhập asset | `tools/assets/sources.json`, `tools/assets/asset-lib.ts` | Khai báo pack, allowlist license, ngân sách, allowlist loại file, schema manifest |
| License gate | `tools/assets/check-assets.ts` (+ `.test.ts`) | Luật chặn file lạ/hash lệch/license lạ/vượt ngân sách |
| Manifest | `tools/assets/build-manifest.ts`, `tools/assets/generated.json` | Sinh `assets/manifest.json` và `assets/LICENSES.md`; khai báo asset sinh bằng code |
| Nhân vật Miu | `tools/assets/kitbash-character.ts`, `tools/assets/validate-character.ts` | Ghép rig Blocky + đầu Cube Pets, thêm clip keyframe; kiểm node/anim/tam giác |
| Atlas block | `tools/assets/build-atlas.ts`, `content/blocks.json` | Chọn tile, tint theo palette, padding chống lem |
| Bản đồ | `tools/world/generate-forest-map.ts`, `tools/world/structures/` | Sinh Khu rừng chương 1 theo seed |
| Ảnh duyệt | `tools/assets/render-preview.ts` | Ảnh nhân vật, phụ kiện, bản đồ cho trang review |
| Dữ liệu nội dung | `content/` | Palette, block, nhân vật, phụ kiện, anim keyframe |
| Thư viện voxel | `packages/voxel/src/` | Định dạng chunk RLE, greedy mesher, va chạm lưới, phụ kiện voxel, entity bản đồ |
| Runtime game | `apps/web/src/game/game.ts` | Lớp `Game`: canvas, vòng lặp, joystick/Chạy/Nhảy, NPC, dispose |
| Game ↔ React | `apps/web/src/game-bridge/` | Store event rời rạc + `useGameState`; neo vị trí nhãn do game ghi mỗi khung hình |
| Trang chơi | `apps/web/src/ui/play/play-screen.tsx` | `/play`: cần hồ sơ đang chọn, lấy trang bị từ `GET /api/character` |
| Phục vụ/đóng gói asset | `apps/web/vite-repo-assets.ts` | Chỉ file trong manifest; build chỉ copy file runtime dùng |
| Tải asset runtime | `apps/web/src/game/asset-loader.ts` | Chặn URL ngoài manifest |
| Trang review | `apps/web/review.html`, `apps/web/src/review/` | Gallery duyệt cuối, bảng license, bảng hiệu năng |
| Trang render công cụ | `apps/web/preview.html`, `apps/web/src/preview/` | Ảnh nhân vật/phụ kiện/bản đồ cho `render-preview.ts` |
| E2E, đo hiệu năng | `apps/web/e2e/` | Phiên phụ huynh (`parent-session.setup.ts`), luồng UI (`account-flow.spec.ts`), runtime (`play.spec.ts`), ma trận CPU × chất lượng (`perf.spec.ts`) |
| Hỗ trợ quyết định | `tools/decisions/jev-decide.py` | Gọi TypeSafe Jev, áp ngưỡng tự quyết/chuyển người |
| CI | `.github/workflows/ci.yml` | Bốn gate + `pnpm audit` + Semgrep trên push `main` và PR |
| App web | `apps/web/src/main.tsx`, `apps/web/src/ui/app-shell.tsx`, `apps/web/vite.config.ts` | Shell React, router, CSP khi build, proxy `/api` |
| Server | `apps/server/src/app.ts`, `apps/server/src/config.ts` | Express app (tách khỏi `listen` để test), config env validate bằng Zod |
| Schema dùng chung | `packages/schema/src/` | Zod cho DTO API (`account`, `game`) và nội dung (`content`) |
| Logic quest | `packages/quest/src/quest-progress.ts`, `level.ts` | Tiến trình bước tuyến tính, thưởng ở bước cuối, level từ XP; dùng chung web + server |
| Auth, hồ sơ trẻ | `apps/server/src/auth/`, `apps/server/src/child-profile/` | Session cookie, CSRF Origin, PIN phụ huynh, rate limit, IDOR |
| Nhân vật, tiến độ, thưởng | `apps/server/src/character/`, `apps/server/src/quest/`, `apps/server/src/reward/reward-ledger.ts` | Server tính thưởng, ghi ledger + bảng tổng hợp trong một transaction |
| Database | `apps/server/src/db/schema.ts`, `apps/server/drizzle/` | Bảng Drizzle, migration SQL, PGlite/Postgres |
| Nội dung server nạp | `apps/server/src/content/content-catalog.ts` | Validate tên, đồng ý, phụ kiện, level curve, kỹ năng, quest lúc khởi động |
| UI tài khoản | `apps/web/src/ui/account/` | Đăng ký, đăng nhập, đồng ý, chọn hồ sơ, khu phụ huynh |
| Asset đã commit | `assets/packs/`, `assets/generated/` | Dữ liệu; chỉ thay qua script ở trên |
| Mock thiết kế | `designs/` | Ảnh mock M1–M3 và yêu cầu UI |
| Plan, report | `plans/dattqh/` | Hồ sơ theo thời điểm, không phải nguồn chuẩn lâu dài |
