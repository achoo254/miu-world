# Kiểm duyệt, vé WebSocket và công tắc khẩn cấp: pha 1–5 (19/10/2026)

Plan: `plans/dattqh/261004-1617-moderation-safety/plan.md` (pha 6, đo tải, chưa làm). Nhánh `main`, chưa commit.

## Đã làm

| Pha | Kết quả |
| --- | --- |
| 1. Giới hạn tin WS | Đã có sẵn: tin quá 4 KB bị bỏ, 20 tin/giây mỗi kết nối, chữ ngoài danh sách câu có sẵn bị schema loại. Thêm phần còn thiếu: 200 tin bị bỏ trong 10 giây thì đóng kết nối (`4429`, client tự nối lại sau). Vị trí `move` vẫn nhận như client gửi (không chống cheat). |
| 2. Vé ngắn hạn | `POST /api/online-ticket` (đã đăng nhập, người chơi đã đồng ý chính sách, kiểm `Origin` như mọi POST) trả vé một lần, hạn 30 giây, server chỉ giữ sha256 trong bộ nhớ (`online-tickets.ts`). Upgrade `/api/ws?ticket=…` cần vé đó **và** đúng cookie phiên đã xin vé, phiên còn chơi đúng người chơi đó; vẫn kiểm `Origin`, phiên kiểm lại mỗi 2 phút. Khóa online và công tắc được kiểm ở mỗi tin. Client web xin vé trước mỗi lần nối (cả lúc nối lại); bạn máy không đi qua WS nên không đổi. |
| 3. Hàng đợi báo cáo | `player_reports` thêm `status`, `handled_at`, `handled_by`, `note`, `incident_lines` (câu có sẵn người bị báo cáo và người báo cáo gửi trong 10 phút trước, theo vai, kèm số giây trước báo cáo). Bảng mới `report_witnesses` (ai cùng phòng), `player_restrictions` (`hidden` tự động hoặc `locked` của người kiểm duyệt, `until` null là khóa hẳn). Không lưu vị trí hay quỹ đạo. Ba người chơi khác nhau báo cáo một người trong 24 giờ (báo cáo còn chờ) thì người đó bị ẩn khỏi online tới khi có quyết định; kết nối của người đó đóng ngay. Mỗi giờ (và 1 phút sau khi khởi động) server xóa nhật ký quá 14 ngày và khóa tạm đã hết; báo cáo vẫn giữ. |
| 4. Màn kiểm duyệt | `/kiem-duyet` (`apps/web/src/ui/moderation/`): công tắc khẩn cấp, hàng đợi "Đang chờ" / "Đã xử lý", mỗi báo cáo có lý do, map, người báo cáo, người bị báo cáo (tên nhân vật, số báo cáo đang chờ, khóa hiện có), ai cùng phòng, câu có sẵn đã gửi; hành động bỏ qua, cảnh cáo, đổi tên nhân vật (một tên khác trong danh sách tên), khóa 1/3/7/30 ngày, khóa hẳn, ghi chú riêng; mọi hành động hỏi xác nhận. Quyết định đóng mọi báo cáo đang chờ về cùng người chơi, áp hoặc gỡ khóa (quyết định mới nhất thắng) và để thư cho người bị báo cáo (bỏ qua chỉ gửi thư khi có khóa được gỡ). Đổi tên thì người khác thấy tên mới ngay. Mỗi ngày một thư tóm tắt (số báo cáo mới, số đang chờ) vào Hộp thư người chơi chính của người kiểm duyệt khi có báo cáo mới. Người kiểm duyệt nhận diện bằng email đăng nhập trong `MODERATOR_ACCOUNTS`; mọi route `/api/moderation/*` trả 404 cho người khác (401 khi chưa đăng nhập), màn đưa người khác về trang chủ. Bố cục xếp chồng từ khổ điện thoại, nút xuống dòng. |
| 5. Công tắc khẩn cấp | Env `ONLINE_MODE` (`on`, `interaction-off`, `off`; mặc định `on`) và `PUT /api/moderation/online-mode` (giữ trong bộ nhớ, restart quay về env). `off`: đóng mọi kết nối ngay (`4503`), không cấp vé (503); game hiện "Chơi online đang tạm nghỉ…" và tự thử lại mỗi 15 giây. `interaction-off`: vẫn vào room, đi lại, chặn, báo cáo; câu nói, vẫy, lời mời, kết bạn, tổ đội, co-op, nhiệm vụ đội, giọng nói đều bị bỏ, tổ đội và giọng nói kết thúc, bạn máy thôi rủ; mọi người nhận `online-mode` và game hiện một dòng thân thiện. Người bị khóa (`4403` / 403) thấy "Chơi online đang tạm khóa…", vẫn chơi một mình và nhận thưởng. Không có thông báo lỗi nào cho người chơi. Vận hành: `docs/deployment-guide.md` §7. |

Thêm: "Tải dữ liệu của tôi" có `onlineLock` của từng người chơi; `/privacy` mô tả nhật ký 14 ngày và màn kiểm duyệt (không nâng phiên bản đồng ý, theo quyết định 19/10 "không đổi chính sách"); `docs/system-architecture.md` (dòng Chơi online, sổ quyết định), `docs/project-roadmap.md`.

## Endpoint mới

| Endpoint | Ai gọi được | Ghi chú |
| --- | --- | --- |
| `POST /api/online-ticket` | Người chơi đã đăng nhập, đã đồng ý | 503 `online-paused` khi công tắc `off`, 403 `online-restricted` khi bị khóa |
| `GET /api/moderation/me` | Người kiểm duyệt | `{ onlineMode }` |
| `GET /api/moderation/reports?status=open\|handled` | Người kiểm duyệt | Tối đa 100, mới nhất trước |
| `POST /api/moderation/reports/:id/action` | Người kiểm duyệt | `{ action, lockDays?, note? }` |
| `PUT /api/moderation/online-mode` | Người kiểm duyệt | `{ mode }` |

Mã đóng WS mới: `4403` (bị khóa, client không nối lại), `4429` (dội), `4503` (công tắc tắt). Tin server mới: `online-mode`.

## Migration

`apps/server/drizzle/0023_moderation.sql`, sinh bằng `drizzle-kit generate --name moderation`; chỉ thêm (2 bảng, 6 cột nullable/có mặc định, ràng buộc, chỉ mục); báo cáo cũ thành `open`. Production phải backup trước khi chạy: `deploy.sh release` tự backup ra `/var/backups/miu/before-<id>.dump` trước khi restart (migration chạy lúc server mở Postgres).

## Kiểm tra đã chạy

| Lệnh | Kết quả |
| --- | --- |
| `pnpm vitest run apps/server/src/multiplayer/hub-safety.test.ts` (mới) | 9/9 (chữ ngoài danh sách, quá 4 KB, quá bucket bị bỏ; dội liên tục bị đóng; công tắc off/interaction-off/on; khóa; ẩn tự động; nhật ký không có vị trí; quên câu sau 10 phút) |
| `pnpm vitest run apps/server/src/moderation/moderation-flow.test.ts` (mới) | 9/9 (bé báo cáo qua kết nối → hàng đợi có nhân chứng và câu → cảnh cáo → thư tới người bị báo cáo; khóa tạm đóng kết nối, chặn vé, hiện trong tệp tải dữ liệu, bỏ qua gỡ khóa và gửi thư; đổi tên; chỉ người kiểm duyệt; ẩn tự động 3 người/24 giờ; báo cáo cũ hơn 1 ngày hay đã quyết không tính; xóa sau 14 ngày; thư tóm tắt mỗi ngày; công tắc từ API) |
| `multiplayer-ws.test.ts` (sửa theo vé) | 5/5 (không vé, vé bịa, vé đã dùng, vé hết hạn, vé của phiên khác bị từ chối; không vé khi công tắc tắt hay bị khóa) |
| `endpoint-table.test.ts` | 4/4 (thêm: mọi route `/moderation/*` trả 404 cho người không phải kiểm duyệt; 401 khi chưa đăng nhập và IDOR theo `:id` tự phủ) |
| `account-routes.test.ts` | 7/7 (xóa tài khoản xóa cả `report_witnesses`, `player_restrictions`) |
| `config.test.ts`, `apps/server/src/mail`, `apps/server/src/db`, `apps/web/src/ui/i18n` | 48/48 cùng `hub-safety` |
| `apps/server/src/multiplayer`, `friend`, `voice`, `invite` | 38 file, 274/274 |
| `apps/server/src/coop`, `character`, `player`, `auth` | 14 file, 148/148 |
| Web: `multiplayer-session.test.ts` (xin vé, tạm nghỉ, bị khóa), `online.test.tsx` (dòng tạm nghỉ), `moderation-screen.test.tsx` (mới) | 23/23, 13/13, 4/4 |
| `pnpm content:check` | OK, 2071 file |
| `pnpm typecheck` | Sạch (gốc, server, web) |
| `pnpm lint` | 0 lỗi, 0 cảnh báo |
| `pnpm --filter @miu/web build` | Xong; chỉ các cảnh báo cũ (chunk lớn, import không đuôi) |
| `pnpm security:dist` | OK |

Không chạy: E2E, toàn bộ `pnpm test`, `pnpm assets:check` (phiên chính chạy). Chưa nhìn màn `/kiem-duyet` trên trình duyệt thật ở khổ điện thoại/iPad (chỉ CSS và test DOM).

## Dependency mới

Không có.

## Người sở hữu cần làm

1. Đặt `MODERATOR_ACCOUNTS=<email đăng nhập Google của người sở hữu>` trong `/etc/miu/production.env` rồi restart (hỏi trước khi làm; không commit email). Không đặt thì không ai vào được màn kiểm duyệt và không có thư tóm tắt, trong khi ẩn tự động vẫn chạy: người bị ẩn sẽ ẩn mãi vì không ai quyết được. Nên đặt cùng lần release có migration `0023_moderation`.
2. `deploy.sh setup` viết lại toàn bộ tệp env: sau mỗi lần `setup` phải thêm lại `MODERATOR_ACCOUNTS` (và `ONLINE_MODE` nếu dùng; `TIMETABLE_DEFAULT_ACCOUNTS` cũng bị như vậy từ trước).
3. Duyệt câu chữ mới trên `/privacy` (nhật ký 14 ngày, màn kiểm duyệt) và các thư kiểm duyệt; lời đồng ý giữ `v4`.

## Rủi ro còn lại

- Tab đang mở từ bản trước release không xin vé nên nối lại thất bại (thưa dần tới 1 phút) cho tới khi tải lại trang; chơi một mình không bị ảnh hưởng.
- Vé, công tắc và nhật ký câu nằm trong bộ nhớ một instance (đúng mô hình hiện tại); restart làm công tắc về `ONLINE_MODE` và mất câu của 10 phút gần nhất.
- Bật `interaction-off` giữa lúc một người chơi một mình đang chơi thử thách co-op với bạn máy thì thử thách đó dừng (tin co-op bị bỏ).
- Người chơi bị ẩn tự động không nhận thư (chỉ dòng "tạm khóa" trong game) cho tới khi người kiểm duyệt quyết.
- Hàng đợi chỉ hiện 100 báo cáo mới nhất mỗi danh sách; chưa có phân trang.
- Nhật ký 14 ngày là dữ liệu mới về người chơi; được ghi vào `/privacy` mà không nâng phiên bản đồng ý, đúng quyết định "không đổi chính sách" (Jev 0,99, người sở hữu duyệt). Nếu pháp chế coi đây là thay đổi cách thu dữ liệu thì cần nâng lời đồng ý.
