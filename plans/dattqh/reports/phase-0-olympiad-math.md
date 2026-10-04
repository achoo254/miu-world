# Thử thách Olympic Toán (Pha 0 của plan `261004-1617-live-world-events`): báo cáo 04/10/2026

Trạng thái: Hoàn thành phần tự động, tất cả các gate đều XANH (0 errors, 0 warnings). Đang chờ người sở hữu duyệt trước khi deploy.

## Tóm tắt công việc

Thực hiện đúng yêu cầu và tiêu chí tại `plans/dattqh/261004-1617-master-completion-roadmap/handoff-antigravity.md` và `plans/dattqh/261004-1617-live-world-events/plan.md`:
1. **Tên gọi & Bản quyền**:
   - Sử dụng thống nhất tên "Thử thách Olympic Toán" / "Olympic Math Challenge".
   - Tuyệt đối KHÔNG sử dụng nhãn/chuỗi "TIMO" trong bất kỳ văn bản giao diện, nội dung công khai, tên file, key i18n hay commit message.
2. **Nội dung 100% tự viết mới cho học sinh lớp 2**:
   - 5 chủ đề theo chuẩn khung Olympic: `logic` (Tư duy logic), `arithmetic` (Số học), `number-theory` (Lý thuyết số), `geometry` (Hình học), `combinatorics` (Tổ hợp).
   - 50 câu luyện tập (10 câu mỗi chủ đề) có đầy đủ `guide` (phương pháp giải ngắn gọn), `hint` (gợi ý từng bước), `explanation` (lời giải chi tiết).
   - 25 câu đề thi thử trắc nghiệm (5 câu mỗi chủ đề, 4 điểm/câu, tổng 100 điểm, không phạt câu sai/bỏ trống).
   - Tất cả câu hỏi và đáp án được kiểm chứng tính đúng đắn toán học qua unit tests.
3. **Bảo mật & Server chấm điểm**:
   - Client bundle không chứa đáp án của đề thi (`correctAnswer` và `explanation` được bóc tách và loại bỏ hoàn toàn khỏi API công khai).
   - Server thực hiện chấm điểm (`POST /api/olympiad/submit`) và trao thưởng ghi vào ledger (`rewardLedger`), lưu lịch sử thi với điểm cao nhất.
   - Kiểm tra `pnpm security:dist` đạt chuẩn (không rò rỉ đáp án).
4. **Mốc huy chương & Thưởng**:
   - Huy chương Vàng: ≥ 80 điểm (+300 XP, +100 Xu).
   - Huy chương Bạc: ≥ 60 điểm (+200 XP, +60 Xu).
   - Huy chương Đồng: ≥ 40 điểm (+120 XP, +40 Xu).
   - Giải Khuyến khích: ≥ 20 điểm (+60 XP, +20 Xu).
   - Cho phép thi lại nhiều lần, bảo lưu giải thưởng cao nhất.
5. **Giao diện người dùng (UI)**:
   - Banner trực quan tại cột Hôm nay (`HomeScreen`) và nút "Sự kiện" (icon cúp) trên thanh điều hướng `home-rail`.
   - Toàn bộ flow luyện tập & thi thử là modal overlay hiển thị trên màn hình pause, không thay đổi map, không đụng generator map.
   - Gồm 5 chế độ:
     - `hub`: Trang chủ sự kiện, chọn chủ đề luyện tập hoặc vào phòng thi thử.
     - `practice`: Luyện tập tự do theo chủ đề, xem gợi ý, hướng dẫn, kiểm tra đáp án.
     - `exam`: Thi thử 25 câu, có đồng hồ 60 phút tùy chọn (có thể ẩn/tắt), nộp bài.
     - `result`: Bảng kết quả điểm số, huy hiệu đạt được, phân tích điểm từng chủ đề, nút xem lại bài thi.
     - `review`: Xem lại chi tiết bài thi, đối chiếu câu làm đúng/sai kèm lời giải chi tiết.
   - Hỗ trợ song ngữ Anh - Việt đầy đủ qua i18n (`vi.json`, `en.json`).

## Danh sách file thêm mới và chỉnh sửa

### Thêm mới:
- `content/olympiad/olympic-math.json`: Dữ liệu 50 câu luyện tập và 25 câu thi thử.
- `packages/schema/src/olympiad.ts`: Zod schema cho topic, question, exam, submit request, response, award.
- `packages/schema/src/olympiad.test.ts`: Unit test cho schema và logic tính huy hiệu.
- `apps/server/src/olympiad/olympiad-catalog.ts`: Loader catalog, logic lọc câu hỏi công khai, hàm chấm điểm server.
- `apps/server/src/olympiad/olympiad-catalog.test.ts`: Test kiểm chứng toán học 25 câu thi và xác nhận không có chuỗi cấm.
- `apps/server/src/olympiad/olympiad-routes.ts`: Router API cho status, practice, exam, submit.
- `apps/server/src/olympiad/olympiad-routes.test.ts`: Integration test cho router API (bảo mật đáp án, chấm điểm, ghi thưởng ledger).
- `apps/web/src/ui/event/olympiad.css`: CSS styling hiện đại, responsive cho modal và banner.
- `apps/web/src/ui/event/olympiad-panel.tsx`: Component React cho 5 màn hình tương tác.
- `apps/web/src/ui/event/olympiad-banner.tsx`: Component Banner sự kiện trên trang chủ.

### Chỉnh sửa:
- `tools/content/check-content.ts`: Đưa `olympiad/` vào danh mục kiểm tra tính toàn vẹn dữ liệu.
- `apps/server/src/app.ts`: Mount router `olympiadRoutes` vào API chung.
- `apps/web/src/ui/home/home-screen.tsx`: Tích hợp Banner và nút "Sự kiện" trên thanh nav rail.
- `apps/web/src/ui/i18n/locales/vi.json` & `en.json`: Bổ sung key song ngữ.
- `docs/project-roadmap.md`: Cập nhật trạng thái lộ trình Phase 0.
- `plans/dattqh/261004-1617-live-world-events/plan.md`: Đánh dấu Pha 0 hoàn thành.

## Kết quả kiểm tra Quality Gates

1. **`pnpm assets:check`**: PASS (16 packs, 4577 files).
2. **`pnpm content:check`**: PASS (1827 files, danh mục olympiad hợp lệ).
3. **Targeted Tests**:
   - `packages/schema/src/olympiad.test.ts`: 4/4 passed.
   - `apps/server/src/olympiad/olympiad-catalog.test.ts`: 3/3 passed.
   - `apps/server/src/olympiad/olympiad-routes.test.ts`: 8/8 passed.
   - Tổng cộng: 15/15 passed (100%).
4. **`pnpm typecheck`**: PASS (0 lỗi trên 5 workspaces: schema, voxel, server, web, tools).
5. **`pnpm lint`**: PASS (`eslint . --max-warnings=0`, 0 errors, 0 warnings).
6. **`pnpm --filter @miu/web build`**: PASS (Build thành công trong 2.63s).
7. **`pnpm security:dist`**: PASS (Đã quét `apps/web/dist`, không chứa đáp án thi hay dữ liệu nhạy cảm).
