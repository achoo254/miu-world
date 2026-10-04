# Thế giới sống: sự kiện có thời hạn và bảng xếp hạng nhóm

**Trạng thái:** đã duyệt (04/10/2026), cần làm rõ "TIMO" trước khi thi công · **Tier:** XL · **Nhánh:** `main` · **Ngày:** 04/10/2026
**Nguồn:** Master Plan §6 (Live World: banner sự kiện trên Home M1.1, chi tiết sự kiện TIMO M1.6, Event Quest, Event Reward), §8 (Bậc 3: sự kiện trực tiếp, bảng xếp hạng theo nhóm; điều kiện: bậc 1–2 chạy ổn và đã load test).

## Kết quả mong muốn

Người vận hành đặt một sự kiện có ngày bắt đầu/kết thúc bằng **dữ liệu** (không phát hành lại ứng dụng): banner trên Home, trang chi tiết, một chuỗi nhiệm vụ sự kiện, phần thưởng giới hạn thời gian (trang phục, nội thất, danh hiệu), và đếm ngược; hết hạn thì tự đóng, phần thưởng đã nhận giữ nguyên.

## Không làm (ghi rõ)

- Không áp lực mua/chờ ("chỉ còn…" gây lo lắng), không mua bằng tiền thật, không quảng cáo bên thứ ba.
- Bảng xếp hạng chỉ **theo nhóm** (đội/lớp/map), hiển thị tên nhân vật đã chọn, không xếp hạng cá nhân công khai giữa người lạ.
- Không bỏ lỡ sự kiện thì mất đồ vĩnh viễn gây buồn: đồ giới hạn có phiên bản "kỷ niệm" mở lại sau (câu hỏi mở).
- Không mở khi bậc 1–2 chưa ổn và chưa đo tải.

## Hiện trạng đo được (04/10/2026)

- Không có mã hay tài liệu nào về sự kiện/TIMO trong `apps`, `docs`, `content`, `packages` (quét ngày 04/10/2026); Master Plan chỉ nhắc ở §6, §8 và mock M1.1/M1.6.
- Đã có sẵn dùng lại: rương thưởng khu vực (`content/region-rewards.json`), cửa hàng (`content/shop`), danh hiệu ở hồ sơ, quest dữ liệu, thưởng server.

## Pha

| Pha | Tier | Nội dung | File sở hữu |
| --- | --- | --- | --- |
| 1 | M | **Mô hình sự kiện bằng dữ liệu**: `content/events/<id>.json` (tên, mô tả, ngày bắt đầu/kết thúc theo giờ Việt Nam, banner, danh sách quest sự kiện, phần thưởng, tiêu chí); schema + `content:check` (không trùng id, ngày hợp lệ, quest tồn tại, thưởng có thật) | `packages/schema`, `content/events/**`, `tools/content/**` |
| 2 | M | **Server**: API danh sách sự kiện đang chạy/sắp tới (giờ do server quyết, không tin đồng hồ máy bé), kiểm quest sự kiện chỉ chơi được trong cửa sổ thời gian, thưởng giới hạn ghi vào sổ thưởng như thường | `apps/server/src/event/**` (mới) |
| 3 | M | **Giao diện**: banner trên Home (theo mock M1.1), trang chi tiết (M1.6: mô tả, mốc thưởng, đếm ngược nhẹ nhàng), màn Event Quest và Event Reward theo mock cảnh | `apps/web/src/ui/event/**` (mới), `apps/web/src/ui/home` |
| 4 | M | **Cảnh sự kiện**: trang trí map theo chủ đề sự kiện (cờ, đèn, gian hàng) bật theo dữ liệu, NPC sự kiện xuất hiện/biến mất đúng giờ, không sinh lại map (lớp trang trí lúc chạy) | `apps/web/src/game/**` (module mới), `content/events/**` |
| 5 | M | **Bảng xếp hạng nhóm**: điểm sự kiện cộng dồn theo đội/nhóm, xếp hạng theo nhóm, chống gian lận (điểm từ server, giới hạn tần suất), ẩn khi nhóm < 3 bé; phụ huynh tắt được | `apps/server/src/event`, `apps/web/src/ui/event` |
| 6 | L | **Sự kiện mẫu đầu tiên** (nội dung): chủ đề theo mùa/ngày lễ, 6–8 nhiệm vụ (kể cả minigame và co-op nếu đã có), đồ giới hạn, bản "kỷ niệm" mở lại | `content/events/**`, `content/quests/**`, `content/shop/**` |
| 7 | M | **Đo tải sự kiện**: nhiều bé vào cùng lúc đầu sự kiện; dùng kịch bản đo tải của `moderation-safety` pha 6 | `tools/loadtest/**` |

## Phụ thuộc và file dùng chung

- Cần xong: `moderation-safety` (kiểm duyệt, tắt khẩn cấp, đo tải), `coop-quests` nếu sự kiện có co-op, `parent-area-friends` (công tắc).
- Pha 3 chạm màn Home (đang có người chỉnh): đọc `apps/web/src/ui/home` ngay trước khi sửa.

## Tiêu chí xong

- Thêm/sửa/xóa một sự kiện chỉ bằng dữ liệu rồi triển khai nội dung (không đổi mã).
- Quest sự kiện không chơi được ngoài cửa sổ thời gian dù bé sửa đồng hồ máy (test server).
- Hết hạn: banner biến mất, đồ đã nhận còn trong ba lô, quest đóng; trước giờ: hiện "sắp mở".
- Bảng xếp hạng không lộ dữ liệu nhận dạng, ẩn khi nhóm nhỏ.
- Gate chung đủ 5 lệnh + build web.

## Câu hỏi mở (cần người sở hữu)

1. **"TIMO" là gì** (đối tác, thương hiệu, chương trình nào) và có tài liệu/ngày sự kiện cụ thể không? Nếu là đối tác thương mại thì còn là quyết định về hợp tác và pháp lý, ngoài phạm vi AI tự quyết.
2. Đồ giới hạn có mở lại dưới dạng "kỷ niệm" không? Đề xuất **có**, để bé vào muộn không buồn.
3. Có sự kiện thật nào định chạy trước khi `moderation-safety` xong không? Nếu có, giới hạn ở sự kiện một người (không bảng xếp hạng, không co-op).
