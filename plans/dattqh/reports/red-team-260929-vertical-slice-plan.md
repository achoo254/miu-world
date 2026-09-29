# Red Team: plan vertical slice MVP

Ngày: 2026-09-29. Người thực hiện: master-plan-reviewer (chỉ đọc repo và chạy Jev; chỉ sửa file plan). Plan: `plans/dattqh/260929-2141-vertical-slice-mvp/` (plan.md + phase-01..10). Bảng đầy đủ đã nằm ở mục "Red Team Review" của `plan.md`; mỗi mục Accept đã được sửa trực tiếp vào phase file kèm `<!-- Updated: Red Team - ... -->`.

## Phương pháp
Đọc plan và 10 phase file, đối chiếu Master Plan §4, §5, §6, §9, §12, §13, §14, §16, đối chiếu repo hiện tại (`assets/generated/world/forest-ch1/entities.json`, `packages/voxel/src/world-entities.ts`, `packages/quest/src/quest-progress.ts`, `content/progression/level-curve.json`, `tools/assets/sources.json`, `apps/web/playwright.config.ts`, `.github/workflows/ci.yml`, `apps/server/src/**`, `apps/web/e2e/`, `assets/packs/*`). Quyết định Jev ở `jev-260929-vertical-slice-validation.md`.

## Tổng kết
38 phát hiện: 29 Accept (đã sửa), 9 Reject (có lý do).

| Lăng kính | Accept | Reject |
| --- | --- | --- |
| Bảo mật, dữ liệu trẻ (S1–S9) | 7 | 2 (S8, S9) |
| Giả định sai (A1–A9) | 8 | 1 (A9) |
| Vận hành, CI, iPad (O1–O9) | 7 | 2 (O8, O9) |
| Phạm vi so với Master Plan (M1–M11) | 7 | 4 (M7, M8, M9, M10) |

## Phát hiện có tác động lớn nhất (kèm bằng chứng)
1. **Vòng phụ thuộc phase 7 và 8** (A4): phase 7 yêu cầu bước `read` "dùng chung khung thử thách phase 8" trong khi phase 8 phụ thuộc phase 7. Đã chuyển UI `read`/`riddle` sang phase 8 và để phase 7 chỉ làm hội thoại, `search`, tracker.
2. **Bước `search` không có chỗ lưu tiến độ con** (A2): `packages/quest/src/quest-progress.ts` chỉ có `completedSteps` và chuyển bước tuyến tính; 3 manh mối tùy thứ tự cần `found` theo step, cột `quest_progress.found`, API nhận `{ target }`. Đã thêm ở phase 2, 3, 7.
3. **Tham chiếu entity sai chỗ và sai thời điểm** (A1, A5): `content/world/forest-ch1/entities` không tồn tại; entities do generator sinh ở `assets/generated/world/forest-ch1/entities.json`, hiện chỉ có `parrot-guide`, props không có id, `worldEntitiesSchema` là version 1. Kiểm target chỉ bật ở phase 6.
4. **Level Up không xác định sau khi thêm giảm XP** (A6): Lv.2 cần 100 XP, quest thưởng 100, xem đáp án còn 90 nên E2E "Level Up nếu vượt ngưỡng" sẽ sai. Đã tách E2E chính (không xem đáp án) và test riêng (xem đáp án).
5. **Dữ liệu trẻ** (S1, S6, M6): hai bảng theo sự kiện có dấu thời gian và trường `personality` là thu thập mới vượt mức tối thiểu của §9; đã chuyển thành bộ đếm một bảng, bỏ `personality`, và bổ sung yêu cầu nâng văn bản đồng ý lên `draft-3`.
6. **Chạy song song đụng file** (O1): phase 3, 4, 5, 6 cùng sửa `game-store.ts`, `game.ts`, `play-screen.tsx`, `playwright.config.ts`, `render-preview.ts`, migration. Đã thêm bảng sở hữu file vào `plan.md`, khai báo trước kiểu bridge và project Playwright ở phase 1, tách script riêng cho ảnh đảo, xếp phase 6 sau phase 5 (`dependencies: [2, 5]`), chỉ phase 3 sinh migration.
7. **Google OAuth trên iPad** (S4): `CLAUDE.md:40` ghi Google chỉ nhận https hoặc `http://localhost`, nên IP LAN không hoàn tất luồng Google; tunnel là bên thứ ba. Jev chọn LAN + `PASSWORD_LOGIN=1` (dữ liệu giả).
8. **CI chỉ chạy 3 project E2E** (O2): project mới chỉ vào CI ở phase 10. Đã thêm script `e2e:ci` ở phase 1.
9. **Lộ đáp án qua bundle** (S2): tiền lệ `profile-screens.tsx` import thẳng `content/names/*.json`; đã thêm ESLint cấm import `content/quests/**` từ web và test quét `apps/web/dist`.

## Sửa theo phase
| Phase | Sửa |
| --- | --- |
| 1 | Icon Fluent Emoji thêm qua `sources.json`; khai báo trước kiểu event/lệnh bridge, project Playwright, `e2e:ci`, retries/trace; xử lý `webglcontextlost`; `localStorage` try/catch; lệnh grep màu gồm CSS |
| 2 | Step `search` tùy thứ tự với `found`; quest `stub`; kiểm entity đúng đường dẫn và bật ở phase 6; chống lộ đáp án (ESLint); Decision chỉ kể chuyện |
| 3 | `step_attempts` bộ đếm (không nội dung, không dấu thời gian); `found`, `stars`, `xp_awarded`; giảm 10% XP khi xem đáp án; quy tắc sao; consent `draft-3`; rate limit theo hồ sơ+step cho `complete` và `support`; chỉ phase này sinh migration |
| 4 | Bỏ `personality`, không migration; chỉ Mũ + Balo và biến thể màu, Áo/Giày/Cánh khóa; preview không sửa `game.ts`; mở khóa đồ kiểm ở server |
| 5 | Home là màn React với ảnh đảo render sẵn (script mới), không chuỗi ngày, "Bản đồ" là màn chọn khu vực |
| 6 | Phụ thuộc `[2, 5]`; schema entities version 2 với `interactables[]`; lá thư sinh bằng voxel; bật kiểm target |
| 7 | `read`/`riddle` chuyển sang phase 8; `search` gửi `{ target }`; chỉ giọng `localService`; mất mạng chặn và thử lại |
| 8 | Nhận `read`/`riddle`; `touch-action: none`, pointer capture; E2E kéo bằng `PointerEvent` (touchscreen chỉ tap); thông điệp khi xem đáp án |
| 9 | Sao và XP thực nhận từ server; Level Up xác định (100 XP không xem đáp án); không chuỗi ngày |
| 10 | E2E chính không xem đáp án, test riêng cho nhánh xem đáp án; quét bundle và schema dữ liệu trẻ; mở iPad qua LAN với `PASSWORD_LOGIN=1`; ghi Master Plan §15 và docs; xóa `.data/pglite` sau duyệt |

## Whole-Plan Consistency Sweep
- Link giữa các file: 10 phase + plan.md, không link gãy.
- Frontmatter: `phase` 1..10 khớp; `dependencies` khớp bảng Phases sau sửa (phase 6 `[2, 5]`).
- Sở hữu file cho phase song song: xem bảng "File/thư mục sở hữu" trong `plan.md`; hai cặp lo ngại (1–2 và 4–6) không còn file chung sau sửa.
- Lệnh kiểm tra: đã có `pnpm vitest run --project web|node`, `pnpm --filter @miu/server exec drizzle-kit check` (server có `drizzle-kit` và `db:check`), `pnpm assets:*`, `pnpm world:forest`, `pnpm --filter @miu/web build`, `e2e` với `setup/account/play/perf`. Chưa có, sẽ do phase tạo: `pnpm content:check` (phase 2), `pnpm assets:home` (phase 5), `e2e:ci` và project `creator/home/quest-flow/challenges/mvp-loop` (phase 1).
- Còn để ý: `apps/web/src/ui/styles.css` còn hex; phase 1 phải di chuyển hết sang `tokens.css` trước khi lệnh grep đạt 0.

## Reject (lý do ngắn)
S8 brute force trắc nghiệm (đáp án không bí mật, thưởng một lần, đã có rate limit); S9 server Google giả (đã có `apps/web/e2e/fake-google-server.ts`); A9 `accessoryScale` cho giày (không còn slot giày); O8 tắt tiến trình (phase 10 bước 4 đã có); O9 ngân sách draw call (phase 6 và 10 đã đo perf); M7 task #21 chỉ phần icon (đã nêu phạm vi); M8 kit dư (Tabs, Badge, Toast đều có màn dùng); M9 Nhà của Miu trang trí (không thuộc luồng §13); M10 mock voxel #23 (việc designer, đã loại khỏi plan).

## Câu hỏi mở
Không có câu chặn. Ba quyết định dưới ngưỡng tự quyết có thể được người sở hữu đảo: Home dạng ảnh, giảm 10% XP khi xem đáp án, mở iPad qua LAN.
