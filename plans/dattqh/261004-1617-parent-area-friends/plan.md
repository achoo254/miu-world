# Tiến bộ học, bạn bè bằng mã, công tắc online của người chơi

**Trạng thái:** thiết kế lại theo định hướng mọi lứa tuổi (05/10/2026), chưa thi công · **Tier:** L · **Nhánh:** `main` · **Ngày:** 04/10/2026, sửa 05/10/2026
**Nguồn:** Master Plan §6, §9; định hướng mới của người sở hữu (05/10/2026, `.claude/rules/product-audience.md`): game cho mọi lứa tuổi, không cần phụ huynh giám sát, không đặt tính năng sau phê duyệt của phụ huynh. Quyết định thiết kế lại: Jev (`reports/jev-261005-1330-friends-rescope-{input,output}.json`). Bản 04/10 (phụ huynh bật online, hai phụ huynh duyệt bạn) không còn dùng.

## Kết quả mong muốn

1. **Tiến bộ học** (Jev 0.43, chọn `player_and_owner`): mỗi người chơi thấy tiến bộ của mình trong Hồ sơ (môn, kỹ năng mạnh/yếu, 3 bài gợi ý, thời gian chơi theo tuần, chỉ số đếm); chủ tài khoản thấy thêm của mọi người chơi trong tài khoản ở mục Quản lý tài khoản.
2. **Công tắc online và bạn máy** (Jev 0.64, `player_setting`): là cài đặt của chính người chơi trong Cài đặt, lưu ở server theo người chơi; chủ tài khoản đổi được cho người chơi phụ từ Quản lý tài khoản. Có hiệu lực ngay, kể cả đang trong phòng.
3. **Kết bạn bằng mã** (Jev 0.86, `players_accept`): mỗi người chơi có mã bạn (ngẫu nhiên, đổi được); nhập mã của nhau tạo lời mời, người nhận tự chấp nhận, không cần phụ huynh duyệt; chủ tài khoản xem và xóa bạn của người chơi phụ. Không tìm kiếm công khai, không chat tự do.
4. **Mặc định bật kết bạn bằng mã** (Jev 0.27, `on_by_code`, rủi ro cao: chờ người sở hữu xác nhận trước pha 3): chỉ qua mã chia sẻ riêng; trước khi mở bất kỳ cách tìm người chơi công khai nào thì làm `moderation-safety`.
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
| 2 | M | Cột `online_enabled`, `bots_enabled` trên người chơi (migration, sao lưu trước); người chơi đổi trong Cài đặt, chủ tài khoản đổi cho người chơi phụ; hub kiểm khi vào phòng và đưa ra khi tắt; bỏ lưu cục bộ | `apps/server/src/db`, `apps/server/src/multiplayer`, `apps/web/src/ui/system/**` |
| 3 | L | Bạn bè: `friend_codes`, `friend_requests`, `friendships`; mã 6 ký tự không đọc nhầm, đổi được, giới hạn thử mã; người nhận tự chấp nhận; danh sách bạn chỉ hiện tên nhân vật | `apps/server/src/friend/**` (mới), `packages/schema`, `apps/web/src/ui/friends/**` (mới) |
| 4 | M | Danh sách chặn của người chơi, bỏ chặn, xóa bạn; chủ tài khoản quản lý bạn và chặn của người chơi phụ | `apps/web/src/ui/friends/**`, `apps/server/src/multiplayer` |
| 5 | S | Văn bản: trang quyền riêng tư mô tả mã bạn và dữ liệu chia sẻ khi online (tên nhân vật, trang phục, vị trí trong phòng); nếu đổi cách chia sẻ thì nâng lời đồng ý và hỏi người sở hữu trước | `content/legal/**` |

## Phụ thuộc và file dùng chung

- Pha 4 cần `player_blocks` của plan `261004-1540`; pha 2 nối vào hub của plan đó.
- Pha 3 (mặc định bật) và pha 5 (cách chia sẻ dữ liệu): hỏi người sở hữu trước khi bật cho người thật.
- Migration nối tiếp số hiện có (đã có 0006 home_decor, 0007 shop, và các số sau từ phiên khác); đọc `apps/server/src/db/migrations` ngay trước khi tạo, sao lưu cơ sở dữ liệu trước khi chạy migration.

## Tiêu chí xong

- Mỗi người chơi thấy đúng tiến bộ của mình; chủ tài khoản thấy người chơi của tài khoản mình (test IDOR: không xem được người chơi của tài khoản khác).
- Tắt online thì người chơi đang trong phòng được đưa ra và không vào lại được; bạn máy ẩn theo công tắc.
- Kết bạn thành khi người nhận chấp nhận; không có đường tìm người chơi công khai; mã sai quá giới hạn thì khóa tạm.
- Không trường nào trong API bạn bè chứa dữ liệu nhận dạng thật (test schema).
- Gate chung đủ 5 lệnh + build web.

## Câu hỏi mở

- Người sở hữu xác nhận mặc định **bật** kết bạn bằng mã trước khi có kiểm duyệt (Jev 0.27, rủi ro cao), trước khi làm pha 3.

1. ~~Giờ chơi~~ **Đã chốt (người sở hữu, 04/10/2026): không làm giới hạn giờ chơi; chỉ xem thời gian chơi.** Cân nhắc ban đầu: chỉ **xem** thời gian chơi, hay cho phụ huynh **đặt giới hạn giờ** (khóa bé sau X phút)? Giới hạn giờ là thay đổi hành vi nhìn thấy với bé, nên cần người sở hữu quyết; đề xuất chỉ xem ở đợt này.
