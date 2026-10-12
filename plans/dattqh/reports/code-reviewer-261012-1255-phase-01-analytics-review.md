# Review commit f6967bdd — GA4 phía server, lời đồng ý v4, deploy.sh analytics

Phạm vi: `git show f6967bdd` (39 tệp, +1.945/−33). Số dòng lấy ở HEAD (`d30ebc0e`), chỉ `server.ts` và `deploy.sh` lệch vài dòng so với commit. Đã chạy `pnpm vitest run apps/server/src/analytics/ga4-forwarder.test.ts` (8 xanh) và `shellcheck`/`bash -n` trên `deploy.sh` (chỉ có cảnh báo info/style, không lỗi). Không chạy E2E hay bộ test đầy đủ.

Kết luận ngắn: không có blocker về PII hay lạm dụng; điểm yếu nằm ở độ đúng của lời đồng ý v4 so với code đang có, ở việc phát sự kiện quest trong transaction, và ở các khẳng định về cấu hình Google mà không có cổng kiểm nào.

## Trả lời theo 6 mục cần kiểm

1. PII: sạch.
   - `sanitizeWebEvent` (`packages/schema/src/analytics.ts:135-165`) chỉ dựng tham số từ giá trị đã kiểm: `client_id` regex `^\d{10}\.\d{10}$` (dòng 15, 137), `session_id` số nguyên 1…9.999.999.999 (dòng 17), engagement bị chặn (143), `page_location = origin + trang trong bảng route` (148), `source/medium/campaign` regex (19, 152-155), referrer chỉ lấy host có TLD chữ (21, 101-111), `method`/`content_type` enum (127, 159), `lesson_id` phải thuộc danh mục (162). Khóa lạ bị zod bỏ (`WebEventBody` không `.passthrough`), có test `drops parameters it does not know` (`analytics-routes.test.ts:60`).
   - `origin` lấy từ `req.headers.origin` (`analytics-routes.ts:43`) sau `requireAllowedOrigin` khớp tuyệt đối với danh sách (`origin-check.ts:10-17`), nên không có chuỗi do trình duyệt tự bịa nằm trong `page_location`.
   - Sự kiện server chỉ mang `method`, `lesson_id`, `subject`, `ccu` (`server-events.ts:59-86`); `requestBody` (`ga4-forwarder.ts:39-45`) không thêm IP, user agent, user_id; `consent.ad_*` đặt DENIED.
   - Email, tên hiển thị, id tài khoản/người chơi không đi tới Google. Id tài khoản và người chơi chỉ làm khóa Map trong RAM (`analytics-session.ts:23-26`).
2. Lạm dụng: Origin → parser 4 KB → rate limit đúng thứ tự (`app.ts`: `app.use('/api/analytics', express.json 4kb)` trước parser 32 KB; `requireAllowedOrigin` rồi `analyticsRoutes` có `limit` ở `analytics-routes.ts:40`). Web chỉ gửi được `page_view`/`share` (`isOneOf(WEB_EVENTS…)`, dòng 137), 5 tên sự kiện server bị 400 (test dòng 40-45). Không thể giả `ccu_peak`/`sign_up`/`level_end` qua endpoint công khai. Còn lại: giả `page_view`/`share` với `client_id` tùy ý là không tránh được (xem 5, 6).
3. Đúng đắn: `sign_up` đúng (kiểm dưới khóa tài khoản, phát sau commit, `player-routes.ts:78-95`); `ccu_peak` đếm `childId` không trùng, bot không vào `players`; forwarder không ném lỗi, không log URL/secret, không gửi khi thiếu env. Hai lệch ở mục 2 và 4 bên dưới.
4. `deploy.sh`: đạt. `ga4_from_tokens` đọc đúng entry `analytics.google.com` + `used_by == "miu-world production"`, trường `token.measurement_id`/`token.api_secret`, kiểm cùng regex với server, không in giá trị (thông báo lỗi không chứa giá trị), ghi qua stdin ssh; `analytics_env` giữ cả cặp hoặc không dòng nào, dừng nếu lệch; thay dòng bằng `grep -Ev … > tmp; cat >> tmp; install` không làm rỗng file khi grep trả 1. Một gợi ý siết (mục 8).
5. Lời đồng ý/chính sách: có lệch với code (mục 1 và 3 bên dưới).
6. Thiếu test: xem mục 9.

## Phát hiện

### 1. [major] Lời đồng ý và chính sách v4 mô tả tính năng chưa tồn tại trong code

Bằng chứng:
- `content/legal/consent-vi.json` đoạn 4: "các link mời bạn đã tạo (dùng một lần, hết hạn sau 7 ngày, thu hồi được)". `privacy-vi.json`: mục "Dữ liệu lưu" thêm "Link mời bạn: mỗi link… lưu bằng dạng đã mã hóa của mã", mục "Khi chơi online" thêm "Hoặc gửi link mời bạn…", mục "Số liệu sử dụng ẩn danh" liệt kê "trang mời bạn, trang bài học" và "một link mời bạn được dùng".
- Không có mã nào cho link mời: `grep -rli "invite"` trong `apps/server/src` không có bảng/route/service nào ngoài tên sự kiện `invite_accepted` trong schema (không nơi nào phát). `apps/web/src/ui/app-shell.tsx:128-149` không có route `/moi` hay `/bai/*` (rơi vào `*` → `/`). Kế hoạch gán các việc này cho phase 2 và 3 (`phase-01…md` mục Yêu cầu 1 ghi rõ "phase 3").
- Hệ quả: nếu phase 1 phát hành riêng, mọi tài khoản bấm đồng ý v4 cho một chính sách nói sai về phần mềm; chính sách tự cam kết "viết đúng những gì phần mềm đang làm" (mục "Về chính sách này"). Khi phase 3 ra, nội dung đổi lại buộc nâng v5 và hỏi đồng ý lần nữa.

Sửa: (a) không phát hành v4 trước phase 3, hoặc (b) giờ rút các câu về link mời, `/moi`, `/bai`, `invite_accepted` khỏi v4 và để phase 3 thêm vào ngay trong v4 chưa phát hành. Chốt trong `plan.md` thứ tự phát hành. Đây là quyết định phạm vi sản phẩm nên cần người chốt.

### 2. [major] `finishQuest` phát sự kiện trong transaction, trước commit; `tutorial_complete` không idempotent khi đồng thời

Bằng chứng: `apps/server/src/quest/quest-completion.ts:95` gọi `serverEvents()?.questFinished(…, await firstQuestEver(tx, childId))` ngay trong `tx`, trước phần còn lại của `finishQuest` và trước bước `select` + commit của người gọi (`step-record.ts:236-243`, `coop-reward.ts:28-33`).
- Rollback sau dòng 95 (lỗi, deadlock, hết hạn kết nối) vẫn để lại `level_end`/`tutorial_complete` đã nằm trong hàng đợi; thử lại giao dịch thì phát đôi. `sign_up` trong cùng commit đã làm đúng (phát sau commit), nên hai đường không nhất quán.
- `firstQuestEver` đếm `reward_ledger` `quest:%` và kiểm `=== 1` (dòng 57-63). Ở READ COMMITTED, hai quest đầu hoàn tất đồng thời mỗi bên chỉ thấy dòng của mình → cả hai phát `tutorial_complete` (người triển khai đã tự ghi nhận trong báo cáo). Yêu cầu của plan là "idempotent theo người chơi".
- Truy vấn đếm thêm một round-trip trong đường trả thưởng; lỗi truy vấn này làm hỏng việc trả thưởng vì analytics (trái nguyên tắc "không bao giờ ném vào request path"). Có `?.` nên không chạy khi chưa cài GA.

Sửa: để `finishQuest` trả danh sách sự kiện chờ (hoặc nhận `afterCommit: (fn) => void`) và phát sau khi `db.transaction` của `step-record`/`coop-reward` kết thúc; dùng khóa dòng `questProgress` đã có (`for('update')` ở `coop-reward.ts:26`, tương tự ở `step-record`) hoặc `insert … on conflict` vào cờ "đã phát tutorial_complete" để đảm bảo đúng một lần; bọc phần truy vấn đếm trong `try/catch` để lỗi analytics không làm rollback thưởng.

### 3. [major] Khẳng định cấu hình Google Analytics trong chính sách không có cổng kiểm, và một số câu nói quá

Bằng chứng: `privacy-vi.json` mục "Số liệu sử dụng ẩn danh" đoạn 3: "Google Analytics của Miu tắt Google Signals, tắt quảng cáo và chia sẻ dữ liệu với Google, và giữ số liệu 2 tháng"; mục "Giữ bao lâu": "được giữ 2 tháng rồi tự xóa". Đó là cài đặt trong GA Admin (kế hoạch để ở phase 4), không phải code. `docs/deployment-guide.md` (§ lệnh `analytics`) chỉ đặt điều kiện "sau release có privacy v4", không có bước kiểm Signals, chia sẻ dữ liệu, lưu giữ trước khi chạy `deploy.sh analytics`.
- Các mục "Chia sẻ dữ liệu" (Google products & services, benchmarking, technical support, account specialists) thường mặc định bật khi tạo property; mặc định lưu giữ sự kiện là 2 tháng nhưng chỉ áp cho dữ liệu cấp người dùng/sự kiện (Explorations); báo cáo chuẩn dạng tổng hợp không bị xóa sau 2 tháng. Vì vậy "số liệu… tự xóa sau 2 tháng" là nói quá (cần xác nhận lại với tài liệu GA hiện hành).
- "một mã ngẫu nhiên không gắn với tài khoản": server có giữ ánh xạ mã web ↔ phiên đăng nhập trong RAM để `sign_up`/`level_end` cùng người dùng GA (`analytics-session.ts`). Với GA thì đúng (GA không thấy tài khoản), nhưng câu nên nói rõ máy chủ giữ liên kết tạm trong bộ nhớ, không ghi DB/log, quên sau 30 phút.

Sửa: thêm vào `deployment-guide.md` một danh sách kiểm bắt buộc trước `deploy.sh analytics` (Signals tắt, ba mục chia sẻ dữ liệu tắt, lưu giữ 2 tháng, bỏ "enhanced measurement" nếu không dùng) và người sở hữu xác nhận; sửa câu giữ 2 tháng thành "dữ liệu theo từng sự kiện… báo cáo tổng hợp không gắn với ai có thể được giữ lâu hơn"; thêm một câu về ánh xạ trong bộ nhớ.

### 4. [minor] Tắt máy: dọn hàng đợi GA ghép chung cửa sổ 3 giây với bot và việc đóng DB

`server.ts:115-122`: `await Promise.all([botRunner.flush(), analyticsSink.close()])` rồi mới `database.close()`. `close()` gửi tuần tự từng lô (một lô mỗi `client_id`, mỗi lô tối đa 2 s timeout, `ga4-forwarder.ts:114-126`). Vài chục người xem trang khác nhau trong 5 giây trước khi restart là đủ vượt 3 s khi mạng chậm; khi đó `Promise.race` thắng bằng `timeout`, `database.close()` không chạy, tiến trình thoát mã 1 và log sai ("companion bots' memories not all written") dù bot đã ghi xong.

Sửa: tách `analyticsSink.close()` ra khỏi chuỗi bot/DB, đặt trần riêng ngắn (khoảng 1,5 s, `Promise.race`) và chạy song song với `botRunner.flush()` nhưng không chặn `database.close()`; cho phép gửi 4-8 lô song song trong `drain` thay vì tuần tự.

### 5. [minor] Hàng đợi dùng chung giữa sự kiện web giả được và sự kiện kinh doanh; một request HTTP cho mỗi `client_id`

`ga4-forwarder.ts:72-77, 129-139`: hàng đợi 1.000 phần tử bỏ cũ nhất, lô chỉ gom cùng `client_id`. Endpoint công khai cho phép gửi `client_id` ngẫu nhiên (regex chỉ kiểm hình dạng) nên mỗi sự kiện giả tạo một request tới Google và có thể đẩy `sign_up`/`level_end` ra khỏi hàng đợi nếu có nhiều IP (giới hạn chỉ theo IP). Dữ liệu GA cũng bị làm nhiễu (Users, Realtime) mà không cách xác thực nào ở phía trình duyệt.

Sửa: giới hạn tổng số sự kiện web/phút toàn cục (vd 600) và dành hàng đợi/ưu tiên riêng cho sự kiện server (không bị sự kiện web đẩy ra); ghi nhận trong kế hoạch phase 4 rằng số liệu web là "khoảng chừng", không dùng làm cơ sở thưởng hay quyết định chi phí.

### 6. [minor] Giới hạn 60 sự kiện/phút theo IP làm rơi âm thầm số liệu ở trường học

`config.ts` `analyticsLimitPerMinute: 60`, `analytics-routes.ts:38-40`. Đối tượng là học sinh dùng chung mạng trường (NAT, một IP công khai): vài chục em điều hướng là vượt 60/phút, request vượt trả 429 và trình duyệt bỏ im lặng (`track.ts:25`). Số liệu thiên lệch đúng ở nhóm mục tiêu.

Sửa: nâng trần (vd 300/phút/IP) và/hoặc trần theo `client_id` (vd 30/phút) bên cạnh trần IP rộng hơn; trần theo IP vẫn giữ cho trường hợp xấu.

### 7. [minor] Người dùng "ảo" trong GA và phiên không bao giờ đổi

- `ccu_peak` dùng `serverIds` ngẫu nhiên suốt đời tiến trình (`server-events.ts:55`): mỗi lần restart là một "người dùng" mới có phiên trong GA; sự kiện quest/sign_up không có cặp mã hợp lệ (người chơi chờ trong co-op không gọi HTTP quá 30 phút, hoặc ngay sau restart) dùng `randomGaIds` → mỗi sự kiện một người dùng mới, làm sai Users/New users.
- `api()` đính `x-miu-ga` vào mọi lời gọi và `analyticsHeaderValue()` gọi `currentGaIds()` → `touchSession` (`analytics-ids.ts:62`, `api-client.ts`): mọi lời gọi API, kể cả nền, đều đánh dấu phiên đang hoạt động nên `session_id` không đổi sau 30 phút nhàn rỗi nếu trang còn gọi nền; GA đếm thiếu phiên.

Sửa: ghi chú cho phase 4 để lọc `ccu_peak`/sự kiện mồ côi ra khỏi báo cáo người dùng (hoặc dùng tham số riêng); chỉ `touchSession` khi có tác động người dùng (chuyển trang, gửi analytics), còn header API dùng `currentGaIds` không chạm `seenAt`.

### 8. [minor] `deploy.sh analytics` có thể chạy trước khi privacy v4 lên

`deploy.sh` chỉ ràng buộc thứ tự bằng tài liệu và chú thích. Sai thứ tự = gửi dữ liệu về Google khi chính sách chưa nói. Sửa: trong hàm `analytics` gọi `curl -fsS https://$DOMAIN/api/consents/policy | jq -e '.version == "v4"'` (endpoint công khai `GET /consents/policy`) và dừng khi khác; vẫn cần hỏi người trước mỗi lần như ghi trong tệp.

### 9. [minor] Khoảng trống test

Có: lọc tham số (schema + routes), 413, Origin, 429, hàng đợi/lô/đóng, không log secret, `sign_up` không phát khi đồng ý lại, v4 đồng ý lại.
Thiếu:
- Rollback sau `finishQuest` không để sự kiện (mục 2), và hai quest đầu đồng thời chỉ phát một `tutorial_complete`.
- Hai lần `POST /consents` đồng thời của tài khoản mới chỉ phát một `sign_up` (có khóa tài khoản nhưng chưa có test).
- `drain` với nhiều `client_id` khác nhau (bài toán ở mục 5) và `close()` khi Google chậm trong cửa sổ 3 s (mục 4); `server.ts` (vòng giờ `ccu_peak`, thứ tự tắt máy) không có test.
- Test hub `counts each player once… never a companion bot` (`multiplayer-hub.test.ts`) cho bot vào `room.join` chứ không qua `connect`; nó không chứng minh bot bị loại, chỉ chứng minh bot không nằm trong `players`.
- Test regex chính sách (`content.test.ts`) chỉ cấm cụm cũ; không có kiểm chéo "tính năng nêu trong chính sách có tồn tại" (mục 1).
- E2E smoke cho luồng đồng ý lại v4 chưa chạy (báo cáo người triển khai ghi rõ) — bắt buộc trước release theo `CLAUDE.md`. `pnpm test` toàn bộ và `assets:check` cũng chưa chạy.
- `ga4-debug.ts` chưa được chạy với thông tin thật nên chưa xác nhận tham số `session_id` dạng số và `consent` ở MP được GA chấp nhận.

## Câu hỏi còn mở

- Người sở hữu xác nhận tên trường trong entry `analytics.google.com` (`token.measurement_id`, `token.api_secret`) trước `deploy.sh analytics` (cũng nằm trong báo cáo người triển khai).
- Gửi `page_view` cho cả khách chưa đồng ý (không có màn hình đồng ý ở trang đích) là chủ ý của người sở hữu? Chính sách đã nói, nhưng không có cách từ chối; cần chốt đã cân nhắc pháp lý (Nghị định 13/2023) cho mã ngẫu nhiên lưu `localStorage`.
- Tham số web `source`/`medium`/`campaign`/`referrer` gửi như tham số sự kiện tùy ý trong Measurement Protocol có đi vào báo cáo "Thu nạp" của GA không, hay cần đăng ký custom dimension / dùng tham số chiến dịch của MP? Chưa kiểm với GA thật (liên quan phase 4 đo hiệu quả).

Status: DONE_WITH_CONCERNS
Summary: Không có lỗ PII hay giả mạo sự kiện server qua endpoint công khai, deploy.sh đạt yêu cầu; 3 điểm major cần xử lý trước khi phát hành (chính sách v4 nói về link mời chưa có, sự kiện quest phát trong transaction trước commit, khẳng định cấu hình GA chưa có cổng kiểm), cùng 6 điểm minor và danh sách test thiếu.
