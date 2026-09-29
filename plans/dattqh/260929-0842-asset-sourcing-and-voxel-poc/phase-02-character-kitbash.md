---
phase: 2
title: "Character Kitbash (Miu)"
status: pending
priority: P1
effort: "M"
dependencies: [1]
---

# Phase 2: Character Kitbash (Miu)

## Overview
Script build sinh `miu-cat.glb`: rig + 27 animation của Kenney Blocky Characters, gắn đầu mèo từ Kenney Cube Pets 2.0, thân tô màu bằng code. Đây là giả định rủi ro nhất của hướng "không tự vẽ" → phải chứng minh sớm; không đạt thì chuyển fallback dựng khối bằng code.

## Requirements
- Functional:
  - Input chỉ từ manifest: `kenney-blocky-characters/.../character-*.glb`, `kenney-cube-pets/.../animal-cat.glb`.
  - Output `assets/build/characters/miu-cat.glb` giữ node `head`, `torso`, `arm-left/right`, `leg-left/right` và toàn bộ animation (`idle`, `walk`, `sprint`, `pick-up`, `interact-*`, `emote-yes/no`…).
  - Đầu gốc bị thay bằng đầu mèo (kèm tai); đuôi mèo (`tail`) gắn vào `torso`.
  - Màu thân/quần áo nền: texture sinh bằng code (ô màu phẳng theo palette JSON), không vẽ tay.
  - Map 4 anim xem thử của M1.3: vẫy tay → `interact-right` hoặc `emote-yes`; nhảy, ngáp, vui mừng → tổ hợp/biến tốc từ anim có sẵn; ghi bảng map trong `characters.json`.
- Non-functional: ≤ 3 draw call cho nhân vật, ≤ 5k tris; build xác định (cùng input → cùng hash output).

## Architecture
`tools/assets/kitbash-character.ts` dùng `@gltf-transform/core` + `functions`:
1. Đọc 2 GLB; kiểm tra cấu trúc mesh của `animal-cat` (`body`, `Group`, `tail`, `leg-*`).
2. Tách phần đầu: nếu đầu nằm trong mesh riêng → lấy thẳng; nếu dính trong `body` → cắt primitive theo bounding box (vertex phía trên/trước ngưỡng Y/Z), tính lại index.
3. Scale + căn đầu vào pivot của node `head` Blocky; bỏ mesh đầu người.
4. Gộp texture (colormap Cube Pets + texture sinh) thành 1 atlas; 1 material.
5. Xuất GLB; `validate-character.ts` kiểm node, anim, tris, material.

Fallback C (nếu bước 2 không cho kết quả chấp nhận được): `box-character.ts` dựng hộp từ `characters.json` (kích thước, màu, pivot), vẫn dùng anim clone từ Blocky (vì cùng tên node).

## Related Code Files
- Create: `tools/assets/kitbash-character.ts`, `tools/assets/validate-character.ts`, `tools/assets/kitbash-character.test.ts`, `content/characters.json`, `assets/build/characters/miu-cat.glb`, `tools/assets/render-preview.ts` (ảnh PNG kiểm cảm quan bằng headless three.js/Playwright)

## Implementation Steps
1. Spike đọc cấu trúc mesh `animal-cat` (log node/primitive/bbox) → quyết định nhánh cắt hay lấy thẳng; ghi kết quả vào report phase.
2. Test trước: output có đủ node + anim list, tris ≤ 5k, 1 material.
3. Viết kitbash; render preview 4 góc + 1 frame mỗi anim ra PNG.
4. Người duyệt cảm quan preview (so với phong cách mock, không so pixel).
5. Không đạt → làm fallback C, lặp bước 2-4.

## Success Criteria
- [ ] `miu-cat.glb` chạy đủ anim trong three.js viewer, không vỡ mesh
- [ ] Test validate pass (node, anim, tris, material)
- [ ] Ảnh preview được người duyệt chấp nhận
- [ ] Bảng map 4 anim xem thử M1.3 trong `characters.json`

## Risk Assessment
- Đầu dính thân trong 1 mesh, cắt ra mặt hở. Tín hiệu: lỗ thủng trong preview. Xử lý: đóng mặt cắt bằng quad phẳng; vẫn xấu → fallback C.
- Tỉ lệ đầu thú vuông trên thân người lệch. Xử lý: scale đầu 1.2–1.6×, thân rút ngắn (chibi); chỉnh bằng tham số JSON.
- Anim không có "ngáp/nhảy" thật. Xử lý: chấp nhận thay thế gần nhất; ghi rõ trong map, báo lại spec M1.3.
