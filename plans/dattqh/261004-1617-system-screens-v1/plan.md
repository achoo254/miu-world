# Màn hình hệ thống V1: Hộp thư, Skill Up, Cài đặt hoàn chỉnh, chuỗi ngày

**Trạng thái:** đã duyệt (04/10/2026), chưa thi công · **Tier:** M · **Nhánh:** `main` · **Ngày:** 04/10/2026
**Nguồn:** Master Plan §1 (tiền tệ hiển thị gồm "chuỗi ngày (streak)"), §6 (NEW SCREEN: Level Up/Skill Up; Pause, Cài đặt, **Hộp thư**), §5 ("Skill XP: 'Kỹ năng đọc +1'").

## Kết quả mong muốn

1. **Hộp thư** trong game: thư từ NPC (plan `261003-2330` N2 có "thư và quà giữa NPC"), quà từ cửa hàng/rương, thông báo hệ thống thân thiện (cập nhật mới, nhắc việc dở); đọc xong nhận quà đính kèm một lần, do server tính.
2. **Skill Up**: khoảnh khắc lên cấp kỹ năng riêng, song song màn Level Up đã có (`apps/web/src/ui/rewards`), hiện kỹ năng, cấp mới, quà (liên kết cây kỹ năng của plan `261003-1602` pha 5).
3. **Cài đặt hoàn chỉnh**: gom âm thanh, giọng đọc, ngôn ngữ, bạn máy, nhạc nền, hiệu ứng chuyển động giảm (cho bé nhạy cảm), cỡ chữ, vào cùng một màn có Pause hiện có.
4. **Chuỗi ngày** (nếu người sở hữu đồng ý, câu hỏi mở 1): đếm số ngày bé chơi liên tiếp theo cách **nhẹ**, không phạt khi đứt.

## Không làm (ghi rõ)

- Không email/SMS/đẩy thông báo ngoài game; hộp thư chỉ hiển thị trong game.
- Không chuỗi ngày kiểu "mất hết nếu bỏ một ngày"; không nhắc gây áp lực; không gắn thưởng lớn (tránh thói quen ép chơi).
- Không Kim cương (Master Plan §15 #6).
- Không lưu chữ do bé gõ trong thư (bé chỉ nhận, không soạn thư tự do).

## Hiện trạng đo được (04/10/2026)

- Đã có: Pause, `settings.css`, `sound-setting.ts`, `voice-setting.ts`, `language-setting.tsx`, `bot-setting.tsx` rời nhau trong `apps/web/src/ui/system`; Level Up trong `rewards`.
- Chưa có: hộp thư, màn Skill Up, màn Cài đặt gom, chuỗi ngày (quét `apps`, `content`, `packages`).
- Server có `reward_ledger`, `skill_progress`, `inventory_items`; chưa có bảng thư.

## Pha

| Pha | Tier | Nội dung | File sở hữu |
| --- | --- | --- | --- |
| 1 | S | **Cài đặt gom**: một màn nhóm theo mục (Âm thanh, Giọng đọc, Ngôn ngữ, Bạn máy, Hiển thị), dùng lại các công tắc có sẵn; thêm "giảm chuyển động" và cỡ chữ; lưu theo hồ sơ khi cần đồng bộ thiết bị | `apps/web/src/ui/system/**` |
| 2 | M | **Hộp thư**: bảng `mail` (theo hồ sơ: id nội dung, loại, đã đọc, đã nhận quà), thư là **dữ liệu** `content/mail/*.json` (mẫu thư NPC, thông báo, quà), server tạo thư theo sự kiện (xong quest, lên cấp, mở NPC thân thiết…), API đọc/nhận quà một lần (idempotent), huy hiệu số thư chưa đọc ở HUD | `apps/server/src/mail/**` (mới), `content/mail/**`, `apps/web/src/ui/mail/**` (mới) |
| 3 | S | **Skill Up**: server báo cấp kỹ năng mới trong kết quả thưởng; màn riêng theo mock cảnh, nối vào chuỗi hoàn thành quest sau Level Up | `apps/web/src/ui/rewards/**`, `apps/server/src/reward` |
| 4 | S | **Chuỗi ngày** (chỉ làm khi được duyệt): ngày chơi tính theo giờ server, đếm liên tiếp, có "ngày nghỉ miễn phí" mỗi tuần; hiển thị nhỏ ở Hồ sơ và trên phần thưởng; không có màn nhắc | `apps/server/src/reward`, `apps/web/src/ui/profile/**` |
| 5 | S | Tài liệu và trang review | `docs/`, `apps/web/review.html` |

## Phụ thuộc và file dùng chung

- Pha 2 dùng nội dung thư từ N2 (`261003-2330`); làm trước vẫn được với thư thông báo/quà, nối thư NPC sau.
- Pha 3 dùng cấp kỹ năng của `261003-1602` pha 5; nếu chưa xong thì dùng `skill-curve.json` hiện có.
- `pause-screen.tsx` và `hud.tsx` đang được nhiều phiên đụng: thêm nút bằng module riêng, nối một dòng.
- Migration nối tiếp, sao lưu cơ sở dữ liệu trước khi chạy.

## Tiêu chí xong

- Mở hộp thư, đọc, nhận quà một lần (nhận lần hai không cộng thêm, test server); thư chưa đọc có huy hiệu số.
- Lên cấp kỹ năng thì có màn Skill Up đúng kỹ năng và cấp.
- Cài đặt đổi được tất cả mục và áp dụng ngay.
- Chuỗi ngày (nếu bật): đứt chuỗi không mất thưởng đã nhận.
- Gate chung đủ 5 lệnh + build web.

## Câu hỏi mở (cần người sở hữu)

1. ~~Có làm chuỗi ngày không?~~ **Đã chốt (Jev 04/10/2026 (`reports/jev-261004-1648-open-questions.md`)): không làm; bỏ pha 4 và mục 4 của Kết quả mong muốn.** Cân nhắc ban đầu: Master Plan §1 có nhắc nhưng chưa có quyết định ở §15, và có rủi ro tạo áp lực với trẻ nhỏ. Đề xuất: **làm phiên bản nhẹ** (ngày nghỉ miễn phí, không phạt, thưởng nhỏ) hoặc **bỏ hẳn** nếu muốn giữ tinh thần "không ép chơi". Không có quyết định thì bỏ pha 4.
