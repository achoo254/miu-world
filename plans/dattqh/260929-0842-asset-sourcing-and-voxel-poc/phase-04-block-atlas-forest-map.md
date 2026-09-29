---
phase: 4
title: "Block Atlas + Forest Map Data"
status: pending
priority: P1
effort: "M"
dependencies: [1]
---

# Phase 4: Block Atlas + Forest Map Data

## Overview
Gộp texture block từ Kenney Voxel Pack thành 1 atlas, định nghĩa bảng block, và sinh dữ liệu bản đồ nhỏ Khu rừng bí mật (chương 1) bằng code: địa hình, suối, cây, cầu gỗ, lối đá — không vẽ tay.

## Requirements
- Functional:
  - `blocks.json`: id số, tên, texture từng mặt (top/side/bottom), cờ solid/transparent/liquid.
  - `build-atlas.ts`: chọn tile từ manifest → atlas PNG (padding 2px chống bleeding, kích thước 2^n) + UV map JSON; KTX2 để phase sau (ghi TODO trong Master Plan task #21).
  - `generate-forest-map.ts`: bản đồ ~96×32×96 block; heightmap noise có seed cố định; suối chạy ngang; cây dựng từ template khối (thân gỗ + tán lá); cầu gỗ qua suối; khu đặt NPC, rương, cây cổ thụ. Output chunk 16³ nén (RLE) + `entities.json` (spawn, NPC vẹt, rương, cây cổ thụ).
- Non-functional: map xác định theo seed; dữ liệu nén ≤ 1 MB; không block/texture nào ngoài manifest.

## Architecture
```
manifest ─▶ build-atlas ─▶ atlas.png + atlas.json
blocks.json ─┐
seed ────────┴▶ generate-forest-map ─▶ chunks.bin (RLE) + entities.json
```

## Related Code Files
- Create: `content/blocks.json`, `tools/assets/build-atlas.ts`, `tools/world/generate-forest-map.ts`, `tools/world/structures/*.ts` (tree, bridge, path), `packages/voxel/src/chunk-format.ts`, `packages/voxel/src/chunk-format.test.ts`, `assets/build/world/forest-ch1/{chunks.bin,entities.json}`, `assets/build/atlas/{atlas.png,atlas.json}`

## Implementation Steps
1. Test chunk format: encode/decode RLE khứ hồi bằng nhau; index (x,y,z) đúng biên chunk.
2. Chọn tile Voxel Pack (cỏ, đất, đá, gỗ, lá, cát, ván, nước); tint về bảng màu chung bằng script (`content/palette.json`); build atlas.
<!-- Updated: Validation Session 1 - Voxel Pack tint theo palette trước, texture code chỉ là fallback -->
3. Viết generator + structures; seed cố định.
4. Render ảnh top-down/isometric bằng script vào gallery duyệt cuối.

## Success Criteria
- [ ] Test chunk format pass
- [ ] Atlas không bleeding ở mip thấp (kiểm ảnh)
- [ ] Map có suối, cầu, cây, lối đi, vị trí NPC/rương/cây cổ thụ theo `entities.json`
- [ ] `chunks.bin` ≤ 1 MB

## Risk Assessment
- Texture Voxel Pack (2015) trông cũ/lệch palette. Tín hiệu: bị chê ở duyệt cuối. Xử lý: tint theo palette bằng script; nếu vẫn lệch → texture block sinh bằng code (noise + palette), vẫn không vẽ tay.
