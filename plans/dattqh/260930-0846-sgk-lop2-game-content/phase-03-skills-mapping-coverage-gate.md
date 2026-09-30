---
phase: 3
title: "Kỹ năng, quy tắc cơ chế, cổng phủ nội dung"
status: pending
priority: P1
effort: "M"
dependencies: [1, 2]
---

# Phase 3: Kỹ năng, quy tắc cơ chế, cổng phủ nội dung

## Goal
Chuẩn bị để phase 4, 5 viết quest song song mà không tự quyết lại: kỹ năng theo mạch kiến thức, quy tắc loại bài → cơ chế, quy ước id/chương/mở khóa/thưởng, và `content:coverage` đo độ phủ thật.

## Requirements
- `content/learning/skills.json`: giữ id cũ (`phep-cong`, `phep-tru`, `so-sanh-so`, `logic`, `doc-hieu`, `ghep-cau`, `tu-vung`); thêm kỹ năng theo mạch của hai sách (≤ 25 tổng), ví dụ Toán: `so-den-100`, `tia-so`, `thanh-phan-phep-tinh`, `hon-kem`, `cong-qua-10`, `tru-qua-10`, `bai-toan-loi-van`, `khoi-luong`, `dung-tich`, `cong-co-nho`, `tru-co-nho`, `hinh-phang`, `xem-dong-ho`, `xem-lich`; Tiếng Việt: `chinh-ta`, `tu-ngu`, `cau`, `dau-cau`, `bang-chu-cai`, `ke-chuyen`. Subject giữ 3 môn.
- Quy tắc loại bài → cơ chế là HẰNG trong `tools/content/check-curriculum.ts` (không file JSON riêng): mỗi `exerciseType` có tập cơ chế hợp lệ, ví dụ `tinh`/`dien-so` → `riddle`, `fill-blank`; `so-sanh` → `fill-blank`; `chon-dap-an` → `quiz`, `multi-select`; `sap-xep` → `sort`; `doc-hieu` → `read`, `quiz`, `multi-select`, `classify`; `dien-chu`/`dau-cau` → `fill-blank`; `xep-tu`/`dat-cau` → `sort`, `classify`; `ke-chuyen-tranh` → `sort` + `speak`; `noi-ve-ban-than` → `speak`; `viet-chu`/`viet-doan` → `worksheet`; `do-luong-thuc-hanh` → `riddle` + `worksheet`; `ve-hinh` → `connect`; `xem-dong-ho` → `clock`; `xem-lich` → `calendar`; `tro-choi` → bất kỳ cơ chế tương tác. Section `viet-chu-hoa`, `viet-ung-dung`, `nghe-viet`, `viet-doan`, `van-dung` Toán thực hành → `worksheet` (D3). `exerciseType` mới trong kiểm kê mà chưa có quy tắc → lỗi.
- `pnpm content:coverage` (+ `--book`, `--unit`): item được tính là phủ khi có ≥ 1 bước quest (draft hoặc active) với `curriculumRef` trỏ tới nó VÀ cơ chế của bước nằm trong tập hợp lệ của `exerciseType`. In bảng theo sách/chủ đề/bài: phủ trong game, phủ qua phiếu (tách cột), còn thiếu (liệt kê id). `curriculumRef` trỏ tới item không tồn tại → lỗi ngay. `content:check` chỉ cảnh báo độ phủ; phase 10 bật lỗi.
- Kiểm đáp án bằng code: bước `riddle`/`fill-blank` số/`clock`/`calendar` có `curriculumRef` tới item có `expression` hoặc `answer` kiểu số/giờ/ngày → đáp án quest phải bằng giá trị TÍNH TỪ `expression` (hoặc `answer` có kiểu). Đáp án dạng lựa chọn/thứ tự/nhóm do giáo viên duyệt, không so tự động.
- Quy ước cho phase 4, 5 (ghi trong file này):
  - Id quest: `tv2-t01-b01` … `tv2-t17-b32`, `tv2-t09-on-giua-ki`, `tv2-t18-on-cuoi-ki`; `toan2-cd1-b01` … `toan2-cd7-b36`.
  - Region/chương (D6): TV `khu-rung-bi-mat`, chương = tuần + 1 (ch1 là quest mở đầu hiện có; tuần 1 → ch2 … tuần 18 → ch19), 2 quest/chương; Toán `truong-hoc`, chương = số chủ đề, 4–7 quest/chương.
  - Mở khóa: tuyến tính theo thứ tự sách trong từng môn. Quest đầu mỗi môn (`tv2-t01-b01`, `toan2-cd1-b01`) do `forest-ch1` mở — nối ở phase 10 (D7), nên tới lúc đó chúng là draft; khóa Trường học vì vậy do server tính qua chuỗi mở khóa, không ở client.
  - Thưởng: XP bài mới 60–100, luyện tập chung 80, ôn tập 120; Xu 10–20; Skill XP 1–2 mỗi kỹ năng luyện; vật phẩm tối đa 1 món/chương (danh mục VS phase 9). KHÔNG đổi `level-curve.json`: ~70 quest × ~85 XP ≈ 6.000 XP ≈ cấp 12–13 trên curve hiện có — ghi phép tính vào report.
  - Nhân vật dẫn: Vẹt, Hải ly (rừng); NPC Trường học là con vật Cube Pets (phase 9 đặt lên map). Tên riêng trong sách giữ nguyên.
- Hai quest mẫu (`status: "draft"`): `tv2-t01-b01`, `toan2-cd1-b01` đủ luật, phủ 100% item của bài 1 mỗi sách — khuôn cho phase 4, 5.

## Files
- Modify: `content/learning/skills.json`, `tools/content/check-curriculum.ts` (+ test), `package.json` (`content:coverage`)
- Create: `content/quests/tv2-t01-b01.json`, `content/quests/toan2-cd1-b01.json`

## Steps
1. Test trước: ref không tồn tại → lỗi; `exerciseType` thiếu quy tắc → lỗi; bước sai cơ chế không được tính phủ; phủ 2/3 → 66,7% và liệt kê id thiếu; phiếu tách cột; đáp án quest lệch giá trị tính từ `expression` → lỗi.
2. Kỹ năng, quy tắc, `content:coverage`.
3. Hai quest mẫu; `content:check` xanh; `content:coverage --unit` bài 1 = 100%.

## Verification
- `pnpm vitest run tools/content packages`; `pnpm content:check`; `pnpm content:coverage`

## Risk
- Quy tắc cơ chế quá chặt với bài lạ: thêm quy tắc cho `exerciseType` đó (một dòng hằng), không nới luật chung.
