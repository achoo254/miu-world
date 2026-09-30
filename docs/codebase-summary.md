# Bản đồ codebase

Chỉ để định hướng: bắt đầu đọc từ đâu, ai làm chủ việc gì. Danh sách file đầy đủ: `git ls-files`.

| Vùng | Bắt đầu đọc | Làm chủ |
| --- | --- | --- |
| Nhập asset | `tools/assets/sources.json`, `tools/assets/asset-lib.ts` | Khai báo pack, allowlist license, ngân sách, allowlist loại file, schema manifest |
| License gate | `tools/assets/check-assets.ts` (+ `.test.ts`) | Luật chặn file lạ/hash lệch/license lạ/vượt ngân sách |
| Manifest | `tools/assets/build-manifest.ts`, `tools/assets/generated.json` | Sinh `assets/manifest.json` và `assets/LICENSES.md`; khai báo asset sinh bằng code |
| Nhân vật Miu | `tools/assets/kitbash-character.ts`, `tools/assets/validate-character.ts`, `content/bodies/` | Rig Blocky + thân khối từ JSON (hoặc đầu Cube Pets ở bản POC), thêm clip keyframe; kiểm node/anim/tam giác |
| Atlas block | `tools/assets/build-atlas.ts`, `content/blocks.json` | Chọn tile, tint theo palette, padding chống lem |
| Bản đồ | `tools/world/generate-forest-map.ts`, `tools/world/structures/` | Sinh Khu rừng chương 1 theo seed |
| Ảnh duyệt | `tools/assets/render-preview.ts` | Ảnh nhân vật, phụ kiện, bản đồ cho trang review |
| Dữ liệu nội dung | `content/` | Palette, block, nhân vật, phụ kiện, anim keyframe |
| Thư viện voxel | `packages/voxel/src/` | Định dạng chunk RLE, greedy mesher, va chạm lưới, phụ kiện voxel, entity bản đồ |
| Runtime game | `apps/web/src/game/game.ts` | Lớp `Game`: canvas, vòng lặp, joystick/Chạy/Nhảy, `stop/resume`, mất WebGL context, dispose |
| Vật thể tương tác | `apps/web/src/game/entities/interactables.ts`, `riddle-board.ts`, `target-arrow.ts` | NPC, manh mối, cây đố, rương, cổng theo `entities.json` v2; prompt theo target gần nhất; trạng thái từ `set-world-state`; mũi tên chỉ hướng |
| Preview nhân vật | `apps/web/src/game/preview/character-preview.ts` | Renderer nhẹ cho màn tạo nhân vật: xoay bằng kéo, 4 hoạt ảnh, đổi đồ qua `set-outfit` |
| Game ↔ React | `apps/web/src/game-bridge/` | Store event rời rạc + `useGameState`; neo vị trí nhãn do game ghi mỗi khung hình |
| Trang chơi | `apps/web/src/ui/play/play-screen.tsx`, `apps/web/src/ui/hud/` | `/play`: game + HUD (badge, nhiệm vụ hiện tại, Nhiệm vụ/Bản đồ/Ba lô/Menu, Tương tác), Tạm dừng, Ba lô |
| Kit giao diện, màn hệ thống | `apps/web/src/ui/kit/`, `apps/web/src/ui/system/`, `apps/web/src/ui/tokens.css` | Nút, icon (`ui-art.ts` là danh sách asset UI được ship), Modal, Tabs, Toast, thanh tiến độ, bàn phím số; Tạm dừng, Đang tải, Mất mạng |
| Màn trước game | `apps/web/src/ui/creator/`, `apps/web/src/ui/home/`, `apps/web/src/ui/region/`, `apps/web/src/ui/profile/` | Tạo nhân vật, Home (đảo + vùng nhấn), Bản đồ và chương, Ba lô và Hồ sơ/Bộ sưu tập |
| Luồng quest | `apps/web/src/ui/quest/`, `apps/web/src/ui/dialogue/`, `apps/web/src/ui/challenge/`, `apps/web/src/ui/rewards/` | Controller, hội thoại NPC, 3 thử thách Toán + đọc + đố + panel hỗ trợ, chuỗi màn thưởng/Level Up/Mở khóa; pool câu không lặp (`packages/quest/src/pick-fresh.ts`) |
| Khu vực, vật phẩm | `content/world/regions.json` (`packages/schema/src/region.ts`), `content/items/` (`packages/schema/src/item.ts`) | Khu vực trên đảo và vùng nhấn; mô tả vật phẩm cho Ba lô |
| Ảnh đảo Home | `tools/assets/render-home-island.ts` (`pnpm assets:home`) | Render map chương 1 thành đảo nền trong suốt, xác định |
| Phục vụ/đóng gói asset | `apps/web/vite-repo-assets.ts` | Chỉ file trong manifest; build chỉ copy file runtime dùng |
| Tải asset runtime | `apps/web/src/game/asset-loader.ts` | Chặn URL ngoài manifest |
| Trang review | `apps/web/review.html`, `apps/web/src/review/` | Gallery duyệt cuối, bảng license, bảng hiệu năng |
| Trang render công cụ | `apps/web/preview.html`, `apps/web/src/preview/` | Ảnh nhân vật/phụ kiện/bản đồ cho `render-preview.ts` |
| E2E, đo hiệu năng | `apps/web/e2e/` | Phiên phụ huynh (`parent-session.setup.ts`), luồng tài khoản (`account-flow`), runtime (`play`), tạo nhân vật (`creator`), Home (`home`), quest (`quest-flow`), thử thách trên iPad (`challenges`), trọn vòng MVP (`mvp-loop`), ma trận CPU × chất lượng (`perf`); helper `quest-api.ts`, `touch.ts` |
| Test bảo mật | `apps/server/src/security/`, `tools/security/` | Bảng endpoint (mọi route cần phiên trừ danh sách công khai), IDOR theo `:id`, dữ liệu trẻ chỉ là bộ đếm, quét đáp án trong bundle |
| Hỗ trợ quyết định | `tools/decisions/jev-decide.py` | Gọi TypeSafe Jev, áp ngưỡng tự quyết/chuyển người |
| Deploy staging | `tools/deploy/staging/`, `apps/server/bundle.ts` | Script setup/release, unit systemd, cấu hình nginx lab và edge; bundle server một file (xem `docs/deployment-guide.md`) |
| CI | `.github/workflows/ci.yml` | Bốn gate + `pnpm audit` + Semgrep trên push `main` và PR |
| App web | `apps/web/src/main.tsx`, `apps/web/src/ui/app-shell.tsx`, `apps/web/vite.config.ts` | Shell React, router, CSP khi build, proxy `/api` |
| Server | `apps/server/src/app.ts`, `apps/server/src/config.ts` | Express app (tách khỏi `listen` để test), config env validate bằng Zod |
| Schema dùng chung | `packages/schema/src/` | Zod cho DTO API (`account`, `game`) và nội dung (`content`) |
| Logic quest | `packages/quest/src/quest-progress.ts`, `check-answer.ts`, `quest-catalog.ts`, `quest-score.ts`, `level.ts` | Tiến trình bước tuyến tính (bước `search` tìm đủ target theo thứ tự tùy ý), chấm đáp án theo loại bước, kiểm chéo catalog quest, sao và XP khi xong quest, level từ XP (curve riêng cho Skill); dùng chung web + server |
| Auth, hồ sơ trẻ | `apps/server/src/auth/`, `apps/server/src/child-profile/` | Session cookie, CSRF Origin, PIN phụ huynh, rate limit, IDOR |
| Nhân vật, tiến độ, thưởng | `apps/server/src/character/`, `apps/server/src/quest/`, `apps/server/src/reward/reward-ledger.ts` | API quest (danh sách, chi tiết, hoàn thành bước, hỗ trợ học); server chấm, đếm theo bước, tính sao/XP/Level Up/mở khóa (`quest-completion.ts`), ghi ledger + bảng tổng hợp trong một transaction |
| Database | `apps/server/src/db/schema.ts`, `apps/server/drizzle/` | Bảng Drizzle, migration SQL, PGlite/Postgres |
| Nội dung server nạp | `apps/server/src/content/content-catalog.ts` | Validate tên, đồng ý, phụ kiện, level curve, kỹ năng, quest lúc khởi động |
| Quest và gate nội dung | `content/quests/*.json`, `packages/schema/src/content.ts` (`QuestDefinition` v2), `tools/content/check-content.ts` | Quest mô tả bằng dữ liệu (8 pha, 7 câu hỏi, bước + hỗ trợ học, `status: stub` cho quest "sắp có"); `pnpm content:check` chạy trong CI; client chỉ nhận `QuestView` không có đáp án |
| UI tài khoản | `apps/web/src/ui/account/` | Đăng ký, đăng nhập, đồng ý, chọn hồ sơ, khu phụ huynh |
| Asset đã commit | `assets/packs/`, `assets/generated/` | Dữ liệu; chỉ thay qua script ở trên |
| Mock thiết kế | `designs/` | Ảnh mock M1–M3 và yêu cầu UI |
| Plan, report | `plans/dattqh/` | Hồ sơ theo thời điểm, không phải nguồn chuẩn lâu dài |
