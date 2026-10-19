# Kiểm duyệt, an toàn kết nối và tắt khẩn cấp cho chơi online (không chống cheat)

**Trạng thái:** **đang thi công** từ 19/10/2026; pha 1–5 xong và đã lên production `8ee8c73c` ngày 19/10/2026 (người sở hữu duyệt; migration `0023_moderation`; `MODERATOR_ACCOUNTS` đặt một tài khoản) (report `plans/dattqh/reports/moderation-safety-261019.md`), pha 6 chưa làm (người sở hữu duyệt mở lại theo tư vấn của Jev 0,87, vì người ngoài gia đình chơi được từ 12/10/2026); hoãn trước đó từ 04/10/2026 · **Tier:** M · **Nhánh:** `main` · **Ngày:** 04/10/2026
**Nguồn:** Master Plan §8 (điều kiện mở bậc 2: "có kiểm duyệt và quy trình xử lý báo cáo"; "Khuyến nghị: chưa có đội kiểm duyệt thì dừng ở bậc 1"), §9 (dòng Multiplayer: bắt nạt, kết nối giả mạo), §8b ("công tắc tắt khẩn cấp, giới hạn tải server").

## Quyết định mở lại (19/10/2026, Jev qua `tools/decisions/jev-decide.py`, người sở hữu duyệt mở plan)

- Người xử lý báo cáo: người sở hữu, trong màn kiểm duyệt, kèm bản tóm tắt báo cáo mới mỗi ngày (thư trong Hộp thư của tài khoản người sở hữu); ca gấp dùng công tắc khẩn cấp (Jev 0,94). Câu hỏi mở 1 đã chốt (a).
- Nhật ký quanh báo cáo giữ 14 ngày, đúng như trang `/privacy` đang hứa cho log; không đổi chính sách (Jev 0,99). Câu hỏi mở 2 đã chốt.
- Tự động bảo vệ: một người chơi bị báo cáo bởi 3 tài khoản khác nhau trong 24 giờ thì bị ẩn khỏi người khác (khóa online tạm) tới khi người kiểm duyệt quyết (Jev 0,90).
- Đo tải (pha 6): trên máy dev với server local, một job một lúc, kiểm tải máy trước, ghi giới hạn người mỗi room (Jev 0,97); không đo trên production.
- Câu hỏi mở 3: giữ thưởng do server tính, như các quyết định trước.

## Quyết định của người sở hữu (04/10/2026)

**Báo cáo vi phạm và kiểm duyệt: bỏ qua.** "Game hiện tại chưa có ai chơi ngoài tôi và bé." Plan này giữ nguyên làm hồ sơ, không thi công. **Điều kiện mở lại:** trước ngày đầu tiên có người ngoài gia đình chơi (kể cả bạn của bé) hoặc trước khi bật bạn bè/co-op cho họ; khi đó duyệt lại câu hỏi mở 1 và làm theo thứ tự các pha dưới đây (Master Plan §8, §9). Công tắc online ở `parent-area-friends` đủ để tắt tương tác trong thời gian này.

**Chống cheat: bỏ hẳn** (lý do ngay dưới).

"Game này không đặt nặng chống cheat, thậm chí cho cheat." Vì vậy plan này **không** có phần kiểm tốc độ, va chạm, cooldown hay kéo vị trí về lúc hợp lệ; bé có thể "bay", chạy nhanh hay đi xuyên tường trong game mà không bị can thiệp.

Ranh giới cần giữ (không phải chống cheat, mà là an toàn trẻ em và chống làm sập server):

- **Tên, loài, trang phục của bé do server cấp** (plan `261004-1540` P1), vì đó là danh tính hiển thị cho trẻ khác: đổi tên thành chữ không phù hợp là vấn đề an toàn, không phải gian lận.
- **Thưởng, XP, Xu, mở khóa vẫn do server tính** (luật của `CLAUDE.md` và Master Plan §9, đã áp dụng ở mọi chỗ). Giữ nguyên vì không tốn thêm việc và để dữ liệu học của bé đáng tin; nếu người sở hữu muốn nới luật này thì đó là quyết định riêng (xem câu hỏi mở 3).
- **Giới hạn kích thước và tần suất message**: để server không bị dội, không để lọt chữ ngoài danh sách câu có sẵn.

## Kết quả mong muốn

Trước khi mở bất kỳ tương tác nào ngoài "thấy nhau" (bạn bè, co-op, sự kiện), hệ thống có đủ: báo cáo vào hàng đợi có người xử lý được, kết nối WS có vé ngắn hạn và giới hạn message, và một công tắc tắt online khẩn cấp.

## Không làm (ghi rõ)

- Không chống cheat: không kiểm tốc độ di chuyển, va chạm, cooldown emote/mời, không đá người chơi vì hành vi "bất thường" của chuyển động.
- Không chat tự do (chỉ câu có sẵn), nên không cần lọc văn bản tự do; mọi chữ trên đường truyền phải thuộc danh sách câu có sẵn.
- Không xây đội kiểm duyệt 24/7; chỉ dựng công cụ để một người (người sở hữu hoặc người được giao) xử lý hàng đợi.
- Không lưu quỹ đạo thô; nhật ký quanh báo cáo giữ ngắn hạn.

## Hiện trạng đo được (04/10/2026)

- `apps/server/src/multiplayer`: `multiplayer-hub.ts` (room theo `mapId`, giao thức `welcome/spawn/move/emote/chat/despawn`), `bot-runner.ts`. Bot gắn nhãn "Bạn máy", câu có sẵn `SAFE_CANNED_CHATS`.
- Plan `261004-1540` sẽ thêm: WS đọc cookie phiên, `player_blocks`, `player_reports`, tổ đội; **ghi rõ chưa có màn kiểm duyệt**.
- `apps/server/src/rate-limit.ts` đã có cho API HTTP; chưa rà cho WS. Chưa có công tắc khẩn cấp.

## Pha

| Pha | Tier | Nội dung | File sở hữu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | S | **Giới hạn message WS**: kích thước tối đa, số message mỗi giây theo kết nối, loại bỏ chữ ngoài danh sách câu có sẵn; vượt thì bỏ message (đá kết nối chỉ khi dội liên tục). Vị trí `move` chấp nhận như client gửi | `apps/server/src/multiplayer/**` | Xong 19/10/2026 (phần tự động): đã có 4 KB, 20 tin/giây, chỉ câu có sẵn; thêm đóng kết nối khi 200 tin bị bỏ trong 10 giây (`4429`) |
| 2 | S | **Vé ngắn hạn cho WS** theo phiên và hồ sơ (đổi từ cookie ở `261004-1540` P1 sang vé một lần có hạn vài chục giây), kiểm `Origin`, kiểm quyền ở mỗi message | `apps/server/src/multiplayer`, `apps/server/src/auth` | Xong 19/10/2026: `POST /api/online-ticket`, vé một lần 30 giây gắn cookie phiên; vẫn kiểm `Origin`, phiên kiểm lại mỗi 2 phút, khóa/công tắc kiểm ở mỗi tin |
| 3 | M | **Hàng đợi báo cáo**: mở rộng `player_reports` (loại: quấy rối, tên/đồ không hợp, khác; trạng thái; ghi chú xử lý), nhật ký ngắn hạn quanh sự việc (ai ở room, câu có sẵn đã gửi) | `apps/server/src/moderation/**` (mới), migration | Xong 19/10/2026: migration `0023_moderation` (chỉ thêm); nhật ký 14 ngày; ẩn tự động 3 người/24 giờ |
| 4 | M | **Màn kiểm duyệt cho người xử lý**: đăng nhập quản trị (vai riêng, không dùng tài khoản phụ huynh thường), danh sách báo cáo, hành động (bỏ qua, cảnh cáo, đổi tên nhân vật về tên sinh tự động, khóa online tạm/lâu dài một hồ sơ), thông báo kết quả tới phụ huynh bên bị báo cáo | `apps/web/src/ui/moderation/**` (mới), `apps/server/src/moderation` | Xong 19/10/2026: `/kiem-duyet`, người kiểm duyệt theo email `MODERATOR_ACCOUNTS` (không làm vai đăng nhập riêng, theo quyết định 19/10); thư tóm tắt mỗi ngày |
| 5 | S | **Công tắc khẩn cấp**: biến môi trường/cờ ở server tắt toàn bộ WS hoặc chỉ tương tác (giữ "thấy nhau"), client hiện thông báo thân thiện, không đẩy lỗi cho bé; tài liệu vận hành ở `docs/deployment-guide.md` | `apps/server/src/config.ts`, `apps/server/src/multiplayer`, `docs/` | Xong 19/10/2026: `ONLINE_MODE` + `PUT /api/moderation/online-mode`; `docs/deployment-guide.md` §7 |
| 6 | M | **Đo tải**: kịch bản 100 bot + N kết nối giả cùng room, đo CPU/băng thông/độ trễ tick, chốt giới hạn người mỗi room và tổng; kết quả ghi vào report (chạy trên máy chủ review, không chạy song song bộ test khác) | `tools/loadtest/**` (mới), `plans/dattqh/reports/` | Chưa làm (không thuộc đợt này) |

## Phụ thuộc và file dùng chung

- Pha 2 và pha 3 chạm `multiplayer-hub.ts` và schema đang được plan `261004-1540` sửa: làm **sau** khi 1540 P1–P2 commit.
- Pha 4 là bề mặt quản trị mới: cần kiểm quyền chặt (IDOR, tách vai), đưa vào bảng endpoint của báo cáo bảo mật.
- Sao lưu cơ sở dữ liệu trước mọi migration.

## Tiêu chí xong

- Message ngoài danh sách câu có sẵn bị loại; message quá lớn hoặc quá dày bị bỏ (test hub).
- Một báo cáo đi từ bé → hàng đợi → người xử lý → hành động → phụ huynh nhận thông báo (test tích hợp).
- Bật công tắc khẩn cấp thì online dừng trong vài giây và khôi phục khi tắt.
- Báo cáo đo tải có số liệu và giới hạn room được chốt.
- Gate chung đủ 5 lệnh + build web.

## Câu hỏi mở (cần người sở hữu)

1. **Ai xử lý báo cáo?** (a) Người sở hữu tự xử lý trong màn kiểm duyệt (đơn giản, phù hợp quy mô nhỏ, nhưng không phản hồi ngay); (b) giao người thứ hai; (c) **chưa mở bậc 2–3, dừng ở bậc 1** đúng khuyến nghị Master Plan §8. **Đề xuất (a) cho giai đoạn thử với nhóm nhỏ, kèm công tắc khẩn cấp; chỉ mở co-op/sự kiện cho người thật sau khi có người xử lý được cam kết.**
2. Thời gian giữ nhật ký quanh báo cáo (đề xuất 30 ngày rồi xóa) cần pháp chế xác nhận.
3. Giữ thưởng/XP do server tính (đề xuất giữ, vì đã làm xong và không tốn thêm), hay muốn cho phép "cheat" cả với thưởng, ví dụ chế độ mã bí mật tặng Xu cho vui? Nếu có, tôi sẽ lập plan riêng và gắn rõ để không lẫn với dữ liệu học.
