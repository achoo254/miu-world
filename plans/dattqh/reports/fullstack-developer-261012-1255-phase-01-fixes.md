# Sửa các phát hiện review phase 1 (analytics)

Trạng thái: DONE. Sáu mục A–F đã làm đủ, không tạo branch, không commit.

## A. Sự kiện quest chỉ phát sau commit, `tutorial_complete` đúng một lần (phát hiện 2)
- `apps/server/src/quest/quest-usage.ts` (mới): `firstQuestEver` lấy khóa advisory theo người chơi (`pg_advisory_xact_lock`, giữ đến hết transaction) rồi mới đếm `quest:%` trong sổ thưởng; `commitQueue()` giữ việc phát sự kiện đến khi caller chạy sau commit.
- Khóa nằm ở cuối `finishQuest`, sau mọi dòng ghi, để chờ khóa không thể nằm trong vòng chờ dòng của transaction khác (không dùng khóa dòng `child_profiles` vì cửa hàng đã khóa dòng đó trước rồi mới ghi kho đồ, có nguy cơ deadlock). Khóa dòng `questProgress` chỉ riêng từng quest nên không chặn được hai quest đầu hoàn tất đồng thời.
- `quest-completion.ts`: `finishQuest` nhận thêm `queue`; việc hỏi "quest đầu tiên?" chạy trong savepoint và bọc `try/catch`, lỗi thì bỏ qua analytics, thưởng vẫn trả. `run` thành tham số bắt buộc (hai nơi gọi đều truyền sẵn).
- `step-record.ts` và `coop-reward.ts`: tạo queue, chạy `queue.run()` sau khi `db.transaction` kết thúc; mỗi việc trong queue bắt lỗi riêng (chỉ ghi tên lớp lỗi).
- Test mới `apps/server/src/quest/quest-usage.test.ts` (4 test): rollback sau `finishQuest` không phát gì, rồi trả lại cùng run vẫn phát đủ; hai quest đầu hoàn tất đồng thời chỉ có một `tutorial_complete`; lỗi DB thật trong câu hỏi đếm (bảng không tồn tại) không làm hỏng bước và thưởng vẫn trả; sink ném lỗi sau commit không làm hỏng bước.
- Ghi chú: DB test là PGlite nên giao dịch được xếp hàng, test đồng thời kiểm đúng kết quả nhưng không chứng minh được khóa trên Postgres thật.

## B. Hạn tắt máy riêng cho hàng đợi GA (phát hiện 4)
- `ga4-forwarder.ts`: `close(deadlineMs = 1_500)` tự bỏ chờ khi hết hạn; `drain` gửi song song tối đa `SEND_CONCURRENCY = 8` yêu cầu (mỗi `client_id` một lô).
- `server.ts`: `analyticsSink.close()` dùng hạn riêng đó, chạy song song với `botRunner.flush()`, nên Google chậm không còn làm `database.close()` bị bỏ qua. Cửa sổ 3 giây ngoài cùng giữ nguyên.
- Test: nhiều `client_id` với fetch chậm gửi song song (đỉnh đồng thời = 8, 40 lô); `close(1500)` với Google treo trả về đúng ở mốc 1.500 ms, hàng đợi sau đó không nhận thêm.

## C. Dành chỗ cho sự kiện server (phát hiện 5)
- `WEB_QUEUE_MAX = 700` trên `QUEUE_MAX = 1_000`: sự kiện web chỉ đẩy sự kiện web cũ nhất; sự kiện server luôn được nhận, khi đầy thì đẩy sự kiện web cũ nhất ra trước, hết sự kiện web mới bỏ cái cũ nhất. Cấu hình được qua `webQueueMax` cho test.
- Test: 2 test (tràn web giữ nguyên toàn bộ sự kiện server; chỉ toàn sự kiện server thì bỏ cái cũ nhất).

## D. Giới hạn theo `client_id` và nới theo IP (phát hiện 6)
- `config.ts`: `analyticsLimitPerMinute` 60 → 600 (theo IP), thêm `analyticsClientLimitPerMinute: 60`.
- `analytics-routes.ts`: hai limiter nối tiếp (IP rồi `client_id`); body có `client_id` sai dạng thì khóa theo IP. `app.ts` truyền cấu hình mới.
- Test: giới hạn theo IP với nhiều trình duyệt khác nhau; giới hạn theo `client_id` từ nhiều địa chỉ, trình duyệt khác trên cùng địa chỉ vẫn qua; mặc định 600/60 trong `config.test.ts`.

## E. `deploy.sh analytics` kiểm chính sách trước (phát hiện 8)
- Hàm `policy_is_live` chạy đầu `analytics`, trước cả việc đọc token: `GET https://miu.hoandat.com/api/consents/policy` (đường dẫn đã kiểm trong `auth-routes.ts`, mount dưới `/api`) phải trả `version` bằng phiên bản trong `content/legal/consent-vi.json` của bản checkout (hiện v4), nếu không thì dừng kèm thông báo rõ. Giá trị đọc về được kiểm dạng trước khi in; không in bí mật nào.
- Đã chạy thử hàm với production thật: báo "production serves policy v3 but this checkout holds v4", exit 1. `bash -n` sạch; `shellcheck` chỉ còn hai cảnh báo cũ (SC2046, SC2010) ở `fonts` và `release`, không thuộc phần mới.
- Lưu ý: so với phiên bản trong repo chứ không gắn cứng "v4", để khi sang v5 lệnh không âm thầm đúng/sai.

## F. Văn bản (phát hiện 3, chỉ chữ)
- `privacy-vi.json` (vẫn v4): dữ liệu theo từng sự kiện giữ 2 tháng, báo cáo tổng hợp Google có thể giữ lâu hơn và không kèm mã nào của người chơi (mục Số liệu sử dụng ẩn danh, Giữ bao lâu, Rút lại đồng ý); thêm câu máy chủ giữ tạm trong bộ nhớ liên kết giữa mã ngẫu nhiên của trình duyệt và phiên đăng nhập, chỉ để gom sự kiện, không ghi DB hay nhật ký, mất sau nửa giờ không dùng hoặc khi khởi động lại (khớp `analytics-session.ts`).
- `consent-vi.json`: chỉnh câu "giữ 2 tháng" cho nhất quán.
- `docs/deployment-guide.md` §7, mục GA4: thêm bước tự từ chối của `analytics` và danh sách kiểm bắt buộc (Google Signals tắt, cá nhân hóa quảng cáo tắt, mọi mục chia sẻ dữ liệu tắt, lưu giữ sự kiện 2 tháng, người sở hữu xác nhận trong GA Admin).

## Tệp thay đổi
Sửa: `apps/server/src/analytics/{analytics-routes.ts,analytics-routes.test.ts,ga4-forwarder.ts,ga4-forwarder.test.ts}`, `apps/server/src/{app.ts,config.ts,config.test.ts,server.ts}`, `apps/server/src/quest/{quest-completion.ts,step-record.ts}`, `apps/server/src/reward/coop-reward.ts`, `content/legal/{privacy-vi.json,consent-vi.json}`, `docs/deployment-guide.md`, `tools/deploy/production/deploy.sh`.
Mới: `apps/server/src/quest/quest-usage.ts`, `apps/server/src/quest/quest-usage.test.ts`.

## Kiểm tra (từng tệp một, không chạy bộ đầy đủ hay E2E)
- `pnpm vitest run apps/server/src/quest/quest-usage.test.ts`: 4 xanh.
- `pnpm vitest run apps/server/src/analytics/ga4-forwarder.test.ts`: 12 xanh.
- `pnpm vitest run apps/server/src/analytics/analytics-routes.test.ts apps/server/src/config.test.ts`: 21 xanh.
- `pnpm vitest run apps/server/src/analytics/server-events.test.ts apps/server/src/analytics/analytics-session.test.ts`: 13 xanh.
- `pnpm vitest run apps/server/src/quest/quest-routes.test.ts`: 54 xanh; `apps/server/src/reward/coop-reward.test.ts`: 3 xanh; `apps/server/src/security/endpoint-table.test.ts`: 3 xanh; `packages/schema/src/content.test.ts`: 39 xanh.
- `pnpm typecheck`: sạch (server, web). `pnpm exec eslint --max-warnings=0` trên 13 tệp TS đã đổi: 0 lỗi, 0 cảnh báo. `pnpm content:check`: OK, 2068 tệp.
- Không chạy: `pnpm test` toàn bộ, E2E, `assets:check`, `web build` (không đổi `apps/web`).

## Việc còn lại / chưa xác minh
- Khóa advisory chưa được thử với hai kết nối Postgres thật (PGlite xếp hàng giao dịch).
- Phát hiện 1 (v4 mô tả link mời chưa có) và 7, 9 phần còn lại không thuộc phạm vi lần này.
- Production đang chạy chính sách v3, nên `deploy.sh analytics` sẽ từ chối cho đến khi release có v4.

Status: DONE
Summary: Sáu mục A–F xong, test từng tệp xanh, typecheck, eslint và content:check sạch; sự kiện quest nay phát sau commit và đúng một lần, hàng đợi GA có hạn tắt riêng, chỗ dành cho sự kiện server, hai giới hạn tốc độ, `deploy.sh analytics` kiểm chính sách production trước, và chữ chính sách/hướng dẫn deploy đã sửa.
