---
phase: 4
title: "Release, cài GA, nộp sitemap, tài liệu"
status: completed
tier: S
dependsOn: [1, 2, 3]
---

# Phase 4 — Release và đo

## Mục tiêu

Đưa phase 1–3 lên production đúng quy trình, cài GA khớp lời hứa trong privacy, bật gửi sự kiện sau khi privacy mới đã lên, nối GA với Search Console.

## Các bước

1. Release theo `docs/deployment-guide.md` §5, §7: gate, commit, quét secret, push, CI xanh, chụp và duyệt ảnh từ cây sạch, `deploy.sh gate`, `release` (production: chỉ khi người sở hữu yêu cầu tường minh cho lần đó). Có migration `player_invites`: `release` tự backup DB trước.
2. nginx (`/bai/` 404, MIME `.webmanifest`): `deploy.sh setup` khi người cho phép; sau đó `nginx -t`, số pm2 online không đổi, `GA4_` vẫn còn trong env.
3. Chrome — GA4 "Miu World": **đã xong 12/10/2026** — Google Signals tắt, thu thập dữ liệu do người dùng cung cấp tắt, dữ liệu chi tiết thiết bị/vị trí tắt, cá nhân hóa quảng cáo 0/307 khu vực, giữ dữ liệu sự kiện và người dùng 2 tháng; chia sẻ dữ liệu cấp tài khoản `achoo254` tắt cả 4 mục (người sở hữu đồng ý tắt cho cả tài khoản). Còn lại: đăng ký custom dimension `source`, `medium`, `campaign`, `lesson_id`, `subject`, `content_type`; liên kết Search Console `https://miu.hoandat.com/`.
4. Sau khi bản có privacy v4 chạy: `deploy.sh analytics` rồi restart (thao tác ghi production, hỏi người nếu chưa có yêu cầu tường minh).
5. Chrome — Search Console: nộp `https://miu.hoandat.com/sitemap.xml`.
6. Nghiệm thu:
   - GA4 Realtime/DebugView thấy `page_view` của phiên kiểm; Exploration đọc được theo custom dimension (báo cáo Acquisition chuẩn có thể ra "(not set)" vì không có gtag — đã biết, không phải lỗi).
   - `curl` sitemap, robots, một trang bài, một đường dẫn lạ dưới `/bai/` (404); `og:image` trả 200 qua domain; dán link vào trình kiểm tra thẻ xem trước của Facebook.
   - Không sự kiện nào có tham số ngoài danh sách (kiểm bằng lệnh debug MP).
7. Tài liệu: `docs/system-architecture.md` (analytics, trang tĩnh, lời mời), `docs/deployment-guide.md` (env GA4, `deploy.sh analytics`, `setup` giữ GA4), `docs/project-roadmap.md`, trang review (SEO, analytics, lời mời; dependency mới: không có, nếu đúng vậy).

## Kết quả (12/10/2026)

- Release `459596aa` (cây export của `47a4eec9`): backup DB, migration `player_invites`, `healthy`, health qua domain OK.
- `setup`: `nginx -t` sạch, 9/9 tiến trình pm2 của dự án khác vẫn online, `/bai/` 404 thật và MIME `.webmanifest` đã vào, env giữ đủ dòng.
- `analytics` + restart: 2 dòng `GA4_`, log `usage analytics: sent to Google Analytics`, 0 dòng lỗi.
- Qua Cloudflare: `robots.txt`, `sitemap.xml` (73 địa chỉ), trang bài và trang môn 200, `/bai/<lạ>/` 404, `og:image` 200, chính sách v4.
- GA4 Realtime nhận `page_view` từ một lượt xem thật; 6 custom dimension đã đăng ký; GA đã liên kết Search Console `https://miu.hoandat.com/`.
- Người sở hữu nộp `sitemap.xml` trong Search Console (12/10/2026); Google đọc `robots.txt` và `sitemap.xml` lúc 14:53 (200). Googlebot chưa vào trang `/bai/` nào tại thời điểm ghi; thường mất vài ngày.
- Release sửa ghi chú nhỏ `0b595602` (CSS: viền nút ghost trong hộp thoại, thẻ sáng ở trang giới thiệu, căn giữa trang bài, chừa chỗ dưới nút "Quay lại game") lên production 16:02, health OK, 0 dòng lỗi.

## Kiểm

- Đầu ra thật của `release` (`healthy`, health qua domain), `REVISION`, 40 dòng journal, sha256 ảnh thẻ qua Cloudflare.
