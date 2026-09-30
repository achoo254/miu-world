---
phase: 1
title: "Kiểm kê SGK thành dữ liệu"
status: completed
priority: P1
effort: "L"
dependencies: []
---

# Phase 1: Kiểm kê SGK thành dữ liệu

## Goal
Mọi trang nội dung của Toán 2 tập 1 và Tiếng Việt 2 tập 1 thành dữ liệu có cấu trúc: id ổn định, số trang, nguyên văn, đáp án có kiểu — nguồn duy nhất để viết quest, dựng phiếu và đo độ phủ; đọc hai lượt độc lập để không sót, không sai.

## Nguồn
- `~/Library/Mobile Documents/com~apple~CloudDocs/Sách giáo khoa Toán lớp 2 (tập 1) - bộ sách Kết nối tri thức với cuộc sống.pdf` (141 trang, 131 MB)
- `~/Library/Mobile Documents/com~apple~CloudDocs/Sách giáo khoa Tiếng Việt lớp 2 (tập 1) - bộ sách Kết nối tri thức với cuộc sống.pdf` (145 trang, 156 MB)
- Bản scan, KHÔNG có lớp chữ (pypdf trích 0 ký tự); máy không có OCR/`pdftoppm`/`mutool`. Công cụ Read nhận PDF ≤ 100 MB và cần `pdftoppm` khi dùng `pages` → tách từng trang thành PDF 1 trang (0,2–1,6 MB) rồi Read cả file (hook context chặn file > 2 MB, cảnh báo > 256 KB — đọc từng trang một).
- Số trang in = số trang PDF − 1. Mục lục: Toán PDF 5–6; TV PDF 5–9. Trang cuối mỗi sách là trang bản quyền; TV PDF 144 là bảng thuật ngữ (không phải nội dung bài).

## Requirements
- `tools/sgk/split-pages.py` (chạy bằng `~/.claude/skills/.venv/bin/python3`, có pypdf):
  1. Copy hai PDF từ iCloud về `.data/sgk/src/{toan2-t1,tv2-t1}.pdf` (nếu file iCloud chưa tải về máy — kích thước 0 hoặc lỗi đọc — dừng với hướng dẫn mở file trong Finder để tải), ghi `sha256` vào `.data/sgk/src/SHA256SUMS`; lần sau kiểm hash trước khi dùng.
  2. Tách `.data/sgk/pages/{toan,tv}-NNN.pdf` (1 trang/file, NNN = số trang PDF).
  `.data/` đã gitignore; không commit PDF hay ảnh trang.
- `packages/schema/src/curriculum.ts` — `CurriculumBook` (Zod, strict):
  - `book.json`: `id` (`toan2-t1` | `tv2-t1`), `title`, `publisher`, `edition`, `pdfPageOffset: 1`, `status: "draft" | "complete"`, `toc[]` (mục lục: chủ đề/chủ điểm, bài, tuần, trang — đã đọc: Toán PDF 5–6, TV PDF 5–9).
  - File chủ đề/chủ điểm: `units[]` → `lessons[]` → `sections[]` → `items[]`.
  - `lessons[]`: `id` (`toan2-t1-b07`, `tv2-t1-b01`, `tv2-t1-on-giua-ki`, `tv2-t1-on-cuoi-ki`), `number`, `title`, `week` (TV), `pages: [from, to]` (trang in).
  - `sections[]`: `id`, `kind` — Toán: `kham-pha` | `hoat-dong` | `luyen-tap` | `tro-choi` | `van-dung`; TV: `doc` | `viet-chu-hoa` | `viet-ung-dung` | `nghe-viet` | `bang-chu-cai` | `chinh-ta` | `tu-ngu-cau` | `viet-doan` | `noi-nghe` | `ke-chuyen` | `doc-mo-rong` | `van-dung` | `danh-gia`; `page`; `text?` (nguyên văn bài đọc/bài thơ/câu chuyện + tác giả, giữ xuống dòng khổ thơ); `items[]`.
  - `items[]` (đơn vị đo phủ, mỗi bài tập/câu hỏi/yêu cầu/ý a, b một item): `id` (`<section id>-<số>[-a]`), `page`, `prompt` (nguyên văn), `exerciseType` (danh sách đóng, ví dụ `tinh`, `dien-so`, `so-sanh`, `chon-dap-an`, `noi`, `sap-xep`, `bai-toan-loi-van`, `doc-hieu`, `dien-chu`, `xep-tu`, `dat-cau`, `dau-cau`, `ke-chuyen-tranh`, `noi-ve-ban-than`, `viet-chu`, `viet-doan`, `do-luong-thuc-hanh`, `ve-hinh`, `xem-dong-ho`, `xem-lich`, `tro-choi`), `media?` (mô tả hình: "cân đĩa 2 kg + 5 kg = quả mít", "đồng hồ 3 giờ", từng tranh truyện theo thứ tự), `expression?` (biểu thức cho bài tính, ví dụ `"62 - 6"`, `"8 + 5"`, dùng để tính đáp án bằng code), `answer?` có kiểu: `{ number }` | `{ text }` | `{ time: { hour, minute } }` | `{ date: { day, month } }` | `{ choice: string }` (nhãn nguyên văn) | `{ open: true }` (câu tự do như kể chuyện), `readConfidence: "high" | "low"`.
  - Mỗi trang: `pageItems[]`: `{ page, itemCount }` — số item đếm được trên trang (lượt 2 đếm độc lập).
  - Refine: id duy nhất toàn sách; trang item trong khoảng bài; `text` bắt buộc với `doc`, `nghe-viet` và `doc-mo-rong` có bài in trong sách; `expression` tính được (chỉ số nguyên, + − và so sánh) và nếu có `answer.number` thì phải khớp.
- `tools/content/check-curriculum.ts` (+ test): validate mọi file; số item theo trang khớp `pageItems`; khi `book.status = "complete"`: số bài khớp `toc` (Toán 36/7 chủ đề; TV 32/18 tuần + 2 ôn tập), mọi trang nội dung có ≥ 1 section, không item `readConfidence: "low"`; khi `draft` các lỗi này thành cảnh báo. Gọi từ `tools/content/check-content.ts` và đăng ký đúng thư mục lồng `curriculum/toan2-t1/`, `curriculum/tv2-t1/` (hàm `inFolder` chỉ khớp file nằm trực tiếp trong thư mục).

## Chia việc song song (disjoint file)
| Gói | Trang PDF | File ra |
| --- | --- | --- |
| 1a Toán chủ đề 1–2 | 7–57 | `toan2-t1/chu-de-1.json`, `chu-de-2.json` |
| 1b Toán chủ đề 3–4 | 58–98 | `chu-de-3.json`, `chu-de-4.json` |
| 1c Toán chủ đề 5–7 | 99–138 | `chu-de-5.json` … `chu-de-7.json` |
| 1d TV chủ điểm 1 (tuần 1–4) | 10–39 | `tv2-t1/chu-diem-1.json` |
| 1e TV chủ điểm 2 + ôn giữa kì (tuần 5–9) | 40–78 | `chu-diem-2.json` |
| 1f TV chủ điểm 3 (tuần 10–13) | 79–108 | `chu-diem-3.json` |
| 1g TV chủ điểm 4 + ôn cuối kì (tuần 14–18) | 109–143 | `chu-diem-4.json` |
Gói 1-core (schema, script, checker, `book.json`) làm trước. Mỗi gói 1a–1g chạy HAI lượt: lượt 1 ghi dữ liệu; lượt 2 do một agent khác đọc lại từng trang độc lập, đếm item và so từng `prompt`/`text`/`expression` với lượt 1 — lệch thì đánh `readConfidence: "low"` và đọc lượt 3 để chốt.

## Steps
1. Test trước: `curriculum.test.ts` (id trùng, trang ngoài khoảng, `doc` thiếu `text`, `expression` sai đáp án → lỗi; mẫu hợp lệ qua); `check-curriculum.test.ts` (draft chỉ cảnh báo, complete thiếu bài/hở trang/lệch itemCount → lỗi; thư mục lồng được nhận).
2. Schema, script, checker, `book.json`; chạy script tạo `.data/sgk/`.
3. Gói 1a–1g (lượt 1 rồi lượt 2); `pnpm content:check` sau mỗi gói.
4. Đặt `status: "complete"` cho từng sách khi đủ; `content:check` xanh ở chế độ complete.
5. Report `plans/dattqh/reports/sgk-inventory-260930.md`: số item theo sách/chủ đề/loại, số chỗ lệch giữa hai lượt và cách chốt, trang chỉ có tranh.

## Verification
- `pnpm vitest run packages/schema/src/curriculum.test.ts tools/content`; `pnpm content:check`; `pnpm lint`; `pnpm typecheck`
- `git status` không có PDF/ảnh trang

## Risk
- Đọc nhầm chữ/số từ ảnh: hai lượt độc lập + itemCount + `expression` tính bằng code; giáo viên duyệt theo số trang.
- Trang chỉ có tranh (kể chuyện theo tranh): `media` mô tả từng tranh theo thứ tự để phase 4 làm bước xếp tranh.
