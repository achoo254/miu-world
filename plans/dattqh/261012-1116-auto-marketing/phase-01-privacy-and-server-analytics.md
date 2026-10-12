---
phase: 1
title: "Privacy và GA4 phía server"
status: completed
tier: M
dependsOn: []
---

# Phase 1 — Privacy và GA4 phía server

## Mục tiêu

Server gửi sự kiện ẩn danh tới GA4 bằng Measurement Protocol (MP); trang `/privacy` và lời đồng ý nói đúng việc đó. Không script bên thứ ba, không mở CSP.

## Yêu cầu

1. **Privacy và lời đồng ý v4** (`content/legal/privacy-vi.json`, `content/legal/consent-vi.json`; phiên bản khóa ở `packages/schema/src/content.test.ts`). Sửa mọi câu sẽ sai, không chỉ hai câu:
   - "Nói ngắn gọn": bỏ "không theo dõi"; nói có số liệu ẩn danh gửi Google Analytics.
   - "không có công cụ phân tích hay theo dõi của bên thứ ba… chỉ dùng một cookie đăng nhập": thêm mã ngẫu nhiên trong bộ nhớ trình duyệt (`localStorage`) dùng để đếm lượt, không cookie quảng cáo, trình duyệt không tải script Google.
   - "Ai khác tham gia": thêm Google Analytics (dịch vụ thứ ba); sửa "Ngoài hai dịch vụ trên"; sửa câu "không gửi gì về người chơi cho Google".
   - "Giữ bao lâu": số liệu ở Google Analytics giữ 2 tháng (cài ở GA, phase 4); dữ liệu trên máy chủ Miu vẫn 14 ngày.
   - "Kết bạn": thêm link mời bạn (phase 3).
   - Đưa phần đã hứa "ở lần cập nhật tới" (bạn bè, chặn, báo cáo, thời gian chơi, giọng nói) vào lời đồng ý v4.
   - Consent: sửa "Google chỉ tham gia lúc đăng nhập".
   - Ghi rõ: không gửi email, tên, id tài khoản, IP hay user agent của người chơi cho Google; vị trí Google suy ra là của máy chủ Miu.
   - Thêm `updatedOn`. Test regex trong `content.test.ts` cấm các cụm "không theo dõi", "hai dịch vụ", "chỉ tham gia lúc đăng nhập".
   - Nâng lời đồng ý lên `v4`; kiểm luồng đồng ý lại cho tài khoản cũ.
2. **Danh sách sự kiện (schema ở `packages/schema`), tách hai nguồn**:
   - Web được gửi: `page_view`, `share`. Mọi sự kiện khác chỉ server phát.
   - Server phát: `sign_up`, `tutorial_complete`, `level_end`, `invite_accepted`, `ccu_peak`.
   - Tham số và kiểm: `client_id` khớp `^\d{10}\.\d{10}$`; `session_id` số; `page_location` do **server** dựng từ một bảng route đã chuẩn hóa (`/`, `/login`, `/play`, `/home`, `/region/:id` với id trong danh mục, `/moi`, `/bai/<slug có thật>`, `/bai/toan-2`, `/bai/tieng-viet-2`, `/privacy`); route lạ thì bỏ cả sự kiện; `source`/`medium`/`campaign` khớp `^[a-z0-9._-]{1,40}$`; referrer chỉ giữ tên miền; `method`, `content_type` là enum; `lesson_id` phải có trong danh mục; `ccu` số nguyên ≥ 0. Tham số lạ bỏ. Mọi nhánh có unit test.
   - GA4 cần `session_id` và `engagement_time_msec` để có phiên và Realtime: web tạo `client_id` (lưu `localStorage`) và `session_id` (lưu `sessionStorage`, đổi sau 30 phút không hoạt động), gửi kèm mỗi request analytics.
3. **Gắn id web với sự kiện server**: web gửi `client_id`/`session_id` trong header riêng ở các request API; server giữ cặp này **trong bộ nhớ** theo phiên đăng nhập (không cột DB, không log) để `sign_up`, `level_end`… cùng một người dùng GA với `page_view`. Không có cặp hợp lệ thì server tự tạo mã ngẫu nhiên cho sự kiện đó.
4. **Module `apps/server/src/analytics/`**:
   - `ga4-forwarder.ts`: hàng đợi có giới hạn (1.000 sự kiện, đầy thì bỏ cũ nhất), gửi theo lô ≤ 25, timeout ngắn, gửi nốt khi nhận SIGTERM; lỗi chỉ log mã trạng thái, không log URL hay secret; không bao giờ làm chậm hay lỗi request người chơi. Không gửi `ip_override`, `user_agent`. Thiếu env thì không gửi gì. Có lệnh dev gửi một lô tới `/debug/mp/collect` để kiểm dạng sự kiện.
   - `analytics-routes.ts`: `POST /api/analytics/events`, không cần đăng nhập, kiểm Origin như mọi POST, parser JSON riêng 4 KB **mount trước** parser chung 32 KB (có test 413), rate limit theo IP, chỉ nhận sự kiện web, trả 204.
5. **Sự kiện phát từ server**:
   - `sign_up`: khi tài khoản chưa có dòng consent nào được chèn dòng đầu tiên (đồng ý lại v4 không tính); phát sau khi transaction commit.
   - `tutorial_complete`: lần đầu người chơi xong một quest (idempotent theo người chơi); `level_end` mỗi lần xong quest (`lesson_id`, `subject`).
   - `ccu_peak`: multiplayer hub giữ số người chơi thật (không bot, đếm theo `childId` không trùng) lớn nhất trong giờ; mỗi giờ gửi `ccu` rồi đặt lại.
6. **Web** `apps/web/src/analytics/`: `page_view` khi đổi route; lưu nguồn đến của lần vào đầu (`utm_*`, tên miền referrer) trong `sessionStorage`. Mọi truy cập storage bọc try/catch.
7. **Config và deploy**:
   - `GA4_MEASUREMENT_ID` (`^G-[A-Z0-9]{6,12}$`) và `GA4_API_SECRET` qua `emptyIsUnset`, phải đi cùng nhau như `CF_TURN_*`; `config.test.ts`.
   - `deploy.sh analytics` ghi hai dòng vào `/etc/miu/production.env` từ entry `analytics.google.com` / `miu-world production` qua ssh stdin, không in giá trị, in số dòng `GA4_` sau khi chạy.
   - `setup` **giữ lại** các dòng `GA4_*` đang có (`analytics_env`, đủ hai dòng hoặc không dòng nào), giống `turn_env`.
   - Staging không đặt (số liệu staging không lẫn production).

## Tệp

- Sửa: `content/legal/{privacy,consent}-vi.json`, `packages/schema/src/content.test.ts`, `packages/schema/src/` (schema sự kiện), `apps/server/src/{config,app,server}.ts`, `apps/server/src/config.test.ts`, `apps/server/src/player/player-routes.ts` (đồng ý), `apps/server/src/quest/quest-completion.ts`, `apps/server/src/multiplayer/multiplayer-hub.ts`, `apps/web/src/ui/app-shell.tsx`, `apps/web/src/ui/api-client.ts`, `tools/deploy/production/deploy.sh`, `docs/deployment-guide.md`, `docs/system-architecture.md`.
- Tạo: `apps/server/src/analytics/{ga4-forwarder,analytics-routes,analytics-session}.ts` cùng test; `apps/web/src/analytics/*.ts` cùng test.

## Kiểm

- Unit cho mọi nhánh lọc ở mục 2, hàng đợi và lô, không gửi khi thiếu env, lỗi mạng không ném ra, 413, Origin lạ, rate limit, `sign_up` không phát khi đồng ý lại.
- Test lời đồng ý v4 và luồng đồng ý lại; test regex privacy.
- Gate `CLAUDE.md` + build web + E2E smoke (luồng đồng ý đổi).

## Rủi ro và lùi

- Không gửi trước khi privacy mới lên: chỉ chạy `deploy.sh analytics` **sau** release có privacy v4. Lùi: xóa hai dòng env rồi restart (hỏi người).
