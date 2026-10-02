---
phase: 1
title: "Kiểm kê SGK tập 2 thành dữ liệu"
status: pending
priority: P1
effort: "L"
dependencies: []
---

# Phase 1: Kiểm kê SGK tập 2 thành dữ liệu

## Goal
Mọi trang nội dung của Toán 2 tập 2 và Tiếng Việt 2 tập 2 thành dữ liệu có cấu trúc (id ổn định, trang in, nguyên văn, đáp án có kiểu), cùng schema và cổng kiểm như tập 1; đọc hai lượt độc lập.

## Khuôn
Làm y như phase 1 của tập 1: `plans/dattqh/260930-0846-sgk-lop2-game-content/phase-01-textbook-inventory.md` (schema `packages/schema/src/curriculum.ts`, `tools/content/check-curriculum.ts`, chia gói song song theo trang, hai lượt đọc). Chỉ ghi phần khác ở dưới.

## Nguồn (đã sẵn)
- iCloud `miu-world/sgk/toan2-t2.pdf` (142 trang, sha256 trong `tools/private/private-files.json`), `tv2-t2.pdf` (145 trang); `pnpm private:sync` chép về `.data/sgk/src/`.
- Đã tách trang: `.data/sgk/pages/toan-t2-NNN.pdf`, `tv-t2-NNN.pdf` (`tools/sgk/split-pages.py`). Bản scan, không có lớp chữ: đọc từng trang bằng Read.
- Số trang in = số trang PDF − 1. Mục lục: Toán PDF 4–5; Tiếng Việt PDF 4–8. Toán PDF 140 là thuật ngữ, 141 là trang xuất bản.

## Requirements
- `packages/schema/src/curriculum.ts`: thêm `toan2-t2`, `tv2-t2` vào id sách; id bài Toán tiếp số sách (`toan2-t2-b37` … `b75`, chủ đề 8–14); Tiếng Việt `tv2-t2-b01` … `b30`, `tv2-t2-on-giua-ki` (tuần 27), `tv2-t2-on-cuoi-ki` (tuần 35); `week` 19–35.
- `exerciseType` mới nếu cần cho tập 2: `nhan`, `chia`, `khoi-hinh` (khối trụ, khối cầu), `doc-viet-so` (số có ba chữ số), `tien` (tiền Việt Nam), `do-do-dai` (dm, m, km), `bieu-do-tranh`, `kha-nang` (chắc chắn, có thể, không thể), `viet-thu`, `viet-thiep`. Thêm vào danh sách đóng, có test.
- `answer` có kiểu cho tập 2: số tiền (`{ money: number }` đồng) nếu cần; biểu thức nhân chia trong `expression` (mở rộng bộ tính của tập 1: × và :).
- `content/curriculum/toan2-t2/` (`book.json`, `chu-de-8.json` … `chu-de-14.json`), `content/curriculum/tv2-t2/` (`book.json`, một tệp mỗi chủ điểm, ôn tập riêng).
- `check-curriculum`: Toán 39 bài/7 chủ đề, Tiếng Việt 30 bài + 2 ôn tập/17 tuần khi `complete`.
- `pnpm content:gaps --book toan2-t2|tv2-t2` chạy được (chưa có quest thì 0%).

## Chia gói song song (tệp riêng từng gói)
| Gói | Sách | Trang PDF | Tệp ra |
| --- | --- | --- | --- |
| 1a | Toán chủ đề 8–9 | 5–39 | `chu-de-8.json`, `chu-de-9.json` |
| 1b | Toán chủ đề 10–11 | 41–79 | `chu-de-10.json`, `chu-de-11.json` |
| 1c | Toán chủ đề 12–14 | 80–139 | `chu-de-12.json` … `chu-de-14.json` |
| 1d | TV Vẻ đẹp quanh em | 9–38 | `ve-dep-quanh-em.json` |
| 1e | TV Hành tinh xanh + ôn giữa kì | 39–76 | `hanh-tinh-xanh.json`, `on-giua-ki.json` |
| 1f | TV Giao tiếp và kết nối + Con người Việt Nam | 77–109 | `giao-tiep-ket-noi.json`, `con-nguoi-viet-nam.json` |
| 1g | TV Việt Nam quê hương em + ôn cuối kì | 110–145 | `viet-nam-que-huong.json`, `on-cuoi-ki.json` |

Trang chính xác theo mục lục đã đọc (Toán: chủ đề 8 trang in 4, 9 trang 34, 10 trang 40, 11 trang 65, 12 trang 79, 13 trang 100, 14 trang 110; Tiếng Việt: chủ điểm trang in 8, 38, ôn giữa kì 68, 76, 91, 109, ôn cuối kì 133). Gói kiểm lại ranh giới khi đọc.

## Validation
- `pnpm content:check` xanh, `book.status: complete` cả hai sách, không item `readConfidence: low`.
- Lượt 2 đếm item mỗi trang độc lập, khớp `pageItems`.
- Report `plans/dattqh/reports/sgk-tap2-inventory-<ngày>.md`: số bài, số mục mỗi sách, cờ đáp án mở cho giáo viên.
