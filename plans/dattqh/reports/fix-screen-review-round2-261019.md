# Sửa ghi chú duyệt ảnh trước release, vòng 2 (19/10/2026)

Ảnh duyệt: bộ chụp ở commit `11e785f2`. Sửa trên `main`, commit cục bộ (chưa push).

| # | Ghi chú | Nguyên nhân (đã chứng minh) | Thay đổi | Commit |
|---|---|---|---|---|
| 1 | `360x740/02-players`: không có thẻ người chơi | Chụp sớm, không phải lỗi giao diện. `ProfilePickerScreen` vẽ khung trước, danh sách người chơi đọc từ API về sau (`profiles === null` thì không có thẻ, không có dòng "trống"). Spec chỉ chờ khung `[data-id="profiles"]`. Bằng chứng: `layoutFacts` (đo ngay sau khi chụp) của chính ảnh đó ghi `[data-id="profiles-add"] at 80,505–280,744`, tức thẻ đã có mặt vài mili giây sau. Các thay đổi `462d9f01..11e785f2` (mây xa trong `sky-scene.tsx`, `modal`/`scene.css`) không đụng màn này; tài khoản kiểm duyệt của `0e27a272` tạo sau ảnh 02. | Spec chờ thẻ người chơi đầu tiên, thẻ "Thêm người chơi", và ảnh nhân vật trong thẻ đã tải. | `95c9164c` |
| 2 | `25-online-off`: thông báo che nút "Nhiệm vụ", cắt tên thẻ nhiệm vụ (iPad), che thẻ người chơi và nút bản đồ (điện thoại) | Thông báo nằm chung hàng thẻ online ở mép trên (`.online-cards`, chỗ của lời mời cần trả lời), đè lên hàng HUD. | Thông báo tạm nghỉ ra khỏi hàng trên, thành thẻ gọn riêng (`.online-pause`) ở giữa màn, phía trên nút Lái xe/Tương tác/toast (đáy cách mép dưới 16rem), chữ `--text-sm`, vẫn có "Đã hiểu", vẫn ẩn khi màn khác phủ game. Test thêm: thẻ không nằm trong hàng thẻ trên. | `c3f5267e` |
| 3 | `26-moderation`: không có lối ra, "Bỏ qua" trông như chữ, lộ "ONLINE_MODE", loài hiện "(cat)" | Màn mới chưa có nút quay lại; nút ghost viền trắng trên panel trắng; câu gợi ý nhắc tên biến; hiển thị id loài. | Nút "Quay lại" (`Link` tới `/`, nút ghost cỡ thường ≥ 3,25rem) ở đầu trang như màn Phiếu viết; nút ghost trong panel kiểm duyệt có viền `--color-field-edge` (Bỏ qua, Thôi, Thử lại); câu gợi ý: "…quay về chế độ mặc định trong cấu hình máy chủ" (vi + en); loài lấy tên tiếng Việt từ `content/species.json` ("Bông (Cáo)"). Test thêm cho cả ba. | `1dd840bb` |
| 4 | `820x1180/12-event-panel`: chữ màn Home lộ dưới bảng sự kiện | Dải dưới bảng là backdrop của cảnh: scrim gần trong suốt ở giữa (gradient tỏa tròn) và lớp mờ `backdrop-filter` không được vẽ ở bản chụp (chữ Home sắc nét); lần trước chỉ thêm padding safe-area. Lần chạy chụp đầu với scrim đậm + mờ 16px xác nhận điều này: dải tối đi (pixel ~175 → ~128) nhưng chữ vẫn đọc được. | Backdrop của `.scene-sheet` (bảng sự kiện, bảng Olympic) thành nền trời mờ tối, đục hẳn (`--color-backdrop` phủ lên gradient trời bằng token), không phụ thuộc blur. | `5809488c`, `f20b323f` |
| 5 | `27-puzzle-clues`: hộp manh mối lặp ba đáp án, không có tiêu đề; chân dung "B" | Nội dung: `elements` của bước `coc-giau-bi` là ba cái cốc (trùng `choices`), còn manh mối nằm trong `prompt`. Đây là bước puzzle duy nhất trong `content/quests` có `elements` trùng `choices` (đã quét). Chân dung: `npcIcon` không có mẫu tên "Bồ câu". | `elements` thành ba manh mối thật ("Ba chiếc cốc úp thành hàng: đỏ, xanh, vàng.", "Bi không ở dưới chiếc cốc đứng giữa.", "Cốc có bi không cùng màu với quả chuối chín."), `prompt` gọn lại, không lặp manh mối; đáp án và hỗ trợ giữ nguyên. Hộp manh mối có tiêu đề "🔎 Manh mối" (`challenge.clues`, en "Clues"). Chân dung: có sẵn icon `bird` (đang dùng cho "chim", "họa mi"), thêm "bồ câu" vào mẫu tên. Test thêm cho tiêu đề và chân dung. | `570f7616` |

## Kiểm tra

- `pnpm assets:check`: OK, 16 pack, 4789 file.
- `pnpm content:check`: OK, 2151 file.
- Test liên quan: `online.test.tsx` 13/13, `moderation-screen.test.tsx` 5/5, `mechanics.test.tsx` 20/20, `npc-portrait.test.ts` 2/2, i18n 14/14.
- `pnpm typecheck`: sạch (server, web). `pnpm lint` (`eslint . --max-warnings=0`): 0 lỗi, 0 cảnh báo.

## Chạy bộ chụp ảnh

Máy rảnh (load 2,8–3,5; đã chờ một bộ E2E của dự án khác chạy xong), cổng 4173/8787/8788 trống. `pnpm --filter @miu/web screens` chạy hai lần (lần hai sau khi sửa thêm backdrop ở mục 4), cả hai `3 passed` (khoảng 1,7–1,8 phút): 27/27 màn `ok` ở mỗi cỡ, không màn nào `missing`.

Đã mở ảnh:
- 02 (cả hai cỡ): có thẻ "Mèo Mây" kèm ảnh nhân vật và thẻ "Thêm người chơi".
- 12 (iPad): dải dưới bảng là nền tối đục, không còn chữ Home; điện thoại không đổi.
- 25: thông báo nằm giữa màn, trên nút Chạy/Nhảy; nút Nhiệm vụ, Bản đồ, Ba lô, Menu, thẻ nhiệm vụ, Bạn bè, thú cưng đều không bị che, tên chương đọc đủ hai dòng. Trên điện thoại thẻ che một phần nhân vật giữa màn (vùng chơi, không phải nút), bấm "Đã hiểu" là tắt.
- 26: nút "Quay lại" ở đầu trang; "Bỏ qua" có viền như nút; câu gợi ý không còn ONLINE_MODE; loài hiện "(Mèo)".
- 27: hộp "🔎 Manh mối" có ba manh mối thật; ba nút đáp án vẫn là ba cốc; chân dung Bồ Câu Đưa Tin là icon chim.

Sau khi chạy: đã `git checkout -- assets/generated/review/screens assets/manifest.json`, xóa ảnh 25–27 mới sinh (chưa có trong git) và `test-results`; không commit ảnh chụp.

## Còn để ý

- Chân dung: không có ảnh bồ câu riêng trong bộ icon; dùng icon chim sẵn có (`bird`, Fluent, đã trong manifest). Nhân vật chưa có icon vẫn hiện chữ cái đầu tên.
- Câu hỏi `coc-giau-bi` đã đổi lời (`prompt`, `elements`); đáp án `do` và phần hỗ trợ giữ nguyên, khớp manh mối. Bước này không có bản `en`.
- Chưa push; CI (gồm build web và E2E) chạy khi push.

