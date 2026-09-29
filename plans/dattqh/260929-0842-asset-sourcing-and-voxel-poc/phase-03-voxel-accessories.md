---
phase: 3
title: "Voxel Accessories from JSON"
status: completed
priority: P2
effort: "S"
dependencies: [2]
---

# Phase 3: Voxel Accessories from JSON

## Overview
Sinh phụ kiện trang phục (mũ phù thủy hồng, balo) dạng khối từ JSON, gắn vào node `head`/`torso` của Miu. Chứng minh trang phục đổi được lúc chạy mà không cần artist.

## Requirements
- Functional:
  - Schema `accessory`: id, slot (`hat|back|wings|glasses|scarf`), attachNode, danh sách khối `{x,y,z,w,h,d,color}` hoặc lưới voxel nhỏ, palette, offset/scale.
  - `voxel-accessory.ts` chuyển JSON → mesh gộp (bỏ mặt trong), vertex color, 1 material.
  - POC: `hat-witch-pink`, `backpack-brown`; biến thể màu bằng đổi palette.
- Non-functional: mỗi phụ kiện ≤ 1 draw call, ≤ 1.5k tris; schema validate bằng Zod.

## Architecture
`content/accessories/*.json` → (Zod) → `buildAccessoryMesh()` (dùng chung bộ culling mặt với mesher của phase 4 nếu cùng dạng lưới) → gắn runtime vào bone/node.

## Related Code Files
- Create: `packages/voxel/src/accessory-schema.ts`, `packages/voxel/src/voxel-accessory.ts`, `packages/voxel/src/voxel-accessory.test.ts`, `content/accessories/hat-witch-pink.json`, `content/accessories/backpack-brown.json`

## Implementation Steps
1. Test: JSON hợp lệ → số mặt đúng (khối 2×1×1 → 10 mặt); JSON sai → Zod lỗi.
2. Viết schema + builder.
3. Soạn 2 phụ kiện bằng khối (mũ nón xếp tầng + vành, balo hộp + nắp).
4. Render preview cùng Miu (dùng `render-preview.ts` phase 2) vào gallery duyệt cuối.
<!-- Updated: Validation Session 1 - duyệt gộp một lần cuối -->

## Success Criteria
- [x] Test pass; 2 phụ kiện gắn đúng khi chạy anim walk
- [x] Đổi palette tạo biến thể không cần sửa code
- [x] Preview có trong gallery duyệt cuối

## Risk Assessment
- Mũ nhìn thô. Xử lý: tăng độ phân giải lưới (khối 1/8), thêm chi tiết sao bằng khối vàng; vẫn thô → ghi nhận, dùng mũ đơn giản cho MVP.
