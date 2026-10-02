---
phase: 5
title: "Khu bài học tập 2 trên 8 map có sẵn"
status: pending
priority: P1
effort: "L"
dependencies: [2]
---

# Phase 5: Khu bài học tập 2 trên 8 map có sẵn

## Goal
Mỗi map có sẵn thêm các chương của tập 2 (phase 2), đặt trong các phòng và khu vừa dựng theo mock; không xê dịch khu bài học tập 1.

## Requirements
- `ZONES` của từng generator thêm zone cho chương mới, ưu tiên vùng có công trình chưa có bài: Lâu đài (thư viện, phòng ăn, tháp canh, hầm ngục), Nông trại (nhà kính, nhà kho, ao cá, vườn táo), Thư viện (khu máy tính, phòng sách quý, kho sách), Chợ (nhà lồng chợ), Trường học (phòng âm nhạc – mĩ thuật, thư viện trường), Xóm Mái Ấm (nhà Mẩy, chuồng), Làng Ven Sông (xưởng thủ công, quảng trường), Khu rừng (trại, chòi kiểm lâm).
- Zone đặt được trong nhà: kiểm `canStand` của `zone-map.ts` với sàn nâng (đang so độ cao với mặt đất của zone, sai lệch tối đa 1) và người dân trong nhà (`village-life.ts` chỉ đặt người ngoài trời) — sửa bộ dựng chung nếu cần để quest và người đứng được trong phòng (map Trường học báo không đặt được người trong lớp).
- Landmark trùng tên mỗi chỗ quest; chương mới có `chapterStart`, bến xe tới chương.
- `content/world/targets.json` + `looks.json`: mục tiêu mới của tập 2 (theo phase 7, 8) — phase này chuẩn bị chỗ.

## Validation
- Test của từng map xanh (khớp output sau khi sinh lại, đi tới mọi mục quest); E2E `sgk-content` (chương đầu và cuối mỗi vùng thấy chỗ đầu tiên).
- Ngân sách khung hình: E2E `play` (150 draw call, 150k tam giác ở mức cao).
