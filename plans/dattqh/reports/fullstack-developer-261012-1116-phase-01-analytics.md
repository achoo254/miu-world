# Phase 1 — Privacy v4 và GA4 phía server: báo cáo thực hiện

Plan: `plans/dattqh/261012-1116-auto-marketing/` · Phase: `phase-01-privacy-and-server-analytics.md` · Trạng thái: xong phần code và test đơn vị; chưa chạy E2E smoke và gate đầy đủ (bộ điều phối giữ lại việc này).

## Kết quả

- **Privacy và lời đồng ý v4**: `content/legal/consent-vi.json` lên `v4`, thêm `updatedOn` (schema `ConsentDocument` có `updatedOn` tùy chọn). Lời đồng ý thêm Google Analytics (ẩn danh, mã ngẫu nhiên trong trình duyệt, không email/tên/mã tài khoản/IP/user agent, giữ 2 tháng, không script Google, không cookie quảng cáo) và đưa vào phần đã hứa: bạn bè, lời mời, link mời bạn, chặn, báo cáo, thời gian chơi tuần, giọng nói. `privacy-vi.json`: sửa "Nói ngắn gọn" (bỏ "không theo dõi"), đoạn cookie (thêm `localStorage`/`sessionStorage`), "Ai khác tham gia" (Google Analytics, bỏ "hai dịch vụ", bỏ câu "không gửi gì cho Google"), "Giữ bao lâu" (GA 2 tháng, máy chủ vẫn 14 ngày), "Kết bạn" (link mời), "Rút lại đồng ý", "Về chính sách này"; thêm mục mới "Số liệu sử dụng ẩn danh" (liệt kê từng sự kiện, vị trí Google suy ra là của máy chủ). Test regex cấm "không theo dõi", "hai dịch vụ", "chỉ tham gia lúc đăng nhập", "lần cập nhật tới" trên cả hai văn bản.
- **Đồng ý lại**: tài khoản đã đồng ý v3 bị chặn chơi (`consent-required`) cho tới khi đồng ý v4; giữ nguyên người chơi. `sign_up` chỉ phát khi tài khoản chưa có dòng consent nào (kiểm dưới khóa tài khoản), sau khi transaction commit.
- **Schema** `packages/schema/src/analytics.ts`: hai danh sách sự kiện (web: `page_view`, `share`; server: `sign_up`, `tutorial_complete`, `level_end`, `invite_accepted`, `ccu_peak`), regex `client_id`, `session_id` số, nhãn `source/medium/campaign`, referrer chỉ tên miền (không nhận IP), enum `method`/`content_type`, `lesson_id` trong danh mục, bảng route chuẩn hóa dựng `page_location` (`/moi/<mã>` thành `/moi`, route lạ bỏ cả sự kiện), header `x-miu-ga`.
- **Server** `apps/server/src/analytics/`: `ga4-forwarder.ts` (hàng đợi 1.000 bỏ cũ nhất, lô ≤ 25 sự kiện mỗi `client_id`, timeout 2 s, gửi nốt khi SIGTERM, `consent` ads DENIED, không `ip_override`/`user_agent`, lỗi chỉ log mã trạng thái hoặc tên lớp lỗi, không gửi khi thiếu env, `validate()` tới `/debug/mp/collect`); `analytics-routes.ts` (`POST /api/analytics/events`, không cần đăng nhập, Origin như mọi POST, parser 4 KB mount trước parser 32 KB, rate limit theo IP 60/phút qua `config.analyticsLimitPerMinute`, 204; sự kiện server hay body sai trả 400; route lạ bỏ im lặng 204); `analytics-session.ts` (cặp id web theo phiên đăng nhập trong bộ nhớ, tối đa 10.000 phiên, quên sau 30 phút); `server-events.ts` (`sign_up`, `tutorial_complete` + `level_end` với `lesson_id`, `subject` từ danh mục, `ccu_peak`; không có cặp hợp lệ thì tự tạo id ngẫu nhiên); `ga4-debug.ts` (lệnh dev kiểm dạng sự kiện).
- **Hub**: `playersOnline()` đếm `childId` không trùng (không bạn máy), `takePeakPlayers()` trả đỉnh rồi đặt lại bằng số đang online; `server.ts` gửi `ccu_peak` mỗi giờ khi có GA4.
- **Web** `apps/web/src/analytics/`: `client_id` trong `localStorage`, `session_id` trong `sessionStorage` (đổi sau 30 phút không hoạt động), nguồn đến lần đầu (`utm_*`, tên miền referrer) trong `sessionStorage`, mọi truy cập storage bọc try/catch; `page_view` khi route đứng yên 400 ms (redirect chỉ tính trang đích); `trackShare` sẵn cho phase 3; `api()` gửi header `x-miu-ga` ở mọi request.
- **Config/deploy**: `GA4_MEASUREMENT_ID` (`^G-[A-Z0-9]{6,12}$`) + `GA4_API_SECRET` qua `emptyIsUnset`, phải đi cùng nhau, lỗi không in secret. `deploy.sh analytics` ghi hai dòng từ entry `analytics.google.com` / `miu-world production` (`token.measurement_id`, `token.api_secret`) qua ssh stdin, in số dòng `GA4_`; `setup` giữ lại dòng `GA4_*` đang có (đủ một cặp hoặc không dòng nào, khác thì dừng). Không chạy deploy.sh lên máy nào.
- **Tài liệu**: `docs/deployment-guide.md` (§2.2 entry, lệnh `analytics`, thứ tự sau release privacy v4, lệnh kiểm dạng, lùi), `docs/system-architecture.md` (ranh giới, sổ quyết định, mục bảo mật).

## Tệp

Sửa: `content/legal/{consent,privacy}-vi.json`, `packages/schema/src/{content,content.test}.ts`, `apps/server/src/{config,config.test,app,server}.ts`, `apps/server/src/player/{player-routes,player-routes.test}.ts`, `apps/server/src/quest/quest-completion.ts`, `apps/server/src/multiplayer/{multiplayer-hub,multiplayer-hub.test}.ts`, `apps/web/src/ui/{app-shell.tsx,api-client.ts}`, `tools/deploy/production/deploy.sh`, `docs/{deployment-guide,system-architecture}.md`.
Tạo: `packages/schema/src/analytics{,.test}.ts`, `apps/server/src/analytics/{ga4-forwarder,analytics-routes,analytics-session,server-events}{,.test}.ts`, `apps/server/src/analytics/ga4-debug.ts`, `apps/web/src/analytics/{analytics-ids,attribution,track,use-page-views}.ts`, `apps/web/src/analytics/{analytics.test.ts,use-page-views.test.tsx}`.
Ngoài danh sách (test phải theo): `apps/server/src/security/endpoint-table.test.ts` (thêm route công khai kèm lý do), `apps/server/test/test-app.ts` (cho phép truyền `analytics`), `tools/content/check-content.test.ts` (giả lập lệch phiên bản v4/v5 thay v3/v4).

## Kiểm

Từng file một: schema analytics 19, content 39, config 9, forwarder 8, routes 10, session 4, server-events 9, player-routes 21, hub 27, web analytics 12, page views 2, endpoint-table 3, app 5, auth-routes 14, quest-routes 54, child-data 3, google-auth 23, account-routes 7, coop-reward 3, test-app 2, multiplayer-ws 3, db schema 7, account-flow 18, worksheets-screen 6, CSP 4, check-content 22 — tất cả xanh. `pnpm typecheck` sạch; `eslint --max-warnings=0` trên mọi tệp đổi: 0 lỗi, 0 cảnh báo; `pnpm content:check` OK (2.068 tệp); `pnpm --filter @miu/web build` xong (chỉ cảnh báo cỡ chunk có sẵn); `pnpm security:dist` OK; bundle không có chuỗi `google-analytics`/`gtag`.
Chưa chạy: E2E smoke (luồng đồng ý đổi phiên bản, cần chạy trước release), `pnpm test` toàn bộ, `assets:check`.

## Lệch và lưu ý

- `sign_up` và sự kiện quest đi qua một `ServerEvents` cài một lần lúc server khởi động (`installServerEvents`), vì `acceptPolicy` do `auth-routes.ts` gọi và `finishQuest` do `step-record.ts`/`coop-reward.ts` gọi, đều ngoài danh sách tệp; cách này không phải sửa các tệp đó. Chỉ cài khi có GA4, nên dev/test/E2E không thêm truy vấn.
- Sự kiện quest phát trong transaction của `finishQuest` (rollback sau đó rất hiếm, có thể đếm dư một sự kiện); `tutorial_complete` dựa trên sổ thưởng (đúng một dòng `quest:%`), hai quest đầu xong đồng thời có thể phát hai lần.
- Slug trang bài `/bai/<slug>` tạm là id bài (`toan2-t1-b01`), lấy từ quest `active` có `lesson`; phase 2 chọn slug khác thì sửa `analyticsCatalog`.
- Tên trường của entry GA trong `access-tokens.json` không đọc được (không đọc tệp credential): script giả định `token.measurement_id`, `token.api_secret`; sai tên thì `analytics` dừng, không ghi gì.
- `.claude/rules/product-audience.md` còn nhắc "lời đồng ý v3 không hỏi tuổi" (vẫn đúng với v4: không hỏi tuổi); tệp ngoài phạm vi, chưa sửa.

## Câu hỏi còn mở

- Người sở hữu xác nhận tên trường trong entry `analytics.google.com` trước khi chạy `deploy.sh analytics`.
