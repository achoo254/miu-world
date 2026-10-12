---
phase: 5
title: "Agent đăng clip theo lịch lên YouTube và Facebook"
status: blocked
tier: L
dependsOn: [4]
blockedBy: "Người sở hữu tạo kênh YouTube và Fanpage Facebook, cấp quyền API một lần"
---

# Phase 5 — Đăng clip theo lịch

## Mục tiêu

Mỗi tuần, không cần người, một clip ngắn cảnh chơi đúng bài SGK của tuần đó lên YouTube Shorts và Fanpage, dẫn về trang bài.

## Yêu cầu

1. **Quay clip bằng code**: dùng bộ render có sẵn (`tools/assets/render-preview.ts`, Playwright) dựng cảnh ở khu vực của quest thuộc bài, đi một vòng camera và vài thao tác, xuất 1080 × 1920, 15–30 giây, nhạc từ pack nhạc đã có license (`assets/packs/komiku-poupi`). Không có người chơi thật, không có tên thật.
2. **Chọn bài theo tuần học**: lịch học kỳ I (5/9 → giữa tháng 1) ánh xạ tuần → bài Toán 2, Tiếng Việt 2; mỗi tuần một clip mỗi môn, không lặp bài đã đăng (`content-variety-no-repeats`).
3. **Đăng qua API chính thức**: YouTube Data API v3 (upload, `#Shorts`, mô tả có link trang bài kèm UTM `source=youtube`); Facebook Graph API đăng video lên **Fanpage "Miu World"** (UTM `source=facebook`) bằng Page access token. Token lưu ở `access-tokens.json`, đọc lúc chạy, không in. TikTok để sau (cần TikTok duyệt ứng dụng).
4. **Chạy theo lịch**: routine cloud hằng tuần (skill `schedule`), hoặc timer trên máy dev nếu routine không có quyền đọc credential; mỗi lần chạy ghi báo cáo ngắn (bài đã đăng, link, số liệu GA tuần trước) vào `plans/dattqh/reports/`.

## Ràng buộc của người sở hữu về Facebook (12/10/2026)

Người sở hữu chỉ có một tài khoản Facebook cá nhân và không muốn bất kỳ bài marketing nào lên tường cá nhân hay bảng tin bạn bè.
- Không bao giờ đăng lên trang cá nhân, không dùng token người dùng để đăng, không tự mời bạn bè của người sở hữu thích Fanpage hay vào nhóm, không nhắn tin cho ai.
- Chỉ đăng lên Fanpage riêng "Miu World" (tài khoản cá nhân chỉ là quản trị ẩn; bài chỉ tới người theo dõi Fanpage). Code đăng kiểm `id` đích là Page id đã cấu hình, khác thì dừng.
- Không đăng vào Group: Meta đã gỡ API đăng vào nhóm (2024); tự động hóa bằng trình duyệt với tài khoản cá nhân trái điều khoản và dễ bị khóa. Người sở hữu muốn có nhóm cộng đồng thì tạo nhóm do Fanpage làm chủ và đăng tay.

## Việc của người sở hữu (một lần)

- Tạo kênh YouTube và Fanpage "Miu World" (Fanpage tách khỏi trang cá nhân, không mời bạn bè); cấp quyền OAuth cho ứng dụng đăng chỉ với quyền của Page (AI điều khiển Chrome hộ, người bấm đồng ý điều khoản).

## Kiểm

- Chạy khô (không đăng) sinh clip, caption đúng bài; một lần đăng thật được người sở hữu xem trước khi bật lịch.
