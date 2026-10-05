---
title: "Mọi lứa tuổi, PIN tùy chọn và plan một người chơi"
date: 2026-10-05
summary: Đổi định hướng sang game mọi lứa tuổi; PIN tài khoản tùy chọn; plan mỗi tài khoản một người chơi
---

# Mọi lứa tuổi, PIN tùy chọn và plan một người chơi

## Chuyện gì xảy ra
Người sở hữu (05/10/2026): game cho mọi lứa tuổi, online kiểu Minecraft, sau này có mobile app; không cần phụ huynh giám sát, phụ huynh tự chịu trách nhiệm. Ghi vào `.claude/rules/product-audience.md`, `CLAUDE.md`, `docs/project-overview-pdr.md`.

## Đã làm
- PIN tài khoản tùy chọn: không PIN thì cổng luôn mở; đặt, đổi, gỡ khi cổng mở (`apps/server/src/auth/auth-routes.ts`, `auth-context.ts`).
- Chữ trung tính (Đăng nhập, Tôi đồng ý, Quản lý tài khoản, hồ sơ người chơi); không PIN thì nút "Xong, vào chơi" thay vì khóa.
- Trang quyền riêng tư cập nhật (đồng ý vẫn v2); xóa ảnh review `02-set-pin.png`, sinh lại manifest.
- Review + Jev: `plans/dattqh/reports/jev-261005-0949-all-ages-account.md`.

## Quyết định
Jev chọn plan một người chơi mỗi tài khoản (rủi ro cao, áp theo quy ước); tên vẫn chọn từ danh sách; giữ 3 người chơi; không hỏi tuổi ở đồng ý v3 (độ tin 0.42, chờ người sở hữu xác nhận).

## Tiếp theo
Duyệt `plans/dattqh/261005-0949-single-player-account/plan.md`; chạy E2E khi người yêu cầu (đã sửa `account-flow`, `mvp-loop`, `worksheets` nhưng chưa chạy).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
