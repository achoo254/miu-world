# Pha 2 — nhà to, cửa rộng, trong nhà đủ chỗ trên một map (bản giao việc cho agent)

Tier: L mỗi map. Plan: `plan.md` cùng thư mục (đọc phần "Chuẩn một ngôi nhà"). Khuôn làm việc chung (bộ dựng, prop hộp, góc chụp, khóa chụp, quy tắc tệp): `plans/dattqh/261002-0802-detail-mocks-per-map/phase-04-map-rework-brief.md` — đọc phần "Quy tắc" và "Góc chụp đối chiếu".

## Việc

1. Đo trước: `pnpm exec tsx tools/world/room-audit.ts <map>` và `pnpm exec tsx tools/world/reach-audit.ts <map>` (đọc tệp đã sinh, vài giây). Ghi số đo vào báo cáo.
2. Tìm mọi ngôi nhà/công trình đi vào được của map trong generator và `tools/world/structures/<map>-*.ts` (nhà dân, cửa hàng, sạp có mái, nhà nghỉ, trạm, lớp học, thư viện, đền, hang làm phòng…). Đưa từng cái về chuẩn:
   - Nhà ở ≥ 13 × 11, tường ≥ 7 (mái theo đó); công trình công cộng to hơn tương xứng; giữ phong cách của mock (khung `designs/<thư mục>/` của map).
   - Cửa chính ≥ 3 rộng × 3 cao; sàn cao hơn đất thì bậc 1 khối một (`doorSteps` trong `structures/buildings.ts`, hoặc tự dựng bậc trong tệp riêng của map).
   - Nội thất: giãn đồ đạc theo phòng to, ≥ 70% sàn trống, lối đi chính ≥ 2 khối, mọi chỗ trống tới được từ cửa. Đồ đạc nay có va chạm (`traversal` trong `content/world/models.json`: mặc định tự bước 1 khối/tự trèo 2 khối, `blocking` thì chắn hẳn, `walk-through` đi xuyên).
   - Không để khối nhà kín rỗng: nhà nào cũng có lối vào; khối trang trí không phải nhà (tháp kín, bệ) thì làm đặc.
3. Nhà to ra thì bố cục phải nhường chỗ: dời, thưa bớt, hoặc bỏ bớt nhà để không lấn đường, khu bài học (`ZONES` giữ nguyên vị trí và cỡ), nước, landmark của quest (tên giữ nguyên). Các bộ dựng chung `placeCottage`/`cottageRow`/`hamlet`/`streetHouses` đã tự to ra (pha 1) — kiểm chỗ map gọi chúng còn vừa.
4. Sinh lại: `pnpm world:<map>`; đo lại đến khi `room-audit` không còn nhà nào thiếu (không gian có mái không phải nhà — gầm cầu, mái hiên, vách đá nhô — ghi lại là ngoại lệ có lý do) và `reach-audit` báo mọi mục tới được, chỗ xuất hiện/xuống xe trống.
5. Nếu map có góc chụp mock (`content/world/mock-views/<map>.json`) nhìn vào nhà đã đổi: chỉnh góc cho khớp nhà mới và chụp lại riêng các khung đó (`PREVIEW_ONLY=mock__ node <LOCK> pnpm assets:preview <map>`), xem bằng `<COMPARE>`. `<LOCK>`, `<COMPARE>`: `/private/tmp/claude-501/-Users-hoandat-inet-gitlab-miu-world/51070a80-962b-4736-8834-dd97764a344e/scratchpad/tools/{with-lock.mjs,compare.py}`. Mọi lệnh ghi `assets/` chung (`assets:box-props`, `assets:manifest`, `assets:preview`) chạy qua `node <LOCK> …`.

## Kiểm tra (người sở hữu: không chạy E2E, không chạy cả bộ test)

- `room-audit`, `reach-audit` như trên (bắt buộc).
- `pnpm exec tsc --noEmit -p tsconfig.json`, `pnpm exec eslint <tệp đã sửa> --max-warnings=0`.
- Không chạy `pnpm test`, `vitest` cả thư mục, E2E, `perf`.

## Chỉ sửa

Generator của map, `tools/world/structures/<map>-*.ts` (mới hoặc của map), `content/world/{mock-views,box-props}/<map>.json`, dòng mới trong `content/world/models.json` (Edit, chèn đúng chỗ), ảnh sinh ra của map qua lệnh. Không sửa tệp dựng chung (`zone-map.ts`, `scenery.ts`, `structures/{buildings,countryside,landmarks,world-writer}.ts`, `village-life.ts`, `map-kit.ts`), `content/world/regions.json`, `targets.json`, `content/quests/**`, `apps/**`, map khác. Cần đổi tệp chung thì ghi đề xuất vào báo cáo. Không `git add`, không commit.

## Báo cáo

`plans/dattqh/reports/houses-<map>-261002.md` (tiếng Việt): số đo trước/sau của `room-audit` và `reach-audit`; từng công trình: cỡ cũ → mới, cửa, bậc, nội thất; nhà đã dời/bỏ; ngoại lệ có lý do; kết quả tsc/eslint; đề xuất cho tệp chung. Kết thúc bằng khối `Status / Summary / Concerns`.
