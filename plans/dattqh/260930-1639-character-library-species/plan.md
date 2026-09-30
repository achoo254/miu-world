# Thư viện nhân vật dùng chung + mở Thỏ, Cáo, Gấu

**Trạng thái:** xong · **Tier:** L · **Nhánh:** `main`

## Kết quả mong muốn

- Bé chọn được Mèo, Thỏ, Cáo, Gấu ở màn Tạo nhân vật; server lưu loài; game, HUD, màn thưởng, thẻ hồ sơ hiện đúng con vật.
- Nhân vật ghép từ dữ liệu dùng chung, không làm riêng từng con, để sau này sinh hàng trăm NPC và đổi trang phục hàng loạt theo nhãn (người sở hữu yêu cầu 30/09/2026).

## Quyết định

- Bộ ghép thuần TS ở `packages/voxel/src/character-recipe.ts`: thân gốc + bộ phận theo loại + trang phục (biến thể màu) + bảng màu theo ô có tên; loài là công thức; nhân vật là `recipe` trong `content/characters.json`; quy tắc trang phục theo nhãn ở `content/outfit-rules.json` (chỉ tạo khi có sự kiện).
- Mỗi loài khai đủ bộ ô màu chung để loài nào cũng lắp được bộ phận và trang phục nào (test kiểm mọi tổ hợp trong `content/`).
- Server kiểm `species` theo `content/species.json` (không cứng enum); `species` trong bản cập nhật là tùy chọn, client cũ vẫn chạy; hồ sơ trả kèm loài.
- Hồ sơ trẻ không lưu giới tính: nhãn chỉ nằm trên dữ liệu nội dung (NPC). Lưu giới tính của trẻ là thay đổi thu thập dữ liệu, cần người sở hữu quyết.
- Vẫn build sẵn GLB mỗi nhân vật (1 draw call). Khi cần hàng trăm NPC: dựng lúc chạy bằng cùng bộ ghép trên một rig dùng chung, không phải một GLB mỗi con.
- Hướng mở rộng đã chừa: cánh (ô `wings`), đồ trên tay (ô phụ kiện ở xương tay + clip `holding-*`), xe, máy bay (vật thể khối riêng + clip `drive`/`sit`). Chưa làm.

## Nghiệm thu

- Ảnh render 4 loài; Mèo giữ đúng tạo hình đã duyệt.
- Gate đủ + E2E.
