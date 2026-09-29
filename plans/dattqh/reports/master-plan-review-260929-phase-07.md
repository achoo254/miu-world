# Review Master Plan: phase 7 (Runtime vào app web)

Ngày: 2026-09-29. Người review: master-plan-reviewer.

## Verdict: PASS có điều kiện (2 việc phải xử lý trước phase 8)

## Lệnh đã chạy
- `pnpm assets:check` OK; `pnpm test` 24 file, 167 pass, 1 skip; `pnpm typecheck`, `pnpm lint` xanh; `pnpm --filter @miu/web build` xanh.
- `pnpm --filter @miu/web e2e --project play --project account` (kèm `setup`): 8/8 pass, gồm đăng ký → đồng ý → tạo hồ sơ → chọn → `/play` → nhãn Vẹt; không request ngoài origin, không lỗi console, draw call ≤ 150, tam giác ≤ 150k, đúng 1 canvas, trang bị lấy từ API (`hat-witch-pink`, `backpack-brown`), rời `/play` không còn canvas.
- `grep poc-voxel` ngoài `plans/`, `node_modules`, `dist`: chỉ còn `docs/project-roadmap.md` (mô tả ENGINE-01) và `.idea/workspace.xml` (IDE, không vào git). `apps/poc-voxel/` trên đĩa rỗng.
- Đo kích thước bản build: `dist/` 7.66 MB gồm ảnh review (~4.7 MB, không tải ở `/play`); tài nguyên game không tính ảnh review 1.78 MB thô; JS gzip 0.32 MB. Tải vùng đầu thực tế nhỏ hơn nhiều so với ngưỡng 8 MB (chưa đo trên đường mạng thật; số truyền tải thật cần ghi ở phase 8).

## Đối chiếu yêu cầu
Đạt:
- `git mv` runtime vào `apps/web/src/game/` giữ lịch sử; `Game` (`game.ts`) có `start` idempotent, `stop`, `dispose` giải phóng geometry, material, texture, renderer, listener, DOM; kiểm `disposed` sau mỗi `await`.
- Bridge (`game-store.ts`, `use-game-state.ts`): snapshot bất biến, không phát khi không đổi, `useSyncExternalStore` với selector, lệnh React → game (`interact`), anchor nhãn. Có test bridge (`game-store.test.tsx`).
- Nhãn NPC là component React chỉ giữ nội dung và hiện/ẩn (`play-screen.tsx`); game ghi `transform` vào anchor mỗi khung hình, E2E khẳng định `translate(` có trên phần tử. Joystick, Chạy, Nhảy ở trong game.
- `/play` cần hồ sơ đang chọn, trang bị từ `GET /api/character`, rời trang gọi `dispose()`.
- `vite-repo-assets.ts`: chỉ phục vụ file trong manifest (404 ngoài manifest, chặn `..` và percent-encoding lỗi), build chỉ copy 122 file runtime dùng thay vì cả manifest, có test.
- E2E chuyển sang `apps/web/e2e/` (`setup`, `account`, `play`, `perf`), server PGlite trong RAM (`PGLITE_DIR=memory`, production vẫn bắt buộc `DATABASE_URL` nên không thể dùng nhầm).
- Cổng web về 5173/4173; ESLint chặn React trong `apps/web/src/game/**`; `CLAUDE.md`, docs, rules cập nhật.
- Lỗi glob phụ kiện lệch một cấp được phát hiện và sửa, kèm E2E kiểm `stats.outfit` và module ném lỗi nếu không thấy phụ kiện.

## Việc phải xử lý
1. [CAO, chặn phase 8 và việc dev] Tiến trình dev server POC cũ (PID 11604, khởi động 18:02) vẫn LISTEN ở `[::1]:5173`. `pnpm --filter @miu/web dev` dùng `--strictPort` 5173 nên sẽ báo cổng bận. Đây là tiến trình của người dùng hoặc phiên khác, reviewer và implementer không tự tắt. Cần người dùng xác nhận tắt (hoặc tự tắt bằng `taskkill /PID 11604`), trước khi phase 8 dùng dev server. Preview 4173 và E2E không bị ảnh hưởng (đã pass).
2. [TRUNG BÌNH] Ảnh bản đồ do `pnpm assets:preview` sinh không xác định giữa các lần chạy. Reviewer chạy lại `pnpm assets:preview` một lần: 4 trong 5 ảnh `assets/generated/review/map/forest-ch1-{bridge,iso,npc,top}.png` đổi hash (ảnh nhân vật và phụ kiện giống hệt; `forest-ch1-tree.png` giống). Quy tắc pipeline: generator phải xác định. Cần xác định nguyên nhân (thời gian thực, hoạt ảnh NPC/mây, khử răng cưa GPU khi map shot chạy bằng `Game`) và cố định (khóa đồng hồ hoặc bỏ hoạt ảnh trong chế độ chụp) rồi chạy hai lần so hash. Nếu là GPU thuần thì ghi lý do và loại nhóm ảnh này khỏi yêu cầu byte-giống. Lưu ý: lần chạy kiểm này của reviewer đã ghi đè 4 ảnh map và `assets/manifest.json` trong working tree (nội dung hợp lệ, `pnpm assets:check` vẫn OK); implementer nên chạy `pnpm assets:manifest` và `assets:check` lần nữa khi chốt.
3. [THẤP] Cảnh báo Vite: `import "./vite-repo-assets"` không có đuôi trong `vite.config.ts:5` (`configLoader: 'native'`). Thêm đuôi `.ts` cho hết cảnh báo, hoặc để ý khi Vite đổi mặc định.
4. [THẤP] Số "tải vùng đầu ≤ 8 MB nén" mới có ước lượng. Phase 8 ghi số đo thực (ví dụ tổng byte truyền tải khi vào `/play`, lấy từ Playwright), cùng số của perf.
5. [THẤP] Kiểm `Game.dispose` bằng `renderer.info.memory` về 0 chưa có (phase file cho phép kiểm ở E2E; hiện E2E kiểm không còn canvas và `window.__miuStats`). Chấp nhận; nếu dễ thì thêm khẳng định `renderer.info` vào handle stats.
6. `plan.md` và front matter các phase vẫn ghi `Pending`; cập nhật khi chốt đợt.

Câu hỏi chưa giải quyết: có tắt PID 11604 không (chỉ người dùng quyết). Không gọi Jev vì đây là quyết định về tiến trình của người dùng, không phải quyết định sản phẩm.
