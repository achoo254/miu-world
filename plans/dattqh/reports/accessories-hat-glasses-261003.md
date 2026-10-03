# Phụ kiện mới: mũ và kính (03/10/2026)

Plan: `plans/dattqh/261003-1038-more-accessories-spread-life/plan.md`, pha 1, nhóm khe (mũ, kính).

## Kết quả

Mỗi khe có thêm 51 món: 25 mẫu gốc mũ mới, 23 mẫu gốc kính mới, phần còn lại là biến thể màu (`variantOf`). Mọi tên đều là tiếng Việt và không trùng với món nào khác trong `content/accessories/` (đã kiểm cả file của các khe khác đang được thêm song song). Không sửa file cũ nào.

| Khe | Trước | Thêm | Sau | Mở từ cấp 1 (sau) |
| --- | --- | --- | --- | --- |
| `hat` | 28 | 51 | 79 | 36 |
| `glasses` | 21 | 51 | 72 | 31 |

Số món mới theo cấp mở khóa (`unlock.level`; cấp 1 là không có `unlock`), khe nào cũng như nhau:

| Cấp | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mũ | 10 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 2 | 2 |
| Kính | 10 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 2 | 2 |

Không biến thể nào mở sớm hơn mẫu gốc của nó.

## Mẫu gốc mới

**Mũ (25 mẫu gốc):**

| Cấp | Mẫu gốc và biến thể |
| --- | --- |
| 1–2 | Mũ tai bèo (xanh lá, hồng, vàng), Mũ tai mèo (cam, xám, đen), Mũ nấm chấm bi (đỏ, xanh), Mũ thủy thủ (trắng, xanh than), Mũ gà con vỏ trứng, Mũ dâu tây, Mũ tai thỏ (trắng, hồng) |
| 3–6 | Mũ gấu (nâu, trắng, gấu trúc), Băng đô vũ trụ (xanh lá, tím), Mũ dưa hấu, Mũ cao bồi (nâu, hồng), Mũ chim cánh cụt, Mũ bạch tuộc (hồng, tím), Mũ tốt nghiệp (đen, xanh), Khăn xếp (đỏ, xanh) |
| 7–10 | Mũ cá mập (xanh, xám), Mũ hải tặc (đen, đỏ), Mũ đèn lồng (đỏ, vàng), Mũ phi hành gia (trắng, cam), Mũ chiến binh sừng (bạc, vàng), Mũ sừng kỳ lân (trắng, cầu vồng) |
| 11–15 | Mũ rồng con (xanh lá, đỏ, vàng), Đầu lân (đỏ, vàng), Vương miện kim cương (kim cương, hồng ngọc, cầu vồng), Mũ phượng hoàng (lửa, băng) |

**Kính (23 mẫu gốc):**

| Cấp | Mẫu gốc và biến thể |
| --- | --- |
| 1–2 | Kính mắt mèo (hồng, đen, tím), Kính lát trái cây (cam, chanh, kiwi), Kính bút chì (vàng, xanh, hồng), Kính 3D xanh đỏ, Kính tai thỏ (trắng, hồng), Mặt nạ siêu nhân (đỏ, xanh, đen) |
| 3–6 | Kính lặn ống thở (vàng, hồng), Kính cú mèo (nâu, cú tuyết), Kính ô vuông ngầu (đen, hồng), Kính dưa hấu, Kính phi công (nâu, đen, vàng óng), Kính cánh bướm (xanh, cam), Kính trăng khuyết (vàng, bạc), Kính rô-bốt (xanh, đỏ) |
| 7–10 | Kính vũ trụ (xanh ngọc, hồng, vàng), Kính bông tuyết (xanh, tím), Kính chú ong, Kính một mắt (vàng, bạc), Kính cầu vồng (rực, phấn) |
| 11–15 | Kính kim cương (xanh, hồng, ngọc lục bảo, cầu vồng), Mặt nạ phượng hoàng (lửa, băng), Kính dải ngân hà (tím, hồng), Kính vương miện (vàng, pha lê) |

Tất cả gắn vào `head` với `voxelSize` 0,0385 và `offset` [0, 0, 0], cùng hệ tọa độ với các mũ và kính đã có (đỉnh đầu ở y = 22, mặt trước ở z = 11). Mũ trùm đầu ôm từ y = 17; kính có gọng hai bên và quai giống kính tròn cũ. Mẫu gốc mũ có 6–39 khối. Mẫu gốc kính có 8–93 khối, vì các tròng tròn được vẽ theo từng ô nhỏ. Mỗi món vẫn là một lưới, tức một draw call.

## Kiểm tra

- **Ảnh ô chọn đồ:** đã sinh đủ 102 ảnh `assets/generated/accessories/{hat,glasses}-*.png`, manifest do lệnh render tự sinh lại. Hai lượt `PREVIEW_ONLY=hat-` và `PREVIEW_ONLY=glasses-` bị treo giữa chừng (`page.waitForFunction` hết 60 s), kể cả sau bản sửa f8af921. Lần nào cũng treo ở một ảnh khác nhau, nên không phải do món nào bị hỏng. Các ảnh còn thiếu hoặc vẽ trước lần sửa mẫu được vẽ lại bằng script nháp trong scratchpad, gọi `renderShots` theo lô 8 ảnh, vẫn qua khóa chung. Hai lô xong hết, không lỗi.
- **Ảnh đeo trên người Miu:** `PREVIEW_ONLY=item-hat-` (38 ảnh) và `PREVIEW_ONLY=item-glasses-` (32 ảnh) với `pnpm assets:preview accessories`. Tôi đã xem từng mẫu gốc mới. Mũ nằm đúng trên đỉnh đầu, vành và hình trang trí quay ra trước, không lơ lửng, không lún vào đầu. Kính áp đúng mặt trước ở tầm mắt, gọng chạy dọc hai bên đầu, quai ra sau. Sau khi xem, tôi sửa một số mẫu: sừng mũ chiến binh to và đậm màu hơn, sừng kỳ lân cao hơn, đèn lồng bo tròn trên và dưới, vương miện kim cương đổi sang bạc ánh xanh cho nổi trên nhân vật trắng, kính mắt mèo có góc vểnh rõ hơn, kính cú tuyết đổi sang màu xám cho thấy được trên nền sáng. Các mẫu này đã được vẽ lại cả ảnh ô chọn lẫn ảnh đeo.
- **`pnpm content:check`:** báo lỗi, nhưng không có lỗi nào thuộc khe `hat` hay `glasses`. Cả 212 lỗi đều là "has no picture" của các khe đang được agent khác làm (`clothes` 51, `scarf` 51, `shoes` 51, `hand` 25, `vehicle` 22, `wings` 12). Schema, tên, id và số món mở từ cấp 1 của mũ và kính đều qua.
- **`pnpm vitest run packages/voxel apps/web/src/game/character`:** 13 file, 713 test, qua hết.
- **`pnpm vitest run tools/content/check-content.test.ts`:** 7 test đỏ. Nguyên nhân là cùng 212 ảnh thiếu của các khe khác ở trên (test "passes the shipped content" đọc nội dung thật).
- Không sửa TypeScript nên không chạy `tsc`. Theo phân công, không chạy E2E và `pnpm test`.

## File

- Mới: 51 file `content/accessories/hat-*.json` và 51 file `content/accessories/glasses-*.json`.
- Sinh ra: ảnh trong `assets/generated/accessories/`, ảnh đeo `assets/generated/review/accessories/item-{hat,glasses}-*.png` (48 file mới cho mẫu gốc mới, ảnh mẫu cũ được vẽ lại), `assets/manifest.json` (do lệnh render).
- Script sinh mẫu nằm ngoài repo, trong scratchpad (`hg/gen-hats.mjs`, `hg/gen-glasses.mjs`).

Status: DONE_WITH_CONCERNS
Summary: Mỗi khe mũ và kính có thêm 51 món (25 và 23 mẫu gốc mới), phân theo cấp 10/4×4/3×5/2×5, có đủ ảnh ô chọn và đã xem ảnh đeo trên Miu. Kiểm tra nội dung và test hẹp đều qua với phần mũ và kính.
Concerns/Blockers: `pnpm content:check` và `check-content.test.ts` sẽ còn đỏ cho tới khi các khe khác vẽ xong 212 ảnh. Các lượt render dài theo tiền tố vẫn treo ngẫu nhiên kể cả sau f8af921; chia lô nhỏ thì chạy được. Pha 3 nên tính đến điều này khi vẽ lại toàn bộ.
