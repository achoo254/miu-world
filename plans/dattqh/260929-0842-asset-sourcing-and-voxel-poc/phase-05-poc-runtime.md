---
phase: 5
title: "POC Runtime (three.js)"
status: pending
priority: P1
effort: "L"
dependencies: [2, 3, 4]
---

# Phase 5: POC Runtime (three.js)

## Overview
App POC độc lập (Vite + TypeScript + three.js, WebGL2) render Khu rừng chương 1 với Miu ghép, 1 NPC vẹt và props — chỉ dùng asset trong manifest — kèm overlay đo draw call, tris, FPS. Đây là task #6 của Master Plan (POC voxel).

## Requirements
- Functional:
  - Greedy meshing chunk trong Web Worker; 1 material + atlas; culling theo chunk; fog giới hạn tầm nhìn.
  - Third-person: WASD + joystick cảm ứng tối giản; nút Chạy; camera follow, không xuyên khối (raycast lưới).
  - Va chạm AABB theo lưới block (tự viết), trọng lực, bước lên 1 block.
  - Load `miu-cat.glb` + phụ kiện; anim idle/walk/sprint theo vận tốc.
  - NPC vẹt (`animal-parrot`) có anim idle; vùng tương tác hiện nhãn khi lại gần.
  - Props chỉ từ Kenney (Nature/Survival/Castle/Food Kit: rương, đèn lồng, hàng rào, cầu, nấm, táo) theo `entities.json`.
<!-- Updated: Validation Session 1 - POC chỉ Kenney, gallery duyệt cuối, đo bằng giả lập -->
  - Nước: shader đơn giản (sóng UV); bầu trời: three.js `Sky` hoặc gradient.
  - Overlay: `renderer.info` (calls, triangles), FPS trung bình 1s và p5; tham số `?quality=low|mid|high` (tầm nhìn, pixel ratio, bóng).
  - Runtime loader từ chối URL asset không có trong `manifest.json`.
  - Trang `review.html`: gallery duyệt cuối (preview nhân vật, phụ kiện, bản đồ, 4 anim, bảng license, số liệu hiệu năng) + link vào POC chơi thử.
- Non-functional: mục tiêu khởi điểm §12 Master Plan: ≤150 draw call, ≤150k tris, tải vùng đầu ≤ 8 MB nén; CSP không cần `unsafe-eval` (không dùng Rapier).

## Architecture
```
apps/poc-voxel
 ├─ main.ts ─ scene, loop, quality
 ├─ world/ chunk-store ─▶ mesher.worker (greedy) ─▶ chunk meshes
 ├─ player/ controller (AABB grid) + camera-rig + input (keyboard, joystick)
 ├─ entities/ npc, props (GLTFLoader qua asset-loader có kiểm manifest)
 └─ debug/ stats-overlay
packages/voxel: chunk-format, greedy-mesher (thuần TS, test được ngoài browser)
```

## Related Code Files
- Create: `apps/poc-voxel/**` (gồm `review.html`, `e2e/perf.spec.ts`), `packages/voxel/src/greedy-mesher.ts`, `packages/voxel/src/greedy-mesher.test.ts`, `packages/voxel/src/grid-collision.ts`, `packages/voxel/src/grid-collision.test.ts`, `apps/poc-voxel/src/asset-loader.ts`, `apps/poc-voxel/e2e/poc.spec.ts` (Playwright)

## Implementation Steps
1. Test trước cho mesher (khối 2×2×2 đặc → 6 quad; mặt kề nhau bị bỏ) và grid collision (đâm tường dừng, bước lên 1 block, không xuyên trần).
2. Viết mesher + collision trong `packages/voxel`.
3. Dựng app: loader có kiểm manifest, worker mesher, scene, player, camera, NPC, props, nước, sky, overlay.
4. E2E Playwright: trang tải không lỗi console; overlay báo calls ≤150, tris ≤150k; request mạng chỉ tới origin (không hotlink).
5. Perf test tự động: Chromium + CDP `Emulation.setCPUThrottlingRate` (4× và 6×), viewport mobile, `?quality=low|mid|high`; chạy 60s theo đường đi cố định, ghi FPS trung bình/p5, calls, tris, thời gian tải vào `assets/build/review/perf.json`.
6. Build production; đo dung lượng tải vùng đầu; dựng `review.html`.

## Success Criteria
- [ ] Unit test mesher + collision pass; `tsc --noEmit` + eslint sạch
- [ ] E2E pass (không lỗi console, ngân sách desktop, không request ngoài origin)
- [ ] Đi lại, chạy, va chạm, camera không xuyên khối trên desktop
- [ ] NPC vẹt + ≥3 props hiển thị, nhãn tương tác hiện khi lại gần
- [ ] Dung lượng tải vùng đầu ≤ 8 MB (ghi số thực)
- [ ] `perf.json` có số liệu 2 mức throttle × 3 mức chất lượng
- [ ] `review.html` đủ mục cho duyệt cuối

## Risk Assessment
- Mesh GLB props nhiều draw call. Tín hiệu: overlay > 150. Xử lý: gộp props tĩnh bằng `mergeGeometries`/instancing.
- Worker không chạy trên trình duyệt cũ. Xử lý: fallback mesher trên main thread lúc tải (không trong khung hình).
- Không kịp cảm giác điều khiển tốt: không phải mục tiêu POC; ghi nhận cho task #13.
