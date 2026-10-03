# Thời khóa biểu và lịch đồng phục theo hồ sơ bé (03/10/2026)

Pha C của plan `plans/dattqh/261003-1320-home-timetable-vehicles/`. Tier L. Chưa commit.

## Kết quả

Mỗi hồ sơ bé có một thời khóa biểu và lịch đồng phục lưu trên server. Khi chưa lưu gì, server trả mẫu trống: sáng 4 tiết, chiều 3 tiết, Thứ Hai đến Thứ Sáu, mọi ô để trống. Trong màn chơi, chạm `nha-thoi-khoa-bieu` mở bảng, chạm `nha-lich-dong-phuc` mở cùng bảng nhưng phần đồng phục đứng đầu. Repo không chứa dữ liệu thật nào: test và ảnh chỉ dùng giá trị bịa (trường "Mây Hồng", cô "Lá", số điện thoại `0000 000 000`).

## Schema (`packages/schema/src/timetable.ts`)

- `Timetable` (strict) gồm:
  - `header`: các dòng `school`, `className`, `schoolYear`, `appliesFrom`, `teacher`, mỗi dòng ≤ 80 ký tự;
  - `saturday` (boolean): bật thì có thêm cột Thứ Bảy;
  - `morning` và `afternoon`: mảng từ 0 đến 6 tiết, mỗi tiết là `{ mon … sat }`, mỗi ô ≤ 40 ký tự;
  - `uniform`: `{ mon … sat }`, mỗi thứ ≤ 60 ký tự;
  - `uniformNote`: ≤ 160 ký tự.
- Mọi ô chữ đều được trim và không nhận ký tự điều khiển (xuống dòng, tab).
- Hàm dùng chung: `emptyTimetable()` trả mẫu trống, mỗi lần gọi một bản mới để sửa bản này không ảnh hưởng bản sau. Có thêm `emptyPeriodRow()`, `weekdayOf(date)` (trả null vào Chủ nhật), `WEEKDAYS` và `WEEKDAY_LABELS`.
- `AccountExport` (`packages/schema/src/account.ts`) có thêm `children[].timetable`, là null khi bé chưa lưu thời khóa biểu.

## Server

- Bảng `timetables`: `child_id` (khóa chính, FK tới `child_profiles` với `ON DELETE cascade`), `timetable` (jsonb) và `updated_at`. Xóa hồ sơ bé hay xóa tài khoản phụ huynh thì dòng này mất theo, giống các bảng khác của bé.
- Migration `apps/server/drizzle/0005_timetables.sql`, sinh bằng `pnpm --filter @miu/server db:generate --name=timetables` (kèm `meta/0005_snapshot.json` và `_journal.json`). `db:check` báo "Everything's fine".
- API trong `apps/server/src/timetable/timetable-routes.ts`, gắn vào `app.ts`:
  - `GET /api/timetable` trả thời khóa biểu của hồ sơ đang chọn, hoặc mẫu trống nếu chưa có.
  - `PUT /api/timetable` thay toàn bộ thời khóa biểu (validate bằng `Timetable`, sai thì 400 `invalid-input`) và trả lại bản đã lưu, đã trim.
  - Quyền giống `/character`: cần phiên phụ huynh có hồ sơ đang chọn (`requireParent` và `activeChildId`), không cần PIN. Bé hoặc người lớn ngồi cạnh đều sửa được, đúng yêu cầu. Kiểm Origin và CSRF dùng middleware chung của `/api`.
- Gói "Tải dữ liệu của tôi" (`GET /api/account/export`) nay có cả thời khóa biểu.

## Web

- `apps/web/src/ui/timetable/`:
  - `timetable-panel.tsx`: Modal dạng `scene`, giấy da và gỗ như các màn quest, kèm nút ✕.
  - `timetable-table.tsx`: bảng và ô sửa từng tiết.
  - `uniform-calendar.tsx`: lịch đồng phục.
  - `timetable-model.ts`: các hàm thuần (tiêu đề, ngày học, dòng "Hôm nay mặc", và các bước sửa).
  - `timetable-api.ts`, `timetable-targets.ts`, `timetable.css`.
- Chế độ xem:
  - Phần đầu như ảnh mẫu: tên trường, "THỜI KHÓA BIỂU - LỚP … – NĂM HỌC …", "(Áp dụng từ ngày …)", "GVCN: …".
  - Bảng có các cột Buổi | Tiết | Thứ Hai … Thứ Sáu. Buổi SÁNG và CHIỀU là nhóm hàng, giữa hai buổi có hàng "NGHỈ TRƯA" kéo hết bề ngang. Cột hôm nay tô hồng và có nhãn "Hôm nay" (`aria-current="date"`).
  - Phần đồng phục: dòng lớn "Hôm nay mặc: …". Vào ngày nghỉ, dòng này đổi thành "Hôm nay được nghỉ học, mặc gì cũng được!"; chưa ghi đồng phục thì là "Hôm nay chưa ghi đồng phục.". Bên dưới là danh sách cả tuần, hôm nay được viền.
  - Nếu bé chưa nhập gì, bảng hiện thêm lời nhắc bấm "Sửa".
- Chế độ "Sửa":
  - Có 5 ô cho phần đầu, nút −/+ số tiết từng buổi (0–6) và nút bật "Học cả Thứ Bảy".
  - Chạm một ô trong bảng mở khung sửa với các chip 14 môn và hai nút "Xóa ô", "Xong". Khung này tự cuộn lên để không bị khuất.
  - Mỗi thứ có ô đồng phục và 4 chip (Bộ sơ mi trắng, Bộ áo phông xanh, Bộ thể thao, Tự do), bên dưới là ô ghi chú.
  - Thanh "Hủy · Lưu" luôn dính ở đáy bảng. Lưu lỗi thì giữ nguyên bản đang sửa và báo lỗi.
- Kích thước: mọi nút và ô nhập cao ≥ 48 px, đã đo trên ảnh ở cả 3 cỡ màn hình và không có phần tử nào thấp hơn. Trên điện thoại, bảng cuộn ngang bên trong tờ giấy và bảng cuộn dọc bên trong panel; trang không bao giờ tràn ngang (`scrollWidth > innerWidth` = false ở 1180×820, 820×1180 và 390×844).
- `data-id` gắn trên các phần chính: `timetable`, `timetable-edit`, `timetable-save`, `timetable-cancel`, `timetable-close`, `timetable-done`, `timetable-cell-<buổi>-<tiết>-<thứ>`, `timetable-cell-input`, `timetable-subject-<i>`, `timetable-uniform-today`, `timetable-uniform-<thứ>`, `timetable-uniform-<thứ>-<i>`, `timetable-periods-<buổi>(-less|-more)`, `timetable-saturday`, `timetable-header-<field>`.
- Cách mở bảng:
  - `play-screen.tsx` theo dõi `lastInteraction` của store. Khi id thuộc `TIMETABLE_TARGETS`, màn chơi mở bảng; trong lúc bảng mở, game tạm dừng và HUD ẩn (tính vào `covered`).
  - `use-quest-controller.ts` bỏ qua hai id này, nên khi chạm chúng không hiện câu "chưa phải lúc" và không gọi API quest. Sửa file này nằm ngoài danh sách file của pha C; phiên chính đã đồng ý.

## Ảnh (trang tạm dựng bằng Vite và Playwright, đã xóa sau khi chụp)

`plans/dattqh/reports/timetable-261003/`:

- `ipad-landscape-view.png`: bảng đã điền, hôm nay là Thứ Tư.
- `ipad-landscape-empty.png`: mẫu trống.
- `ipad-landscape-edit-cell.png`: chế độ sửa, đang sửa một ô.
- `ipad-portrait-uniform.png`: mở từ lịch đồng phục.
- `phone-view.png`: điện thoại, bảng cuộn ngang.
- `phone-edit.png`: điện thoại, chip môn và thanh Hủy · Lưu.

## Kiểm tra

- Vitest, chạy riêng từng nhóm file: 20 file, 147 test đều qua.
  - `packages/schema/src/timetable.test.ts` (6 test).
  - `apps/server/src/timetable/timetable-routes.test.ts` (5 test): mẫu trống; lưu, đọc lại và thay; mỗi anh chị em một bảng riêng; nhà khác không xem được (chọn hồ sơ của nhà khác trả 404); 7 kiểu body sai đều bị từ chối và không ghi gì; 401 khi chưa đăng nhập hoặc chưa chọn hồ sơ; 403 khi Origin lạ.
  - `schema.test.ts` (xóa cascade), `child-data.test.ts`, `endpoint-table.test.ts` (route mới trả 401 khi không có phiên), `account-routes.test.ts` (export có thời khóa biểu; xóa tài khoản xóa cả bảng mới).
  - `timetable-panel.test.tsx` (8 test): mẫu trống; cột hôm nay và "Hôm nay mặc"; Chủ nhật; mở từ đồng phục; sửa ô bằng chip, gõ chữ, xóa ô, sửa phần đầu, đồng phục, số tiết, rồi Lưu và kiểm body PUT; Thứ Bảy; Hủy; lưu lỗi rồi thử lại; tải lỗi rồi thử lại.
  - `play-screen.test.tsx`: hai id mở đúng bảng, game dừng phía sau, id khác không mở.
  - `quest-layer.test.tsx`: chạm hai id không hiện câu quest và không gọi API.
- Test mở bảng trong `play-screen.test.tsx` lúc đầu chập chờn: nó dùng store của lần render trước khi game mới chưa khởi tạo. Đã sửa bằng cách đặt lại `games.store` và chờ game của lần này tạo xong. Sau đó chạy lại 6 lần riêng file này và 4 lần chung cả nhóm, lần nào cũng qua.
- `pnpm typecheck`: sạch. ESLint `--max-warnings=0` trên mọi file đã sửa: sạch.
- `pnpm --filter @miu/web build`: build được. Có cảnh báo chunk > 500 kB của `accessories-*.js`; cảnh báo này đã có từ trước, không do pha này. `pnpm security:dist`: OK.
- Chưa chạy: E2E, `pnpm test` toàn bộ, `assets:check` và `content:check`, theo yêu cầu (phiên chính chạy ở pha D).
- Dependency mới: không có.

## Lưu ý cho phiên chính

1. **Lời đồng ý và chính sách riêng tư đang nói ngược với tính năng này.** `content/legal/consent-vi.json` viết "Chúng tôi không thu thập … trường, tuổi hay lớp của bé". `privacy-vi.json` liệt kê "lớp, trường" là thứ không thu, và viết "Bé không bao giờ tự gõ chữ vào trò chơi". Thời khóa biểu lại lưu trên server tên trường, lớp, tên và số điện thoại GVCN, tất cả là chữ tự gõ. Rule `.claude/rules/server-and-child-safety.md` và mục "Hỏi người trước khi làm" trong `CLAUDE.md` coi đây là việc phải hỏi người. Người sở hữu đã yêu cầu tính năng và Jev đã chọn `profile-editable-empty`, nhưng chưa ai quyết phần văn bản pháp lý. Có ba hướng:
   - (a) Sửa lời đồng ý và chính sách, đổi `policyVersion` để phụ huynh đồng ý lại. Tôi khuyến nghị hướng này vì giữ đúng yêu cầu của người sở hữu.
   - (b) Bỏ phần đầu (trường, lớp, GVCN) khỏi server, chỉ lưu các tiết và đồng phục.
   - (c) Giữ nguyên như hiện tại.

   Tôi không sửa `content/legal/**` vì không thuộc file của pha C.
2. Docs (`docs/system-architecture.md`: bảng, endpoint, sổ quyết định) và trang review chưa cập nhật. Việc này để pha D.
3. "Mẫu trống" là hàm `emptyTimetable()` chứ không phải hằng số, để tránh bị sửa nhầm qua tham chiếu dùng chung.
