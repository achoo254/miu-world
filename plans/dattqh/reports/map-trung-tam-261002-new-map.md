# Map Trung tâm (`trung-tam`): dựng mới theo mock chi tiết

Ngày 02/10/2026 · Pha 2 của plan `261002-1619-nui-tuyet-dao-bi-an-maps` · Mock `designs/trung-tam/d-01 … d-08`

Kết quả: map 800 × 800 dựng bằng `zone-map.ts`, có cổng sang đủ mười map, sáu địa danh hợp đồng nằm trong khu chương 1, quảng trường đông người. Mỗi khung `d-*` đều có góc chụp và ảnh `mock__`. Tôi đã sửa, chụp rồi so qua năm vòng, sau đó chụp lại đủ bộ ảnh map. Test của map đạt hết.

## Tệp

- `tools/world/generate-trung-tam-map.ts` (mới): generator, `generateTrungTam()`, chạy bằng `pnpm world:trung-tam`.
- `tools/world/structures/trung-tam-square.ts` (mới): đài phun ba tầng, tượng mèo trắng lớn ôm sách, cổng quay mặt về quảng trường (dùng lại `placePortal` qua `facingWriter`), tháp đồng hồ vuông, lâu đài trên nền cao (tường thành, tháp mái đỏ có cờ, cổng phát sáng, sảnh, khối giữa mái đỏ). Tệp có thêm `framePoint`.
- `tools/world/structures/trung-tam-props.ts` (mới): script sinh `content/world/box-props/trung-tam.json`. Biển chữ dùng font pixel chữ hoa cao 5 ô, có đủ dấu tiếng Việt (NFD: mũ, dấu thanh, móc, chấm dưới). Chạy bằng `pnpm exec tsx tools/world/structures/trung-tam-props.ts`; script in ra chiều cao từng prop để thêm vào `models.json`.
- `content/world/box-props/trung-tam.json`: 37 prop `tt-*` gồm 10 ô sáng cổng theo màu, 10 biển tên map, biển "CỬA HÀNG" có túi, bảng nhiệm vụ có đĩa "!", bảng TEAM 1/TEAM 2, hai cột biển chỉ đường, khí cầu, hai khinh khí cầu, mặt đồng hồ, ba kiểu bàn giao dịch, đống hàng, giàn đèn sân khấu, dây đèn lồng, thảm đỏ.
- `content/world/mock-views/trung-tam.json`: 8 góc chụp.
- `content/world/models.json`: thêm 37 dòng `tt-*`.
- `tools/world/zone-maps.test.ts`: thêm import và một dòng `MAPS`.
- Ảnh sinh ra: `assets/generated/world/trung-tam/`, `assets/generated/box-props/tt-*.glb`, `assets/generated/review/trung-tam/` (8 ảnh `mock__` và 16 ảnh map). Manifest sinh lại qua lock.

## Từng khung

| Khung | Mức | Đã có / còn thiếu |
| --- | --- | --- |
| d-01 toàn cảnh | gần | Đã có: đài phun nhiều tầng với tượng mèo trắng ở giữa, dãy cổng sáng màu kèm biển tên phía sau, cửa hàng mái sọc bên trái, bảng nhiệm vụ bên phải, lâu đài tháp mái đỏ có cờ, khinh khí cầu và khí cầu trên trời, bồn hoa, cờ mèo, đèn. Còn thiếu: lâu đài thấp và xa hơn mock vì trần thế giới chỉ 48 khối; cầu kênh không lọt vào khung; ít người hiện trong ảnh. |
| d-02 cửa hàng | gần–đạt | Đã có: biển "CỬA HÀNG" có túi vàng, hai mái sọc xanh và đỏ, quầy chất hàng nhiều màu, kệ, thùng, chậu hoa, thảm đỏ, cờ mèo hai bên, đèn. Còn thiếu: cảm giác ấm trong nhà như mock (cửa hàng mở mặt trước). |
| d-03 giao dịch | gần | Đã có: nhiều hàng bàn giao dịch (đá quý, đồ chơi, bình thuốc) dưới dù sọc, sạp mái sọc quanh khu, thùng, đèn. Còn thiếu: trẻ em không hiện trong ảnh chụp (xem phần Đề xuất); bong bóng thoại là UI nên không dựng. |
| d-04 bảng nhiệm vụ | đạt | Đã có: bảng gỗ ghim giấy, chữ "BẢNG NHIỆM VỤ", đĩa "!" vàng phát sáng, tường đá có mái ngói, cờ đỏ, đèn, thùng gỗ. Ba ô "Nhiệm vụ hằng ngày / Sự kiện đặc biệt / Xếp hạng" là UI nên không dựng. |
| d-05 chòi tổ đội | gần | Đã có: chòi mái xanh, bảng TEAM 1 và TEAM 2 treo dưới xà, ghế, bàn, lan can, chậu hoa, đèn, trẻ em đứng quanh. Còn thiếu: cột khối dày hơn mock; chòi vuông chứ không lục giác. |
| d-06 cổng dịch chuyển | gần–đạt | Đã có: dãy vòm đá có dây leo, ô sáng đúng màu từng map, biển gỗ ghi tên (LÀNG VEN SÔNG, KHU RỪNG BÍ MẬT, NÚI TUYẾT, ĐẢO BÍ ẨN, LÂU ĐÀI…), đèn tường, bụi hoa dưới chân. Còn thiếu: vòm vuông theo khối, không tròn như mock. |
| d-07 cầu trung tâm | đạt | Đã có: hai cột biển chỉ đường (◄ Khu sống, Khu học tập, Khu mua bán; Lâu đài, Thư viện, Cảng biển ►) có đèn trên đỉnh, cầu đá bậc, đèn hai bên, cuối tầm nhìn là đài phun tượng mèo và lâu đài. Còn thiếu: ở góc này ít thấy nước kênh hai bên. |
| d-08 sự kiện theo mùa | gần | Đã có: sân khấu có màn hình hình mèo, giàn đèn hai bên, nhiều dây đèn lồng, dây cờ, cây hoa anh đào, sạp đồ ăn mái sọc hai bên lối, khinh khí cầu. Còn thiếu: đám đông không hiện trong ảnh (giống d-03). |

Các vòng sửa:
1. Dựng bố cục.
2. Đưa lâu đài lại gần hơn và thêm khối giữa mái đỏ; tăng màu cho ô sáng cổng; làm lại mặt tiền cửa hàng, bảng nhiệm vụ, chòi, khu giao dịch và khu sự kiện.
3. Giấu mô hình cổng sau ô sáng, lát sân đến chỗ xuất hiện, thêm sạp và dù.
4. Thu gọn sân trước lâu đài và dời các góc chụp.
5. Thêm dây leo cho cổng và chỉnh góc d-03.

## Khu (`ZONES`)

| Chương | id | Tên | Tâm (x, z) | Nửa rộng | Phạm vi | Nền |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `quang-truong-trung-tam` | Quảng trường trung tâm | 400, 448 | 46 × 36 | x 354–446, z 412–484 | `cobble` (vòng `cobble-grey`) |
| 2 | `khu-giao-dich` | Khu giao dịch và cửa hàng | 260, 448 | 40 × 32 | x 220–300, z 416–480 | `cobble` |
| 3 | `khu-su-kien` | Khu sự kiện theo mùa | 548, 448 | 42 × 32 | x 506–590, z 416–480 | `paver` |
| 4 | `san-truoc-lau-dai` | Sân trước lâu đài | 400, 362 | 50 × 25 | x 350–450, z 337–387 | `cobble-grey` |

Nền map là `grass-hub`, lối đi lát `cobble`. Mặt đất ở mức 12, nước ở mức 10. Kênh chạy vòng quanh quảng trường (mép trong x 338–462, z 398–498, rộng 6), có 6 cầu đá vòm. Lâu đài đứng trên nền cao +5 (z 148–330, bậc thềm ở z 331–334). Núi đá, đỉnh phủ tuyết, nằm ở phía bắc (z < 190). Cảng biển ở phía đông (x ≥ khoảng 688). Chỗ xuất hiện là (400, 526), ở chân nam cầu trung tâm, nhìn về đài phun.

## Địa danh hợp đồng (đều ở chương 1, ngoài trời, mức nền)

| id | Tên | Ô (x, z) | Cách landmark đầu |
| --- | --- | --- | --- |
| `dai-phun-nuoc` | Đài phun nước tượng mèo | 400, 433 | 0 |
| `cong-dich-chuyen` | Dãy cổng dịch chuyển | 404, 421 | 12,6 |
| `bang-nhiem-vu` | Bảng nhiệm vụ | 424, 441 | 25,3 |
| `truoc-cua-hang` | Trước cửa hàng | 375, 441 | 26,2 |
| `cho-to-doi` | Chòi chờ tổ đội | 411, 459 | 28,2 |
| `bon-hoa-quang-truong` | Bồn hoa quanh đài phun | 389, 457 | 26,4 |

Hai landmark gần nhau nhất cách 12,6 khối (yêu cầu ≥ 10); xa nhất cách landmark đầu 28,2 khối (yêu cầu ≤ 30). Map còn các landmark khác: `cau-trung-tam`, `thap-dong-ho`, `dai-phun-san-truoc`, `cong-lau-dai` và `sanh-lau-dai` (trên nền cao, y 18), `cho-giao-dich`, `san-khau`, `cang-bien`, `thu-vien`, `khu-hoc-tap`.

## Cổng, xe, đời sống

- Mười cổng nằm trên một cung dọc phía bắc quảng trường, mỗi bên lối lên lâu đài năm cổng. Phía tây: Trường học (vàng), Thư viện (xanh dương), Nông trại (xanh nõn), Chợ phiên (xanh ngọc), Xóm Mái Ấm (hồng). Phía đông, đúng thứ tự trong d-06: Làng Ven Sông (cam), Khu rừng bí mật (xanh lá), Núi tuyết (xanh băng), Đảo bí ẩn (tím), Lâu đài (đỏ).
- Mỗi cổng đứng ngay sau vòm, bị ô sáng che: `zone-map` luôn đặt mô hình `gate.glb` ở góc quay 0, và nếu đứng trong vòm thì nó hiện thành một tấm xám cắt ngang ô sáng.
- 12 trạm "Khinh khí cầu": 6 chuyến từ trạm cạnh chỗ xuất hiện tới Khu giao dịch, Khu sự kiện, Sân trước lâu đài, Cảng biển, Khu sống, Thư viện, và 6 chuyến "về quảng trường". Tính cả 8 mục quest chào mừng của phiên chính, map có 30 interactable.
- 3.555 prop.
- 171 nhân vật nền:
  - 139 người, trong đó 110 bạn nhỏ, mỗi bạn một tên riêng không lặp ("Bạn Minh Khang", "Bạn Bảo Ngọc"…). Các bạn đứng và đi theo nhóm 3–5 quanh đài phun, trước cổng, ở bảng, ở chòi, trong khu giao dịch (8 bạn bán ở bàn), trước sân khấu và ở sân trước lâu đài.
  - Người lớn: cô chủ cửa hàng, chú bán đồ chơi, chú bán bóng bay, người bán ở sạp, cô dẫn chương trình, 4 lính gác, người quét sân, người làm vườn, thủ thư, cô giáo, người câu cá, phu cảng, người lái đò, người trong khu nhà ở.
  - 32 con vật (mèo, cún, gà con).

## Vùng đất ngoài

Theme `castle`, nền theo `soil` của map. Lý do: trong d-01, sau lâu đài là núi đá nhiều tầng. Theme `castle` có đồi cao (`hillHeight` 18) và nhiều chỗ ngắm cảnh, nên nối tiếp được dải núi phía bắc map. Tôi không thêm theme mới.

## Kiểm tra

- `pnpm vitest run tools/world/zone-maps.test.ts -t "trung-tam map"`: đạt 4/4. Gồm khớp output đã sinh; 800 × 800 với hơn 20 interactable và mọi mục đứng trên đất; sinh động (≥ 8 người, ≥ 30 con vật); đi được từ chỗ xuất hiện tới mọi mục, kể cả 8 mục quest chào mừng.
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: đạt 15/15.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi.
- `pnpm exec eslint` trên 4 tệp tôi sửa, `--max-warnings=0`: 0 lỗi, 0 cảnh báo.
- Không chạy: cả bộ test, E2E, `perf`, `content:check` (phiên chính chạy).

## Đề xuất

- Ảnh chụp ở d-03 và d-08 không có người, dù map có 30–40 bạn nhỏ ở đó. Lý do: nhân vật cách xa chỗ xuất hiện (> 96 khối, `PRELOAD_RADIUS` trong `apps/web/src/game/ambient/ambient-life.ts`) chỉ được dựng sau khung hình đầu, nên lúc chụp chưa có. Chỉ đúng với ảnh review, trong game vẫn có người. Có thể cho `render-preview` chờ nhân vật quanh mốc, hoặc nạp trước nhân vật quanh điểm chụp. Việc này thuộc `apps/**` và `tools/assets/render-preview.ts`, ngoài phạm vi của tôi.
- `zone-map.ts`: nên cho `gates[]` chọn `model` và `yaw` (cổng của Trung tâm không cần `gate.glb`).
- `framePoint` đang lặp hai chỗ: riêng trong `generate-school-map.ts` và export ở `trung-tam-square.ts`. Nên đưa vào `structures/world-writer.ts`.
- `content/world/mock-views/truong-hoc.json` vẫn còn 8 góc `trung-tam/d-*` từ quảng trường cũ của map Trường học, nên trang review sẽ có hai ảnh cho mỗi khung. Phiên chính quyết định có bỏ phần đó không.
- Bản giao việc gán tiền tố `nt-` cho Núi tuyết, nhưng `nt-` đã là của Nông trại (`nt-parasol`, `nt-hay-bale`…). Nếu id trùng, `build-box-props` sẽ báo lỗi. Cần kiểm với agent Núi tuyết.
- Map dùng lại prop của map khác: `th-banner`, `th-planter`, `th-bunting`, `th-balloon`, `th-stage-screen`, `th-goods-crate`, `th-goods-shelf`, `ld-chandelier`, `cp-planter`, `cp-crate-apple`, `nt-parasol`. Đổi tên các prop đó thì map này hỏng; test `model-catalog` sẽ báo.
- Không thêm khối mới. Không có dependency mới.

## Câu hỏi mở

- Lâu đài bị trần thế giới 48 khối giới hạn chiều cao, nên trông nhỏ hơn mock. Nếu muốn lâu đài cao như d-01, cần tăng số chunk theo chiều cao cho map này. Đó là thay đổi ở bộ dựng chung và runtime, cần người quyết.

Status: DONE_WITH_CONCERNS
Summary: Map Trung tâm 800 × 800 có 4 khu, cổng sang đủ mười map, sáu địa danh hợp đồng đúng luật, 110 bạn nhỏ tên riêng cùng người bán; 8 khung mock có ảnh so sau năm vòng (2 đạt, 2 gần–đạt, 4 gần); test map, tsc và eslint đều sạch.
Concerns: ảnh review d-03 và d-08 không có người do nhân vật xa chỗ xuất hiện chưa được dựng lúc chụp (runtime/preview, ngoài phạm vi); lâu đài thấp hơn mock vì trần 48 khối; tiền tố `nt-` của Núi tuyết trùng Nông trại; school vẫn giữ mock-views `trung-tam/d-*`.
