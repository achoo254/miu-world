---
phase: 2
title: "Chốt bản đồ bài và kịch bản chủ điểm"
status: pending
priority: P1
effort: "M"
dependencies: [1]
---

# Phase 2: Chốt bản đồ bài và kịch bản chủ điểm

## Goal
Mỗi bài tập 2 có map, khu (chương), chỗ cụ thể (landmark trùng tên, phòng đi vào được) và nhân vật dẫn; mỗi map khoảng 16 bài tính cả tập 1 (±2).

## Đầu vào
- Bảng nháp [`story-map.md`](story-map.md) (Jev E1: theo chủ đề, cân số bài).
- Map và phòng đã dựng theo mock: `content/world/mock-views/<map>.json` (landmark), báo cáo `plans/dattqh/reports/map-*-261002-detail-mocks.md`.
- `content/world/regions.json` (nhân vật dẫn đường, `book`), `story-map.md` của tập 1 (`plans/dattqh/260930-0846-sgk-lop2-game-content/story-map.md`).

## Requirements
- Xem lại từng bài theo nội dung kiểm kê (phase 1): bối cảnh hợp, phòng hay khu ngoài trời dùng được, trò chơi mới nào (phase 3).
- Mỗi map thêm chương mới cho tập 2 (chương tiếp số chương tập 1 của map đó); mỗi chương 2–5 bài; tên chương theo chủ điểm.
- Mỗi chỗ quest có landmark cùng tên (bộ xếp quest `placeNamed` đặt mục quanh landmark trong vòng 10 khối).
- Kịch bản chủ điểm: một mạch truyện nối các bài của map (ví dụ Đảo bí ẩn: từ bến tàu tới kho báu; Nông trại: một mùa thu hoạch).
- Câu hỏi thật sự mở (đổi map của một chủ điểm, đổi `ZONES` có sẵn) gửi Jev (`tools/decisions/jev-decide.py`), ghi report.

## Ra
- `story-map.md` chốt (bảng bài → map → chương → chỗ → nhân vật → trò chơi), `content/world/regions.json` cập nhật `book` từng map.
- Không sửa quest tập 1.

## Validation
- Kiểm: 39 bài Toán, 32 bài Tiếng Việt, mỗi bài một lần; số bài mỗi map trong khoảng 14–18.
