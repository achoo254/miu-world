---
title: Plan mobile app iOS và Android
date: 2026-10-07
summary: "Lập plan Capacitor cho app iPhone/Android, phát hành công khai sau kiểm duyệt và pháp lý"
---

# Plan mobile app iOS và Android

## Việc đã làm
Lập plan `plans/dattqh/261007-2038-mobile-app-ios-android/` (7 pha, tier XL), thêm mục vào `docs/project-roadmap.md`.

## Quyết định
- Capacitor bọc đúng bundle `apps/web` (React + Three.js + Worker + WebRTC); không chọn React Native/Flutter (viết lại), không chọn WebView trỏ thẳng production (rủi ro Apple 4.2, Google chặn OAuth trong WebView).
- Origin app khác server nên cần gốc API/asset/WS cấu hình được; cookie SameSite=Lax không đi chéo site nên app dùng Bearer + vé WebSocket dùng một lần.
- Sign in with Apple bắt buộc (Guideline 4.8): thêm cột `apple_sub`, thu hồi token Apple khi xóa tài khoản.
- Bản build 488 MB: gói app chỉ có vỏ + Nhà của bé, map khác tải theo nhu cầu, đệm theo phiên bản.
- Người sở hữu chốt: tài khoản nhà phát triển cá nhân, bundle `com.hoandat.miuworld`, phát hành công khai khi xong.

## Bước tiếp
Người sở hữu đăng ký Apple Developer + Google Play; bước công khai chờ `moderation-safety` chạy trên production và xác nhận giấy phép game G1; bắt đầu pha 1 bằng `/ak:cook`.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
