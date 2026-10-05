---
title: Mỗi tài khoản một người chơi
date: 2026-10-05
summary: "Người đăng nhập là người chơi chính, người chơi phụ cho máy dùng chung, đồng ý v3"
---

# Mỗi tài khoản một người chơi

## Chuyện gì xảy ra
Thi công plan `plans/dattqh/261005-0949-single-player-account/`: người đăng nhập Google là người chơi chính (tạo cùng transaction với việc đồng ý chính sách), tối đa 2 người chơi phụ, `/api/players`, `PlayerDto`, `MeResponse.players`, đồng ý v3. Bảng giữ tên cũ (`parents`, `child_profiles`), thêm `is_primary` + chỉ mục duy nhất từng phần + backfill.

## Review
Review độc lập: 0 lỗi nghiêm trọng; sửa 4 điểm trung bình (transaction đồng ý + người chơi chính, web dùng `players` để không hiện màn chọn khi một người chơi, nút giao máy về màn chọn, test migration).

## Còn lại
- E2E đã sửa theo luồng mới nhưng chưa chạy.
- Test `quest-routes` "shipped forest chapter 1" và `quest-progress.test.ts` hỏng từ trước (cơ chế trùm của phiên khác vi phạm luật ≥ 2 cơ chế); `boss-than-rung` chuyển draft vì trùng chương 1 khu rừng.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
