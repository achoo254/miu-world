---
title: "Marketing tự chạy cho Miu World"
description: "GA4 phía server, trang SEO theo bài SGK, link mời bạn và thẻ khoe kết quả, rồi agent đăng clip theo lịch."
status: in-progress
priority: P1
effort: L
branch: main
tags: [marketing, seo, analytics, web, server]
blockedBy: []
blocks: []
created: 2026-10-12
---

# Marketing tự chạy cho Miu World

## Kết quả mong muốn

Người sở hữu không phải làm gì thường xuyên mà Miu World vẫn tự kéo người chơi: Google tìm thấy game qua từng bài SGK, người chơi tự mời bạn và khoe kết quả, và mọi bước đo được trên Google Analytics. Mục tiêu dài là 100 CCU (bối cảnh: `plans/dattqh/reports/marketing-261012-0906-miu-world-100-ccu.md`).

## Quyết định đã chốt (người sở hữu, 12/10/2026)

- GA4 **phía server** (Measurement Protocol): không script bên thứ ba, không cookie quảng cáo, sự kiện ẩn danh. Jev 0,98.
- Thứ tự: trang SEO và phần lan truyền trước, đăng clip sau khi người sở hữu cấp quyền tài khoản. Jev 0,91.
- Bước một lần trên tài khoản Google do AI điều khiển Chrome. Đã xong: property GA4 "Miu World" (`G-B8EPYEYBHY`, secret ở entry `analytics.google.com` / `miu-world production` của `access-tokens.json`); Search Console đã xác minh `https://miu.hoandat.com/` (miền `hoandat.com` đã xác minh từ trước).
- Người sở hữu đã xác nhận với Google rằng có thông báo quyền riêng tư cho việc thu thập: trang `/privacy` phải nói đúng điều này **trước khi** server gửi sự kiện đầu tiên.

## Không làm

- Không gắn `gtag.js` hay script, font, pixel bên thứ ba; không mở CSP.
- Không tự đăng vào nhóm Facebook/Zalo, không nhắn tin cho giáo viên hay phụ huynh (trái luật nền tảng).
- Không đưa tên hiển thị, email, id người chơi, nội dung thời khóa biểu vào sự kiện GA, link chia sẻ hay trang công khai.
- Không đưa đáp án quest vào trang công khai: trang bài chỉ đọc nội dung qua hàm chọn trường theo danh sách khóa cho phép; `pnpm security:dist` là lưới phụ.
- Không quảng cáo trả tiền.

## Các phase

| # | Phase | Tier | Trạng thái | Phụ thuộc |
|---|---|---|---|---|
| 1 | [Privacy và GA4 phía server](phase-01-privacy-and-server-analytics.md) | M | completed | — |
| 2 | [Trang SEO: giới thiệu, trang theo bài, sitemap, thẻ xem trước](phase-02-seo-surfaces.md) | L | completed | 1 (sự kiện xem trang) |
| 3 | [Lan truyền trong game: link mời bạn, thẻ khoe kết quả, tổng kết tuần](phase-03-share-loops.md) | L | completed | 1, 2 (trang khoe dùng thẻ theo bài) |
| 4 | [Release, nộp sitemap, liên kết GA và Search Console, tài liệu](phase-04-release-and-measurement.md) | S | completed | 1–3 |
| 5 | [Agent đăng clip theo lịch lên YouTube và Facebook](phase-05-scheduled-clip-posting.md) | L | blocked | 4; người sở hữu tạo kênh YouTube, Fanpage và cấp quyền một lần |

## Tiêu chí nghiệm thu chung

- `curl https://miu.hoandat.com/sitemap.xml` trả XML liệt kê trang giới thiệu và mọi trang bài; `robots.txt` thật; dán link trang chủ hay một trang bài vào trình kiểm tra thẻ xem trước thấy tiêu đề, mô tả, ảnh.
- Người chưa đăng nhập mở `/` thấy trang giới thiệu có nút "Chơi ngay", không bị đẩy thẳng sang `/login`.
- GA4 DebugView/Realtime nhận `page_view`, `sign_up`, `tutorial_complete` (quest đầu), `level_end` (quest xong), `share`, `invite_accepted`, `ccu_peak`; web chỉ gửi được `page_view` và `share`; không sự kiện nào mang email, tên, id người chơi, IP hay user agent; đọc theo nguồn đến qua Exploration với custom dimension.
- Server không gửi gì khi thiếu `GA4_MEASUREMENT_ID`/`GA4_API_SECRET` (dev, test, E2E).
- Link mời bạn (mã một lần, thu hồi được, hạn 7 ngày): người được mời đăng nhập, đồng ý, tạo nhân vật xong thì hai người thành bạn; thẻ khoe kết quả dán vào Zalo hiện ảnh bài học, không có tên bé.
- Gate `CLAUDE.md` đủ 5 lệnh, build web, E2E smoke, `security:dist` xanh; release qua cổng ảnh màn hình như thường lệ.

## Rủi ro

- Nghị định 147/2024 (game G1) vẫn là câu hỏi pháp lý để ngỏ; tự động mời người lạ làm rủi ro này lớn dần. Không chặn plan (người sở hữu đã chọn đi tiếp), ghi lại ở report.
- SEO domain mới lên chậm (vài tuần tới vài tháng); kỳ vọng 100 CCU trước giữa tháng 1/2027 chỉ từ kênh tự động là không chắc.
- Lời đồng ý nâng lên v4 bắt 2 tài khoản hiện có đồng ý lại một lần.
- Kiểm duyệt (xem báo cáo, giới hạn chat/giọng nói) vẫn tạm dừng trong khi người lạ vào được và có link mời; nên mở lại thành plan riêng sớm.

## Validation Log

Red-team (12/10/2026, agent code-reviewer, đối chiếu code ở `b0913ec9`): 3 blocker, 10 major, 12 minor; đã nhận và sửa vào phase 1–4:
- Token mời HMAC lộ id → mã ngẫu nhiên 128 bit, bảng `player_invites`, một lần, thu hồi được.
- Endpoint analytics không cần đăng nhập cho giả `ccu_peak`/`sign_up` và nhét PII → web chỉ gửi `page_view`, `share`; regex cho mọi tham số; `page_location` do server dựng.
- Đăng nhập Google luôn về `/` → cơ chế giữ đích trong `localStorage`, `next` theo danh sách cho phép.
- `setup` xóa env GA4; GA không nối phễu (thêm `session_id`, cặp id web gắn vào phiên trong bộ nhớ, custom dimension); privacy v4 sửa đủ các câu; cài GA (tắt Signals, ads, data sharing, giữ 2 tháng, không gửi IP); kết bạn qua `befriendByInvite` + sự kiện hub; ảnh OG vào build với URL tuyệt đối có version; trang bài tự chèn CSP; thẻ tuần theo dữ liệu có sẵn; `security:dist` là lưới phụ.
- Minor: `sign_up` chỉ lần đầu, `ccu_peak` theo đỉnh trong giờ, hàng đợi có giới hạn và gửi nốt khi SIGTERM, parser 4 KB mount trước, `/bai/` 404 thật, không canonical ở shell SPA, khối tĩnh trong `index.html`, `lastmod` theo hash nội dung, `release` kiểm robots/sitemap, thêm màn mới vào bộ ảnh, kiểm định env GA4, ảnh thẻ chụp bằng Playwright và so hash.

Quyết định qua Jev (`tools/decisions/jev-decide.py`):

| Câu hỏi | Chọn | Xác suất | Ghi chú |
|---|---|---|---|
| Kiểm duyệt so với link mời | Link một lần, thu hồi được + chặn/báo cáo; ghi lại, mở kiểm duyệt thành plan riêng | 0,56 (kiểm duyệt trước 0,43; bỏ tự kết bạn 0,01) | `escalate`, áp dụng theo lệ; báo người sở hữu |
| Thẻ tổng kết tuần | Phút chơi tuần + tổng bài/quest đã xong (dữ liệu có sẵn) | 0,99 | auto |
| GA (người sở hữu chốt) | GA4 phía server | Jev 0,98 | người sở hữu chọn |
| Thứ tự (người sở hữu chốt) | SEO + lan truyền, rồi clip | Jev 0,91 | người sở hữu chọn |
