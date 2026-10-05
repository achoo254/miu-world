# Tiến bộ học, kết bạn trong game, công tắc online của người chơi

**Trạng thái:** pha 1–6 xong phần tự động (05/10/2026), chờ người duyệt và deploy (migration `0012`–`0014`); report `plans/dattqh/reports/friends-online-progress-261005.md` · **Tier:** L · **Nhánh:** `main` · **Ngày:** 04/10/2026, sửa 05/10/2026
**Nguồn:** Master Plan §6, §9; định hướng mới của người sở hữu (05/10/2026, `.claude/rules/product-audience.md`): game cho mọi lứa tuổi, không cần phụ huynh giám sát, không đặt tính năng sau phê duyệt của phụ huynh. Quyết định thiết kế lại: Jev (`reports/jev-261005-1330-friends-rescope-{input,output}.json`). Bản 04/10 (phụ huynh bật online, hai phụ huynh duyệt bạn) không còn dùng.

## Kết quả mong muốn

1. **Tiến bộ học** (Jev 0.43, chọn `player_and_owner`): mỗi người chơi thấy tiến bộ của mình trong Hồ sơ (môn, kỹ năng mạnh/yếu, 3 bài gợi ý, thời gian chơi theo tuần, chỉ số đếm); chủ tài khoản thấy thêm của mọi người chơi trong tài khoản ở mục Quản lý tài khoản.
2. **Công tắc bạn máy** (Jev 0.64, `player_setting`): là cài đặt của chính người chơi trong Cài đặt, lưu ở server theo người chơi; chủ tài khoản đổi được cho người chơi phụ từ Quản lý tài khoản. Có hiệu lực ngay, kể cả đang trong phòng. **Công tắc online đã bỏ (người sở hữu, 05/10/2026: "bỏ tính năng tắt online đi. mặc định có online từ đầu vì game online mà"): game luôn online; cột `online_enabled` bỏ ở migration `0016`; công tắc bạn máy giữ nguyên.**
3. **Kết bạn như game online thường** (người sở hữu, 05/10/2026): không có mã. Trong game, chạm vào một người chơi khác (hoặc chọn trong danh sách người chơi cùng phòng) rồi bấm "Kết bạn"; người nhận lời mời chấp nhận hay từ chối; không cần phụ huynh duyệt. Mặc định bật. Chủ tài khoản xem và xóa bạn của người chơi phụ. Không chat tự do.
4. **Kết bạn được với bạn máy** (người sở hữu, 05/10/2026: bạn máy mô phỏng người chơi): bạn máy nhận lời mời và tự chấp nhận theo hành vi mô phỏng, có thể tự gửi lời mời; trong danh sách bạn vẫn luôn gắn nhãn bạn máy (Master Plan §15). Bạn máy là bạn thì hay xuất hiện gần người chơi hơn.
5. Danh sách chặn của người chơi (từ `player_blocks` của plan `261004-1540`), bỏ chặn, xóa bạn.

## Không làm (ghi rõ)

- Không phê duyệt của phụ huynh làm điều kiện để chơi, kết bạn hay vào online.
- Không chat tự do, không tên tự gõ, không dữ liệu thật trong API bạn bè (Master Plan §9).
- Không lưu quỹ đạo thô hay nội dung người chơi gõ để làm báo cáo.
- Không giới hạn giờ chơi (người sở hữu, 04/10/2026).

## Hiện trạng đo được (05/10/2026)

- Có: mô hình tài khoản một người chơi chính + người chơi phụ (`/api/players`, plan `261005-0949-single-player-account`), PIN tài khoản tùy chọn, `skill_progress`, hub WebSocket và bạn máy (công tắc bạn máy còn lưu cục bộ `miu.bots.enabled`).
- Chưa có: màn tiến bộ, công tắc online ở server, bạn bè.

## Pha

| Pha | Tier | Nội dung | File sở hữu |
| --- | --- | --- | --- |
| 1 | M | API và màn **tiến bộ học** cho người chơi (Hồ sơ) và cho chủ tài khoản (mọi người chơi); test IDOR | `apps/server/src/player`, `apps/web/src/ui/profile/**`, `apps/web/src/ui/account/**` |
| 2 | M | Cột `online_enabled`, `bots_enabled` trên người chơi (migration, sao lưu trước); người chơi đổi trong Cài đặt, chủ tài khoản đổi cho người chơi phụ; hub kiểm khi vào phòng và đưa ra khi tắt; bỏ lưu cục bộ. Công tắc online bỏ theo người sở hữu (05/10/2026), giữ công tắc bạn máy | `apps/server/src/db`, `apps/server/src/multiplayer`, `apps/web/src/ui/system/**` |
| 3 | L | Bạn bè: `friend_requests`, `friendships` (người chơi với người chơi, người chơi với bạn máy); gửi lời mời từ người chơi cùng phòng hoặc khi chạm vào nhân vật, người nhận chấp nhận/từ chối, giới hạn tần suất gửi; bạn máy trả lời theo hành vi mô phỏng; danh sách bạn chỉ hiện tên nhân vật, có nhãn bạn máy | `apps/server/src/friend/**` (mới), `apps/server/src/multiplayer`, `packages/schema`, `apps/web/src/ui/friends/**` (mới) |
| 4 | M | Danh sách chặn của người chơi, bỏ chặn, xóa bạn; chủ tài khoản quản lý bạn và chặn của người chơi phụ | `apps/web/src/ui/friends/**`, `apps/server/src/multiplayer` |
| 5 | S | Văn bản và quyền dữ liệu: trang quyền riêng tư mô tả bạn bè, chặn, báo cáo và dữ liệu chia sẻ khi online (tên nhân vật, trang phục, thú cưng, vị trí trong phòng); không nâng lời đồng ý lúc này, gộp vào lần nâng sau (Jev 0.89, `reports/jev-261005-1630-online-privacy-home-*.json`); file "Tải dữ liệu của tôi" có thêm bạn bè, lời mời, chặn, báo cáo của từng người chơi | `content/legal/privacy-vi.json`, `apps/server/src/auth/account-routes.ts`, `packages/schema/src/account.ts` |
| 6 | M | Nhà riêng: map Nhà của bé là phòng riêng của từng người chơi, chỉ chủ nhà, người cùng tổ đội và bạn bè vào được (Jev 0.99); hub chia phòng theo chủ nhà; "Đến chỗ bạn"/"Cùng đi" vào nhà bạn theo cùng luật | `apps/server/src/multiplayer/**`, `apps/web/src/game/multiplayer/**` |

## Kết quả thi công (05/10/2026)

| Pha | Trạng thái | Commit |
| --- | --- | --- |
| 1 Tiến bộ học | Xong: `GET /api/learning-progress`, `GET /api/players/:id/learning-progress`, `POST /api/play-time` (bảng `play_time`, migration `0012`); panel trong Hồ sơ và thẻ từng người chơi ở Quản lý tài khoản | `feat(progress): …`, `fix(progress): serve learning progress at its own path` |
| 2 Công tắc online, bạn máy | Xong: cột `online_enabled`, `bots_enabled` (migration `0013`), `GET`/`PUT /api/player-settings`, `PATCH /api/players/:id/settings`; hub đóng `4403` và ẩn/hiện bạn máy ngay; bỏ `miu.bots.enabled` (chuyển lên server một lần). **Sửa 05/10/2026 (người sở hữu): bỏ công tắc online, game luôn online; bỏ cột `online_enabled` (migration `0016`), bỏ đóng `4403` và việc nối lại khi bật; công tắc bạn máy giữ.** | `feat(multiplayer): online and companion bot switches …`, `feat(multiplayer): online is always on` |
| 3 Bạn bè | Xong: `friend_requests`, `friendships` (migration `0014`), WS `friend-request`, `friend-news`; bạn máy trả lời, tự mời, hay ghé bạn; giới hạn tần suất; nút "Bạn bè" trên HUD, thẻ lời mời, trang `/friends` | `feat(friends): …` (server, web) |
| 4 Chặn, xóa bạn, chủ tài khoản | Xong: danh sách chặn và bỏ chặn (`player_blocks.id`), xóa bạn, hủy lời mời; chủ tài khoản xem/xóa bạn, bỏ chặn của từng người chơi | cùng commit pha 3 |
| 5 Quyền riêng tư, xuất dữ liệu | Xong: trang quyền riêng tư có mục "Khi chơi online"; file xuất thêm công tắc, thời gian chơi, thư, bạn bè, lời mời, chặn, báo cáo; lời đồng ý giữ v3 | `feat(account): …` |
| 6 Nhà riêng | Xong: room `nha-cua-be#<chủ nhà>`, vào nhà người khác khi là bạn hoặc cùng đội; "Đến chỗ bạn"/"Cùng đi" vào nhà theo cùng luật; bạn máy hàng xóm và bạn máy là bạn vào theo nhà | `feat(multiplayer): a private home room for every player` |

Lệch so với plan (có lý do): thời gian chơi là dữ liệu mới (một tổng mỗi tuần) vì chưa có nguồn nào đo được, đã ghi ở trang quyền riêng tư; khách vào nhà bạn thấy nhà theo cách trang trí của chính mình (map dựng ở client theo hồ sơ người chơi), chỉ room là của chủ nhà.

## Phụ thuộc và file dùng chung

- Pha 4 cần `player_blocks` của plan `261004-1540`; pha 2 nối vào hub của plan đó.
- Pha 5 (cách chia sẻ dữ liệu): đổi cách chia sẻ thì hỏi người sở hữu trước khi bật cho người thật.
- Migration nối tiếp số hiện có (đã có 0006 home_decor, 0007 shop, và các số sau từ phiên khác); đọc `apps/server/src/db/migrations` ngay trước khi tạo, sao lưu cơ sở dữ liệu trước khi chạy migration.

## Tiêu chí xong

- Mỗi người chơi thấy đúng tiến bộ của mình; chủ tài khoản thấy người chơi của tài khoản mình (test IDOR: không xem được người chơi của tài khoản khác).
- ~~Tắt online thì người chơi đang trong phòng được đưa ra và không vào lại được~~ (bỏ 05/10/2026: game luôn online); bạn máy ẩn theo công tắc.
- Kết bạn thành khi người nhận chấp nhận (bạn máy theo hành vi mô phỏng); gửi lời mời quá nhiều thì bị giới hạn tạm; bạn máy luôn có nhãn trong danh sách bạn.
- Không trường nào trong API bạn bè chứa dữ liệu nhận dạng thật (test schema).
- Gate chung đủ 5 lệnh + build web.

## Câu hỏi mở

- Lời đồng ý: giữ v3, dữ liệu mới (bạn bè, chặn, báo cáo, thời gian chơi theo tuần) ghi ở trang quyền riêng tư, đưa vào lời đồng ý ở lần nâng tới (Jev 0.17, gần như phân vân 59/41, rủi ro cao: chờ người sở hữu xác nhận). Người chơi phụ luôn tự bật lại được online sau khi chủ tài khoản tắt (Jev 0.95). `reports/jev-261005-1730-consent-owner-lock-*.json`.

- ~~Mặc định bật kết bạn bằng mã~~ **Đã chốt (người sở hữu, 05/10/2026): kết bạn như game online thường, không mã, người nhận đồng ý; kết bạn được với bạn máy; mặc định bật.**

1. ~~Giờ chơi~~ **Đã chốt (người sở hữu, 04/10/2026): không làm giới hạn giờ chơi; chỉ xem thời gian chơi.** Cân nhắc ban đầu: chỉ **xem** thời gian chơi, hay cho phụ huynh **đặt giới hạn giờ** (khóa bé sau X phút)? Giới hạn giờ là thay đổi hành vi nhìn thấy với bé, nên cần người sở hữu quyết; đề xuất chỉ xem ở đợt này.
