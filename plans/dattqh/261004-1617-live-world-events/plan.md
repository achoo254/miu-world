# Thế giới sống: sự kiện có thời hạn và bảng xếp hạng nhóm

**Trạng thái:** đã duyệt (04/10/2026); đã đọc tài liệu TIMO (xem mục dưới), còn một câu hỏi về tên và bản quyền trước khi viết nội dung · **Tier:** XL · **Nhánh:** `main` · **Ngày:** 04/10/2026
**Nguồn:** Master Plan §6 (Live World: banner sự kiện trên Home M1.1, chi tiết sự kiện TIMO M1.6, Event Quest, Event Reward), §8 (Bậc 3: sự kiện trực tiếp, bảng xếp hạng theo nhóm; điều kiện: bậc 1–2 chạy ổn và đã load test).

## Kết quả mong muốn

Người vận hành đặt một sự kiện có ngày bắt đầu/kết thúc bằng **dữ liệu** (không phát hành lại ứng dụng): banner trên Home, trang chi tiết, một chuỗi nhiệm vụ sự kiện, phần thưởng giới hạn thời gian (trang phục, nội thất, danh hiệu), và đếm ngược; hết hạn thì tự đóng, phần thưởng đã nhận giữ nguyên.

## TIMO là gì (đọc từ `TIMOK2.pdf`, 140 trang, ngày 04/10/2026)

File nằm ở repo anh em `bai-tap-lop-2/content/TIMOK2.pdf` (không nằm trong iCloud). **TIMO** là kỳ thi Olympic Toán học quốc tế *Thailand International Mathematical Olympiad*, tổ chức hằng năm; file là bộ đề ôn khối 2 của một đơn vị luyện thi (14 đề, mỗi đề có lời giải; ghi "Bản quyền thuộc về… nghiêm cấm sao chép", "tài liệu lưu hành nội bộ"). Mock M1.1 ở `bai-tap-lop-2/.../screens/extracted/06-event-timo.png` là banner **"TIMO Challenge"**: "Cánh cổng TIMO đã xuất hiện tại khu rừng!", bốn phần thưởng (thử thách đặc biệt, bài toán nâng cao, huy hiệu giới hạn, vật phẩm độc quyền), đếm ngược "Còn 12 ngày", nút "Tham gia ngay". Cùng repo có 13 màn mock luyện đề (`screens/generated/34`–`46`: cái cân, dãy số/hình, ngày tháng, ghép phép tính, chẵn lẻ, chia đều, đếm hình, hình khối 3D, thành lập số, đếm trường hợp, cỗ máy ngược, trang chủ đề, kết quả thi thử).

**Lịch thi thật (tin nhắn của cô chủ nhiệm trong nhóm lớp, ảnh chụp 04/10/2026):** ban tổ chức TIMO 2026-2027 thông báo lịch thi và văn bản quy chế gửi phụ huynh. Khối 2, 3, 5, 8 và THPT thi **thứ Bảy 10/10/2026**; mầm non và khối 1, 4, 6, 7, 9 thi Chủ nhật 11/10/2026. Mỗi khối có một đường link **thử nghiệm hệ thống** (Google Forms), thí sinh làm thử ngay khi nhận email, tức bài thi làm trực tuyến qua hệ thống của ban tổ chức. Ảnh chỉ chụp phần đầu tin nhắn (mục 2 "Thời gian thi" và các link khối); **không thấy** văn bản quy chế, giờ thi, thiết bị/giám sát, vòng thi nào diễn ra ngày 10/10 (vòng loại hay vòng quốc gia), cách nộp bài. Các mục đó cần ảnh chụp thêm hoặc file quy chế (câu hỏi mở 2).

Điều đọc được từ tài liệu dùng cho plan này:

| Điều trong tài liệu | Dùng trong game |
| --- | --- |
| Năm chủ đề: tư duy logic, số học, lý thuyết số, hình học, tổ hợp | Năm "ngăn" của cổng TIMO; khung chủ đề khối 2: bài toán cái cân, dãy số/hình quy luật, tuổi và ngày tháng, cộng trừ 2–3 chữ số, cân bằng phép tính, chẵn lẻ, chia đều, ghép phép tính, đếm hình 2D/3D, quan sát hình 3D, chia đồ vật vào nhóm, đếm trường hợp, thành lập số |
| Cấu trúc: vòng loại 25 câu × 4 điểm = 100, 60 phút, trắc nghiệm; vòng quốc gia 25 câu điền đáp án | Bản game rút gọn: một "lượt thi thử" 10–15 câu mỗi chủ đề, **không tính giờ chặt** (xem Không làm), điểm 100 |
| Mốc huy chương theo điểm: Khuyến khích ≥ 20, Đồng ≥ 40, Bạc ≥ 60, Vàng ≥ 80 (trên 100) | Huy hiệu giới hạn bốn bậc theo điểm bé tự đạt, không xếp hạng so với bạn |

## Không làm (ghi rõ)

- **Không chép đề, lời giải hay hình của `TIMOK2.pdf`** vào repo (công khai, MIT) hay vào game: tài liệu có bản quyền của đơn vị luyện thi và ghi rõ cấm sao chép. Chỉ dùng **khung chủ đề** (ý tưởng, không bảo hộ) và **tự viết đề mới** tương đương độ khó. Không commit file PDF.
- Không tính giờ chặt, không "hết giờ là thua": trẻ lớp 2 cần đọc kỹ; có đồng hồ nhẹ chỉ để tham khảo (bản thật 60 phút chỉ là ví dụ).
- Không xếp hạng thí sinh trên toàn quốc, không "Ngôi sao thế giới/Vô địch" kiểu cúp xếp hạng: chỉ huy hiệu theo mốc điểm của chính bé.
- Không áp lực mua/chờ ("chỉ còn…" gây lo lắng), không mua bằng tiền thật, không quảng cáo bên thứ ba.
- Bảng xếp hạng chỉ **theo nhóm** (đội/lớp/map), hiển thị tên nhân vật đã chọn, không xếp hạng cá nhân công khai giữa người lạ.
- Không bỏ lỡ sự kiện thì mất đồ vĩnh viễn gây buồn: đồ giới hạn có phiên bản "kỷ niệm" mở lại sau (câu hỏi mở).
- Không mở khi bậc 1–2 chưa ổn và chưa đo tải.

## Hiện trạng đo được (04/10/2026)

- Không có mã nào về sự kiện trong `apps`, `docs`, `content`, `packages` (quét ngày 04/10/2026); Master Plan nhắc ở §6, §8 và mock M1.1/M1.6. Tài liệu TIMO nằm ngoài repo này (mục trên).
- Đã có sẵn dùng lại: rương thưởng khu vực (`content/region-rewards.json`), cửa hàng (`content/shop`), danh hiệu ở hồ sơ, quest dữ liệu, thưởng server.

## Pha

| Pha | Tier | Nội dung | File sở hữu |
| --- | --- | --- | --- |
| 0 | M | **Bản luyện thi nhanh trước 10/10/2026** (chỉ làm nếu người sở hữu chọn ở câu hỏi mở 3): bản một người, không bảng xếp hạng, không co-op, không cần `moderation-safety`; làm lát cắt nhỏ nhất của pha 6 và 6b: một cổng "Luyện TIMO" ở Khu rừng, các dạng bài khối 2 tự viết (cái cân, dãy quy luật, chẵn lẻ, chia đều, đếm hình, hình khối), thi thử 25 câu trắc nghiệm điểm 100 và huy hiệu theo mốc điểm; đề dạng dữ liệu để pha 1–6 dùng lại, đóng cổng ngày 10/10/2026 | `content/events/**`, `content/quests/**`, `apps/web/src/ui/event/**` |
| 1 | M | **Mô hình sự kiện bằng dữ liệu**: `content/events/<id>.json` (tên, mô tả, ngày bắt đầu/kết thúc theo giờ Việt Nam, banner, danh sách quest sự kiện, phần thưởng, tiêu chí); schema + `content:check` (không trùng id, ngày hợp lệ, quest tồn tại, thưởng có thật) | `packages/schema`, `content/events/**`, `tools/content/**` |
| 2 | M | **Server**: API danh sách sự kiện đang chạy/sắp tới (giờ do server quyết, không tin đồng hồ máy bé), kiểm quest sự kiện chỉ chơi được trong cửa sổ thời gian, thưởng giới hạn ghi vào sổ thưởng như thường | `apps/server/src/event/**` (mới) |
| 3 | M | **Giao diện**: banner trên Home (theo mock M1.1), trang chi tiết (M1.6: mô tả, mốc thưởng, đếm ngược nhẹ nhàng), màn Event Quest và Event Reward theo mock cảnh | `apps/web/src/ui/event/**` (mới), `apps/web/src/ui/home` |
| 4 | M | **Cảnh sự kiện**: trang trí map theo chủ đề sự kiện (cờ, đèn, gian hàng) bật theo dữ liệu, NPC sự kiện xuất hiện/biến mất đúng giờ, không sinh lại map (lớp trang trí lúc chạy) | `apps/web/src/game/**` (module mới), `content/events/**` |
| 5 | M | **Bảng xếp hạng nhóm**: điểm sự kiện cộng dồn theo đội/nhóm, xếp hạng theo nhóm, chống gian lận (điểm từ server, giới hạn tần suất), ẩn khi nhóm < 3 bé; phụ huynh tắt được | `apps/server/src/event`, `apps/web/src/ui/event` |
| 6 | L | **Sự kiện đầu tiên: "Cổng TIMO" ở Khu rừng** (theo mock M1.1): cổng ma thuật bật theo dữ liệu, năm ngăn theo năm chủ đề của khung chương trình, mỗi ngăn 8–10 câu **tự viết** (cái cân, dãy quy luật, chẵn lẻ, chia đều, đếm hình, hình khối 3D…) dùng lại cơ chế `sort`, `drag-drop`, `quiz`, `connect` và `logic`/`find-object` của `boss-skill-check-new-mechanics`; trò thi thử cuối cổng 25 câu (trắc nghiệm), điểm 100; bốn huy hiệu giới hạn theo mốc 20/40/60/80 điểm; thưởng đồ độc quyền (mock: "vật phẩm độc quyền"); bản "kỷ niệm" mở lại sau sự kiện; kiểm chống lặp và không trùng đề với tài liệu gốc | `content/events/**`, `content/quests/**`, `content/shop/**`, `content/world/**` |
| 6b | M | **Màn luyện đề theo mock `34`–`46`**: trang chủ đề, từng dạng bài, kết quả thi thử, theo mock cảnh; mỗi dạng bài là cơ chế dữ liệu, thêm đề chỉ bằng dữ liệu | `apps/web/src/ui/event/**`, `apps/web/src/ui/challenge/**` |
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

1. **Tên "TIMO" trong game công khai**: TIMO là kỳ thi và thương hiệu của bên khác. Dùng tên "TIMO Challenge" như mock có thể bị hiểu là game liên kết chính thức với kỳ thi. Tùy chọn: (a) giữ tên TIMO vì bạn có quan hệ/giấy phép với đơn vị tổ chức hoặc đơn vị luyện thi; (b) đặt tên chung như "Thử thách Olympic Toán" và chỉ nói "theo dạng đề Olympic" mà không dùng nhãn TIMO. **Đề xuất (b)**, đổi tên một chỗ trong dữ liệu sự kiện khi cần; nếu bạn xác nhận có quyền dùng tên thì chuyển (a).
2. Ngày thi thật của khối 2 là **10/10/2026** (đã biết từ tin nhắn lớp). Còn thiếu thể lệ và cách thi: vòng nào, giờ nào, làm trên thiết bị gì, thời lượng, trắc nghiệm hay điền đáp án. Bạn gửi thêm ảnh phần còn lại của tin nhắn (các mục trước và sau mục 2, và văn bản quy chế đính kèm nếu có) thì tôi chỉnh dạng đề và độ khó của bản luyện cho khớp.
3. **Có làm bản luyện thi nhanh (Pha 0) trước 10/10 không?** Hôm nay là 04/10, còn 6 ngày. Toàn bộ plan sự kiện là XL và phụ thuộc kiểm duyệt, không kịp. Tùy chọn: (a) làm Pha 0 một người, nhỏ gọn, để bé luyện đúng dạng đề trước ngày thi (đề xuất, nếu mục tiêu của bạn là giúp bé ôn thi); (b) giữ nguyên thứ tự cũ, sự kiện làm sau, coi kỳ thi 2026 như đã qua. Pha 0 sẽ chen lên trước `system-screens-v1` và các plan đã duyệt.
4. Đồ giới hạn có mở lại dưới dạng "kỷ niệm" không? Đề xuất **có**, để bé vào muộn không buồn.
