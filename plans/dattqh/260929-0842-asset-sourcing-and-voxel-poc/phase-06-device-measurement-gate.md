---
phase: 6
title: "Device Measurement + Go/No-Go Gate"
status: pending
priority: P1
effort: "S"
dependencies: [5]
---

# Phase 6: Device Measurement + Go/No-Go Gate

## Overview
Đo POC trên máy thật, người duyệt cảm quan asset, rồi chốt gate: tiếp tục hướng "asset CC0 + sinh bằng code" hay điều chỉnh. Kết quả ghi vào report và cập nhật Master Plan v3.

## Requirements
- Functional:
  - Build + serve trên LAN (HTTPS nếu cần cho cảm biến; dùng port cố định, tắt server sau khi đo).
  - Đo trên ≥2 Android tầm trung + 1 iPhone đời cũ ở 3 mức chất lượng: FPS trung bình, p5, draw call, tris, thời gian tải, nhiệt độ/hao pin sau 15 phút (người đo).
  - Người duyệt cảm quan: Miu ghép, phụ kiện, NPC, bản đồ — chấp nhận / chỉnh / đổi fallback.
- Non-functional: số liệu ghi thực, không ước lượng.

## Related Code Files
- Create: `plans/dattqh/reports/poc-device-measurement-<date>.md`
- Modify: `Miu World — Master Development Plan v3 (3D theo mockup + Multiplayer).md` (mục 10, 12, 15 theo kết quả)

## Implementation Steps
1. CC chuẩn bị bảng đo + hướng dẫn đọc overlay; build bản đo.
2. Người đo điền số liệu; CC tổng hợp, so với ngân sách §12.
3. Họp gate: chốt ngân sách chính thức, mức chất lượng mặc định theo thiết bị, và quyết định asset (giữ / chỉnh / fallback).
4. Cập nhật Master Plan v3.

## Success Criteria
- [ ] Report có số liệu thật từ 3 máy × 3 mức chất lượng
- [ ] Quyết định gate ghi rõ trong Master Plan v3 §15
- [ ] Các process dev server đã tắt

## Risk Assessment
- Không đạt 30 FPS trên Android tầm trung. Xử lý đã định: giảm tầm nhìn/pixel ratio, gộp props; vẫn không đạt → replan phạm vi hình ảnh trước khi sang task #9+.
