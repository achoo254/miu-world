# Pha 10 — Trang review "bạn máy tự học", test toàn luồng, tài liệu

**Tier:** M · **Chặn bởi:** 9 · **Theo quyết định:** D10 `server_integration_only`; câu xác nhận 2 (nguồn số liệu)

**Trạng thái: XONG** 08/10/2026, commit `f047774c` (test toàn luồng), `ccf6d577` (trang review, `pnpm bots:learning`), `0614af79` (tài liệu), `4702266b` (sửa test xóa tài khoản). Khác thiết kế:
- **Chỉ mô phỏng đo** (câu xác nhận 2, Jev `sim_only`): không có `--db`, không đọc DB dev hay staging.
- **Biểu đồ hiệu suất** vẽ theo tiêu chí đã đổi ở Jev đợt 3: độ thẳng (cộng dồn) của chuyến tới nơi đã từng tới (nét liền) và chuyến lần đầu tới nơi đó (nét đứt), không vẽ "hiệu suất theo giờ" vì tiêu chí đó không đo được việc học. Tỷ lệ kẹt nằm trong bảng.
- **`bot-flow.test.ts`:** 4 bạn máy đầu của `truong-hoc` trên lưới thật, `PartyQuestService` + route bước với PGlite (`createTestApp`), đồng hồ giả chỉ cho timer và `Date` (DB và HTTP giữ I/O thật). Nhiệm vụ riêng của bạn máy là các bước của một nhiệm vụ thật của trường mang id của nhiệm vụ fixture (để bạn máy đi tới nơi thật, và nhiệm vụ nó rủ là nhiệm vụ service biết). "Chọn `meet`" kiểm qua getter `Brain.approaching` (seed 2; 6 seed thử thì 2 seed có bạn máy chọn tới gặp trong 4 phút). Chạy khoảng 1 s, 5 lần liền xanh.
- **Test thêm:** `tools/bots/learning-report.test.ts` (2 bạn máy, 30 phút: mốc đều, số chỉ tăng, 0 bước sai luật, chạy lại ra y hệt).
- **Sửa ngoài danh sách file:** `apps/server/src/auth/account-routes.test.ts` đỏ từ pha 4 (bảng mới `bot_world_memories` chưa có trong danh sách bảng không chứa dữ liệu người chơi); thêm vào danh sách (bảng không có cột người chơi). `docs/codebase-summary.md` thêm `bot-brain/`, `bot-social.ts`, `bot-party-quest.ts`.
- **Không sửa:** `docs/project-roadmap.md` (đang có thay đổi chưa commit của phiên khác), `CLAUDE.md` và `.claude/rules/world-scenery.md` (cấu hình agent, để người hoặc điều phối viên sửa; nội dung đề xuất trong báo cáo). Không viết file report riêng (số liệu ở mục dưới).

**Số đo `pnpm bots:learning`** (seed `learn`, 6 bạn máy mỗi map, 3 giờ, dt 0,5 s; chạy 3,9 s; file 13,8 KB, chạy lại cùng byte):

| Map | Nơi đã biết (10 phút → 3 giờ / cả map) | Độ thẳng chuyến đầu (số chuyến) | Chuyến đi lại (số chuyến) | Đi lại thẳng hơn | Đường tắt mỗi bạn máy | Kẹt | Bước nhiệm vụ | Sai luật |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `truong-hoc` | 114,7 → 200 / 250 (trần 200) | 0,32 (262) | 0,59 (235) | ×1,84 | 149 | 1,4% | 681 | 0 |
| `trung-tam` | 62,3 → 118,2 / 128 | 0,32 (234) | 0,83 (388) | ×2,57 | 69,2 | 0,6% | 901 | 0 |
| `forest-ch1` | 31,2 → 97,3 / 178 | 0,12 (7) | 0,77 (7) | ×6,39 (ít chuyến) | 30 | 0,6% | 36 | 0 |

**Cổng cuối** (máy dev, 08/10/2026): `pnpm assets:check` OK (16 pack, 4.674 file); `pnpm content:check` OK (2.062 file); `pnpm vitest run --project node --project web --maxWorkers=2` 574 file, 6.817 test: 3 đỏ (`account-routes.test.ts`, lỗi từ pha 4, đã sửa, chạy lại file 7/7 xanh), 6.813 xanh, 1 bỏ qua, 194 s; project `maps` không chạy (không đụng generator map); `pnpm typecheck` sạch; `pnpm lint` sạch (0 cảnh báo); `pnpm --filter @miu/web build` xanh (cảnh báo sẵn có: chunk > 500 kB, `configLoader`); `pnpm security:dist` OK. Không chạy E2E. Không thêm dependency.

## Người duyệt thấy bạn máy học

- `tools/bots/learning-report.ts`, script `"bots:learning": "tsx tools/bots/learning-report.ts"` trong `package.json`.
  - **Mô phỏng đo (luôn chạy):** dùng chính `Brain` và lưới thật, seed cố định, 3 map (`truong-hoc`, `trung-tam`, `forest-ch1`), mỗi map 6 bạn máy từ trí nhớ trống, 3 giờ ở dt = 0,5 s. Lấy mốc mỗi 10 phút: số nơi đã biết, hiệu suất đường đi tới điểm nhiệm vụ, số đường tắt, tỷ lệ kẹt. Không ghi DB (đây là đo, không phải huấn luyện).
  - **Mốc thật (tùy chọn `--db <PGLITE_DIR>`):** đọc `bot_world_memories.memory.history` từ DB dev khi server dev đã tắt (PGlite chỉ mở được một tiến trình). Lấy trung bình theo map và theo giờ, không kèm id hay tên người chơi nào.
  - Ghi `assets/generated/review/bots-learning.json`; khai trong `tools/assets/generated.json` theo mẫu `sgk-coverage.json` (`:250-254`: `generator`, `derivedFrom: []`, `license: CC0-1.0`); rồi `pnpm assets:manifest`.
- `apps/web/src/review/review-main.ts`: thêm `renderBotsLearning(report)` cạnh `renderPerf` (`:290`). Vẽ ba biểu đồ đường bằng SVG thuần (không dependency): số nơi đã biết theo thời gian, hiệu suất đường đi theo thời gian, đường tắt cộng dồn. Kèm bảng: số bạn máy, số liệu đầu và cuối, mức cải thiện (ví dụ "hiệu suất ×1,6 sau 3 giờ"). Có mốc thật thì vẽ thêm đường "trên server dev".
- `apps/web/review.html`: thêm khung `<div id="bots-learning">` và mục chữ ngắn: bạn máy tự học thế nào, không có tuyến cho sẵn, không theo ai, trí nhớ được lưu, không chứa dữ liệu người chơi. Cùng mục ghi số đo pha 9, dung lượng `content/world/walk/` và migration mới (không có dependency mới).

## Test toàn luồng thay E2E (D10)

`apps/server/src/multiplayer/bot-flow.test.ts`: hub thật, runner thật, `PartyQuestService` với PGlite, `memoryBotStore`, lưới thật `truong-hoc`, fake timer. Một người chơi giả (transport ghi tin) đứng gần một nơi. Kiểm lần lượt:

1. một bạn máy thấy cô bé và chọn `meet` (ép bằng seed);
2. có `bot-say`, rồi lần gặp thứ 2 sau đủ điều kiện thì có `party-invite` từ bạn máy;
3. trả lời `party-reply` đồng ý, thì `party-state.leader` là người chơi;
4. có `party-quest` với bạn máy là leader của run, cô bé ở danh sách mời;
5. cô bé `party-quest-join` và làm các bước qua route bước, thì `done` của bạn máy tăng và cô bé được trả thưởng đúng một run.

Không đụng `apps/web/e2e/**`, `apps/web/playwright.config.ts`.

## Tài liệu

- `docs/system-architecture.md`:
  - dòng "Chơi online" (`:26`): bạn máy tự học (lưới `content/world/walk/`, đồ thị nhớ, Q theo nơi, lưu `bot_world_memories`), không theo người chơi, `bot-say`/`bot-doing`, mời tổ đội và kết bạn theo nhịp, người chơi luôn là trưởng đội, bạn máy là thành viên ảo của party quest và không nhận thưởng;
  - sổ quyết định: một dòng cho đợt 2, có link báo cáo Jev.
- `CLAUDE.md` (dòng về `pnpm world:<map>`): sinh lại map thì chạy thêm `pnpm world:walk <map>`; `pnpm bots:learning` cho trang review.
- `.claude/rules/world-scenery.md`, mục Kiểm tra: thêm `pnpm world:walk <map>`.
- `docs/project-roadmap.md`: thêm một dòng. **File đang dirty**: đọc lại và chỉ thêm dòng.
- Report `plans/dattqh/reports/bots-self-learning-<yymmdd>.md`: số liệu học, hiệu năng, kết quả các cổng. (Không viết: số liệu và cổng ghi ở mục Trạng thái trên.)

## Cổng cuối

`pnpm assets:check` → `pnpm content:check` → `pnpm test` (1 worker) → `pnpm typecheck` → `pnpm lint` → `pnpm --filter @miu/web build` → `pnpm security:dist`. Ghi số lỗi và cảnh báo vào report. Deploy production (có migration) hỏi người trước.

## Rollback

Revert pha 10; xóa `bots-learning.json` rồi `pnpm assets:manifest`.
