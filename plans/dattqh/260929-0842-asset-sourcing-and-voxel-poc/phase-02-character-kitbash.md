---
phase: 2
title: "Character Kitbash (Miu)"
status: completed
priority: P1
effort: "M"
dependencies: [1]
---

# Phase 2: Character Kitbash (Miu)

## Overview
Script build sinh `miu-cat.glb`: rig + 27 animation của Kenney Blocky Characters, gắn đầu mèo từ Kenney Cube Pets 2.0, thân tô màu bằng code. Đây là giả định rủi ro nhất của hướng "không tự vẽ": cấu trúc được chứng minh sớm bằng validate tự động; cảm quan được duyệt ở gallery cuối, bị từ chối thì chuyển fallback dựng khối bằng code.

## Requirements
- Functional:
  - Input chỉ từ manifest: `kenney-blocky-characters/.../character-*.glb`, `kenney-cube-pets/.../animal-cat.glb`.
  - Output `assets/build/characters/miu-cat.glb` giữ node `head`, `torso`, `arm-left/right`, `leg-left/right` và toàn bộ animation (`idle`, `walk`, `sprint`, `pick-up`, `interact-*`, `emote-yes/no`…).
  - Đầu gốc bị thay bằng **nguyên khối `body` của animal-cat** (kèm `Group` râu; đã kiểm: Cube Pets không có mesh đầu riêng, cả con là 1 khối mặt vẽ phía trước, 275 tris); bỏ 4 chân; `tail` gắn vào `torso`.
<!-- Updated: Validation Session 1 - dùng nguyên khối body, không cắt mesh -->
  - Màu thân/quần áo nền: texture sinh bằng code (ô màu phẳng theo palette JSON), không vẽ tay.
  - 4 anim xem thử của M1.3 (Blocky không có sẵn): dựng keyframe bằng code rồi ghi vào GLB — `wave` (xoay `arm-right` lên, lắc), `jump` (offset `root` + co chân), `yawn` (nghiêng `head` + giơ tay), `cheer` (hai tay lên + nảy). Định nghĩa track trong `content/animations/*.json`.
<!-- Updated: Validation Session 1 - 4 anim xem thử dựng keyframe bằng code -->
- Non-functional: ≤ 3 draw call cho nhân vật, ≤ 5k tris; build xác định (cùng input → cùng hash output).

## Architecture
`tools/assets/kitbash-character.ts` dùng `@gltf-transform/core` + `functions`:
1. Đọc 2 GLB; kiểm tra cấu trúc mesh của `animal-cat` (`body`, `Group`, `tail`, `leg-*`).
2. Lấy mesh `body` + `Group` của animal-cat (không cắt), bỏ 4 node `leg-*`.
3. Scale (~0.65, tham số JSON) + căn đáy khối vào pivot node `head` Blocky; bỏ mesh đầu người; gắn `tail` vào `torso`.
4. Gộp texture (colormap Cube Pets + texture sinh) thành 1 atlas; 1 material.
5. Thêm 4 clip keyframe (wave, jump, yawn, cheer) sinh từ `content/animations/*.json`.
6. Xuất GLB; `validate-character.ts` kiểm node, anim (27 gốc + 4 mới), tris, material.

Fallback C (nếu kết quả ghép bị từ chối ở duyệt cuối): `box-character.ts` dựng hộp từ `characters.json` (kích thước, màu, pivot), vẫn dùng anim clone từ Blocky (vì cùng tên node).

## Related Code Files
- Create: `content/animations/{wave,jump,yawn,cheer}.json`, `tools/assets/kitbash-character.ts`, `tools/assets/validate-character.ts`, `tools/assets/kitbash-character.test.ts`, `content/characters.json`, `assets/build/characters/miu-cat.glb`, `tools/assets/render-preview.ts` (ảnh PNG kiểm cảm quan bằng headless three.js/Playwright)

## Implementation Steps
1. Test trước: output có đủ node + 31 anim, tris ≤ 5k, 1 material; đầu không chồng lên torso (bbox).
2. Viết kitbash + 4 clip keyframe.
3. Render preview 4 góc + 1 frame mỗi anim ra PNG vào gallery duyệt cuối (`assets/build/review/`).
4. Người duyệt xem gallery một lần ở cuối (phase 6); bị từ chối → fallback C.

## Success Criteria
- [x] `miu-cat.glb` chạy đủ anim trong three.js viewer, không vỡ mesh
- [x] Test validate pass (node, anim, tris, material)
- [x] Ảnh preview có trong gallery duyệt cuối
- [x] 4 clip wave/jump/yawn/cheer chạy được trong viewer

## Risk Assessment
- Tỉ lệ đầu thú vuông trên thân người lệch. Xử lý: tham số JSON cho chiều rộng đầu = 1.2–1.6× đầu người gốc (scale khối mèo ~0.65–0.9), thân rút ngắn (chibi).
- Keyframe code trông cứng. Tín hiệu: bị chê ở duyệt cuối. Xử lý: chỉnh easing/biên độ trong JSON; không cần đổi spec M1.3.
