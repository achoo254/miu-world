---
phase: 6
title: "Visual chibi + palette"
status: pending
priority: P1
effort: "M"
dependencies: [1]
---

# Phase 6: Visual chibi + palette (VISUAL-01..03, task #9, #12)

## Overview
Thực hiện quyết định §15 #12–#14: chỉnh Miu theo chibi voxel (đầu/mặt/tỷ lệ/silhouette), phụ kiện theo tỷ lệ mới, palette + texture block đồng nhất. Chưa có mock voxel làm đích nên sinh **3 biến thể** để người duyệt chọn một lần ở phase 8. Giữ kiến trúc: kitbash 1 skinned draw call, phụ kiện từ JSON, atlas tint theo palette. Chạy song song với phase 2–5.

## Requirements
- Chỉ chạm: `content/`, `tools/assets/`, `assets/generated/` (qua script), `apps/poc-voxel/src/review/`, `apps/poc-voxel/review.html`.
- Nhân vật (`tools/assets/kitbash-character.ts`, `content/characters.json`):
  - Thêm tham số tỷ lệ vào spec Zod: `headScale` (đã có), `torsoScale`, `limbScale` (dài chân/tay), `headOffset`; mặc định giữ nguyên hình hiện tại để test cũ không đổi.
  - 3 biến thể `miu-cat-chibi-a|b|c` (đầu ≈ 1.0 / 1.15 / 1.3 so với thân, thân + chân ngắn dần); mặt rõ hơn bằng khối mắt/má/mũi mô tả trong JSON (`content/faces/*.json`, tách khỏi `content/accessories/` để API nhân vật không cho "mặc" mặt) gắn node `head`, dùng lại cơ chế phụ kiện voxel; không vẽ hay sinh texture mặt mới. Để giữ 1 draw call/nhân vật, khối mặt được gộp vào mesh nhân vật lúc kitbash (không phải phụ kiện rời).
<!-- Updated: Validation Session 1 - mặt bằng khối voxel từ JSON -->
  - Ngân sách: 1 draw call/biến thể, ≤ 5k tam giác, đủ 31 anim (validator hiện có).
- Phụ kiện (`content/accessories/*.json`): mũ phù thủy, balo co theo tỷ lệ từng biến thể (hệ số scale theo `characterId`, không nhân bản file).
- Palette (`content/palette.json`, `content/blocks.json`): pastel ấm cho cỏ, đất, đá, gỗ, lá, nước, lối đi; atlas sinh lại; bản đồ render lại (không đổi generator/chunk).
- Trang review: mục "Chọn biến thể Miu" hiển thị 3 biến thể cạnh nhau (4 góc + 4 anim xem thử) và palette mới trước/sau; người duyệt chọn trong form kết quả duyệt hiện có.
- Sau khi người duyệt chọn (phase 8): biến thể được chọn thành `miu-cat`, 2 biến thể còn lại xóa khỏi `content/` và manifest.

## Implementation Steps
1. Test trước: spec mới parse đúng; mặc định tạo glb byte-giống bản cũ (so hash); mỗi biến thể qua validator (node, anim, tris, draw call).
2. Mở rộng kitbash + khối mặt; thêm 3 biến thể; hệ số phụ kiện.
3. Palette + atlas; `pnpm assets:atlas`, `pnpm world:forest`, `pnpm assets:character`, `pnpm assets:preview`, `pnpm assets:manifest`.
4. Cập nhật review gallery.

## Success Criteria
- [ ] 3 biến thể qua validator; `pnpm assets:check` xanh; build xác định (chạy lại → cùng hash)
- [ ] Review gallery hiển thị biến thể + palette trước/sau
- [ ] Không file nào ngoài danh sách "Chỉ chạm" bị sửa

## Risk Assessment
- Không có đích visual → chọn vẫn chưa đạt. Xử lý: form review cho phép "Chỉnh thêm" kèm ghi chú; lặp tối đa một vòng trước khi chốt.
- Đầu to che camera third-person. Xử lý: kiểm ảnh preview góc camera gameplay trong gallery.
