# Khu vực phụ huynh: tiến bộ học, bạn bè bằng mã, phê duyệt, công tắc online

**Trạng thái:** đã duyệt (04/10/2026), chưa thi công · **Tier:** L · **Nhánh:** `main` · **Ngày:** 04/10/2026
**Nguồn:** Master Plan §6 (Tài khoản: khu vực phụ huynh; Multiplayer: danh sách bạn, phê duyệt bạn của phụ huynh), §9 ("kết bạn bằng mã, phụ huynh phê duyệt", "phụ huynh tắt được multiplayer"), plan `261003-1602` ("Phụ huynh: thấy kỹ năng nào mạnh/yếu, gợi ý bài nên chơi").

## Kết quả mong muốn

1. Phụ huynh vào khu phụ huynh (sau cổng PIN) thấy **bé học gì**: tiến độ theo môn và kỹ năng, kỹ năng mạnh/yếu, bài gợi ý chơi tiếp, thời gian chơi tổng theo tuần (chỉ số đếm, không quỹ đạo, không chữ bé gõ).
2. Phụ huynh **bật/tắt online** cho từng hồ sơ và **bật/tắt bạn máy**; thay đổi có hiệu lực ngay (kể cả đang trong phòng).
3. **Kết bạn an toàn**: bé có mã bạn (ngẫu nhiên, đổi được); nhập mã của bạn tạo lời mời; **cả hai phụ huynh phê duyệt** thì mới thành bạn; phụ huynh xem và xóa danh sách bạn của bé.
4. Phụ huynh xem **nhật ký hành vi tối giản** của bé online (đã chặn ai, đã báo cáo gì, vào đội nào) và quản lý danh sách đã chặn.

## Không làm (ghi rõ)

- Không chat tự do, không tên thật/email/trường của trẻ hiển thị cho trẻ khác (Master Plan §9).
- Không lưu quỹ đạo thô hay nội dung bé gõ để làm báo cáo.
- Không mở bạn bè công khai cho người ngoài gia đình khi `moderation-safety` (đang hoãn) chưa được mở lại và làm xong: công tắc mặc định **tắt** ở môi trường thật (câu hỏi mở của plan `261004-1540`: tắt mặc định, bật sẵn ở dev/review).
- Không nhắn tin giữa phụ huynh với nhau trong game.

## Hiện trạng đo được (04/10/2026)

- Có: `apps/web/src/ui/account/` (đăng nhập Google, cổng PIN, `parent-area-screen.tsx`, đồng ý draft-3, xuất/xóa dữ liệu), `ui/parent/worksheets`, `bot-setting.tsx` (công tắc bạn máy lưu cục bộ `miu.bots.enabled`).
- Chưa có: màn tiến bộ theo kỹ năng, công tắc online ở server, bạn bè, phê duyệt.
- `apps/server/src/skill`: `skill_progress` đã có (kỹ năng + ngưỡng cấp ở `content/progression/skill-curve.json`).

## Pha

| Pha | Tier | Nội dung | File sở hữu |
| --- | --- | --- | --- |
| 1 | M | API và màn **tiến bộ học**: tổng hợp từ `skill_progress`, quest xong, minigame; kỹ năng mạnh/yếu; gợi ý 3 bài (chọn từ quest chưa làm cùng kỹ năng yếu); biểu đồ theo tuần | `apps/server/src/child-profile`, `apps/web/src/ui/parent/**` |
| 2 | M | Cột `online_enabled`, `bots_enabled` trên hồ sơ (migration), API đổi bởi phụ huynh sau PIN; hub kiểm khi vào room và đá bé ra khi tắt; bỏ lưu `miu.bots.enabled` cục bộ, đọc từ hồ sơ | `apps/server/src/db`, `apps/server/src/multiplayer`, `apps/web/src/ui/system/bot-setting.tsx` |
| 3 | L | Bạn bè: bảng `friend_codes`, `friend_requests`, `friendships`; mã 6 ký tự không đọc nhầm, hết hạn, giới hạn thử mã (rate limit); luồng phê duyệt hai phụ huynh (thông báo trong khu phụ huynh, không email); danh sách bạn trong game chỉ hiện tên nhân vật đã chọn từ danh sách | `apps/server/src/friend/**` (mới), `packages/schema`, `apps/web/src/ui/friends/**` (mới) |
| 4 | M | Nhật ký và danh sách chặn cho phụ huynh (đọc từ `player_blocks`, `player_reports` của plan `261004-1540`), nút bỏ chặn, xóa bạn | `apps/web/src/ui/parent/**`, `apps/server/src/multiplayer` |
| 5 | S | Văn bản đồng ý: cập nhật mô tả chia sẻ (tên nhân vật, trang phục, vị trí trong room) → lời đồng ý **v3** (Jev đã chốt kiểu v2 cho thời khóa biểu; phụ huynh đồng ý lại); chờ pháp chế | `content/legal/**`, `apps/server/src/auth/consent-store.ts` |

## Phụ thuộc và file dùng chung

- Pha 2–4 cần `player_blocks`, `player_reports` và công tắc của plan `261004-1540` pha P2; không làm trước.
- Pha 5 đổi cách chia sẻ dữ liệu trẻ em: theo `CLAUDE.md` phải **hỏi người trước** khi bật cho người thật.
- Migration nối tiếp số hiện có (đã có 0006 home_decor, 0007 shop, và các số sau từ phiên khác); đọc `apps/server/src/db/migrations` ngay trước khi tạo, sao lưu cơ sở dữ liệu trước khi chạy migration.

## Tiêu chí xong

- Phụ huynh thấy đúng tiến bộ của đúng hồ sơ (test IDOR: không xem được hồ sơ của phụ huynh khác).
- Tắt online thì bé đang trong room bị đưa ra và không vào lại được; bot ẩn theo công tắc.
- Kết bạn chỉ thành khi cả hai phụ huynh duyệt; mã sai quá giới hạn thì khóa tạm.
- Không trường nào trong API bạn bè chứa dữ liệu nhận dạng thật (test schema).
- Gate chung đủ 5 lệnh + build web.

## Câu hỏi mở

1. ~~Giờ chơi~~ **Đã chốt (người sở hữu, 04/10/2026): không làm giới hạn giờ chơi; chỉ xem thời gian chơi.** Cân nhắc ban đầu: chỉ **xem** thời gian chơi, hay cho phụ huynh **đặt giới hạn giờ** (khóa bé sau X phút)? Giới hạn giờ là thay đổi hành vi nhìn thấy với bé, nên cần người sở hữu quyết; đề xuất chỉ xem ở đợt này.
