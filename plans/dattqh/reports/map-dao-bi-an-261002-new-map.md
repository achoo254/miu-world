# Map Đảo bí ẩn (`dao-bi-an`): dựng mới theo mock chi tiết

Ngày 02/10/2026. Brief: `plans/dattqh/261002-1619-nui-tuyet-dao-bi-an-maps/phase-02-map-brief.md` (mục "Map Đảo bí ẩn", hợp đồng địa danh, thêm `vung-nuoc-trieu` theo tin nhắn của phiên chính). Mock: `designs/dao-bi-an/d-01 … d-14`.

## Kết quả

`pnpm world:dao-bi-an` sinh map 800 × 800 trên biển (nước `water` mức 10, đáy cát), trong khoảng 3 giây. Map gồm:

- **Đảo chính:** bến tàu, bãi biển, làng chài trên cọc, núi đá giữa đảo với thác lớn đổ giữa hai đền đổ nát, hang động và kho báu, rừng nhiệt đới, rừng đêm, di tích và đền thờ.
- **Đảo núi lửa:** có khu thử thách dung nham.
- **Đảo hải tặc.**
- **21 đảo nhỏ:** có dừa, đá, một vòm đá.
- **Đi lại giữa các đảo:** cầu gỗ nối các đảo theo đường đi, 22 chuyến "Thuyền" (nhãn "Lên thuyền") giữa bảy bến.

Nền đảo là `grass-island`, cát `sand` ở bãi biển, lối đi `trail`, đường ván `planks`. Cổng về Trung tâm để mặc định, cạnh chỗ xuất hiện (`cong-trung-tam` ở 399,613).

Tệp đã thêm hoặc sửa (đúng phạm vi được giao):

- `tools/world/generate-dao-bi-an-map.ts` (mới): spec, đường, chuyến thuyền, dàn người.
- `tools/world/structures/dao-bi-an-land.ts`: bố cục đảo, hình địa hình, bản đồ khoảng cách tới bờ.
- `tools/world/structures/dao-bi-an-kit.ts`: khối, model, đá trộn, tấm thác, dây leo.
- `tools/world/structures/dao-bi-an-inland.ts`: núi giữa đảo, thác lớn, hang, kho báu, đền, rừng, rừng đêm.
- `tools/world/structures/dao-bi-an-coast.ts`: tô nền, dừa, bến tàu, bãi biển, làng chài, bờ hải tặc, núi lửa, khu thử thách, cầu nối, đảo nhỏ.
- `tools/world/structures/dao-bi-an-life.ts`: cua, cá, vẹt, người câu cá. Phần này viết riêng vì `village-life.ts` chỉ cấp chỗ `work-*` và `graze-*`, mà các routine này cần chỗ riêng (`sand-a/b`, `leap-a/b`, `perch-a/b/sky`, `bank/water`).
- `tools/world/structures/dao-bi-an-box-props.ts`: script sinh `content/world/box-props/dao-bi-an.json` gồm 24 prop `dba-*`.
- `content/world/mock-views/dao-bi-an.json`: 14 góc chụp.
- `content/world/models.json`: thêm 24 dòng `dba-*` và 10 dòng model pack đã có trong manifest (`animal-monkey`, `tree_palmBend`, `tree_palmDetailedTall`, `plant_flatTall`, `statue_columnDamaged`, `statue_head`, `statue_obelisk`, `tent_detailedOpen`, `coconut`, `pineapple`). Không thêm dependency hay pack mới (Kenney CC0 có sẵn).
- `tools/world/zone-maps.test.ts`: một dòng trong `MAPS` và một import.
- Asset sinh qua khóa: `assets/generated/world/dao-bi-an/`, `assets/generated/box-props/dba-*.glb`, `assets/generated/review/dao-bi-an/` (30 ảnh), manifest.

## So từng khung mock

Đã làm 4 vòng sửa–chụp–so cho đủ 14 khung, thêm 3 lượt chụp riêng d-12 để chỉnh tàu hải tặc.

| Khung | Mức | Đã có / còn thiếu |
| --- | --- | --- |
| d-01 toàn cảnh | gần | Biển phía trước, bến tàu, bãi cát, núi đá xám giữa đảo có thác, núi lửa bên phải, đảo nhỏ. Còn thiếu: núi chưa nhọn và kịch tính như mock, rừng xanh còn dày hơn rừng dừa của mock, tháp đổ nát chưa nổi bật từ xa. |
| d-02 bến tàu | gần | Cầu tàu ván dài, cột đèn treo, thùng và rương, tàu buồm bên trái, dừa, núi ở hậu cảnh. Còn thiếu: biển hiệu mèo trên cột đèn; núi ở xa nên nhỏ. |
| d-03 bãi biển | gần | Rương vùi cát lộ vàng, đá, dừa, biển, xác thuyền, vòm đá xa. Còn thiếu: cua và dừa chưa đứng sát khung hình như mock (cua vẫn có trên bãi). |
| d-04 rừng nhiệt đới | gần | Cây lớn thân hai khối, dây leo, cầu treo gỗ giữa hai sàn có cầu thang, thác. Còn thiếu: lớp cây bụi và hoa dưới tán còn thưa hơn mock. |
| d-05 thác nước | gần | Thác đổ từ vách thẳng, hai đền đổ nát có cửa và cửa sổ sáng xanh, dừa trên đỉnh, sàn gỗ ra hồ. Còn thiếu: mặt hồ trong khung còn ít. |
| d-06 khu di tích cổ | gần | Cổng đền có khung ký hiệu phát sáng, bậc lên, cột, đầu tượng, dừa, sân lát đá xen cỏ. Còn thiếu: cửa phải để trống cho bé đi vào nên không có tấm cửa khắc ký hiệu như mock; mặt tiền đền dài và phẳng. |
| d-07 lối vào hang | đạt | Vách đá có rêu và dây leo, cửa hang rộng, đuốc hai bên, hàng rào gỗ, đường hầm có khung gỗ. |
| d-08 bên trong hang | gần | Vòm đá tối, hồ ngầm, cầu ván, pha lê xanh và tím, đèn dọc lối đi, nhũ đá. Còn thiếu: ánh sáng chưa tối xanh như mock vì renderer không làm tối không gian kín. |
| d-09 đền thờ bí ẩn | gần | Hàng cột rêu, đuốc, bệ ba bậc, pha lê lớn phát sáng trên đôn, vòng ký hiệu sáng sau bệ, nền lát tối. Còn thiếu: tông màu xanh lam của mock. |
| d-10 khu thử thách | gần | Nền dung nham, trụ đá tối có ký hiệu sáng, pha lê và đuốc trên trụ, tường có dòng dung nham đổ, núi lửa và khói phía sau. Còn thiếu: khói còn khối vuông. |
| d-11 đỉnh núi lửa | gần | Nón đá tối dốc, dòng dung nham liền từ miệng xuống chân, ruộng dung nham, mỏm đá ngắm, khói, trời chiều (`dusk`). Còn thiếu: dòng chảy trên đồng bằng chưa rộng như mock. |
| d-12 bờ đá, hang hải tặc | gần | Tàu buồm đen có đầu lâu, cầu gỗ có đuốc, bãi cát, vách đá có rêu với cửa hang, trời chiều. Còn thiếu: cửa hang nhỏ trong khung. |
| d-13 rừng đêm | gần | Lối ván có đèn treo, nấm và pha lê phát sáng, đom đóm, thác, hồ, trăng. Còn thiếu: trời `dusk` màu hồng tím, chưa phải đêm xanh như mock. |
| d-14 kho báu | gần | Ba tượng vàng trên bệ, chùm sáng, đống vàng, rương dọc tường, nền lấp lánh vàng, đuốc. Còn thiếu: tông vàng chưa rực bằng mock. |

## Khu bài học (`ZONES`)

Tất cả khu đều phẳng ở mức `ground` 12. Tọa độ ghi theo dạng tâm (x, z) với bán kích thước (hx, hz).

| Chương | id | Tên | Tâm (x, z) | hx × hz | Nền |
| --- | --- | --- | --- | --- | --- |
| 1 | `ben-tau-bai-bien` | Bến tàu và bãi biển | 380, 590 | 64 × 36 | cỏ đảo, phần nam tô cát |
| 2 | `rung-nhiet-doi` | Rừng nhiệt đới và thác nước | 220, 405 | 56 × 44 | cỏ đảo |
| 3 | `di-tich-den-tho` | Khu di tích cổ và đền thờ | 592, 410 | 54 × 44 | lát đá xen rêu và cỏ |
| 4 | `hang-dong-kho-bau` | Hang động và kho báu | 400, 190 | 56 × 32 | cỏ đảo |
| 5 | `bo-da-hai-tac` | Bờ đá hải tặc | 650, 672 | 44 × 30 | cát |

## Địa danh bắt buộc (khu chương 1)

Cả sáu địa danh đứng ngoài trời, trên nền ở mức 12. Khoảng cách tới "Bến tàu" từ 25,6 đến 29,5 khối; hai địa danh gần nhau nhất cách 14,1 khối. Quanh mỗi cái còn chỗ trống để đứng.

| id | Tên | Vị trí (x, y, z) |
| --- | --- | --- |
| `ben-tau` (đầu tiên) | Bến tàu | 400.5, 13, 624.5 |
| `bai-bien` | Bãi biển | 376.5, 13, 612.5 |
| `ruong-cat` | Rương vùi trong cát | 420.5, 13, 608.5 |
| `leu-thuyen-truong` | Lều thuyền trưởng | 386.5, 13, 598.5 |
| `cay-dua-nghieng` | Cây dừa nghiêng | 410.5, 13, 598.5 |
| `vung-nuoc-trieu` | Vũng nước triều | 426.5, 13, 621.5 (cạnh hồ đá 432–438 × 616–625) |

Các địa danh khác (dùng cho góc chụp và dàn người):

- Ngoài trời: `lang-chai`, `thac-nuoc`, `be-thac`, `loi-vao-hang`, `cong-di-tich`, `cau-treo` (trên cầu, y 21), `thac-rung`, `rung-dem`, `mom-nui-lua` (y 17), `khu-thu-thach`, `hang-hai-tac`, `tau-hai-tac`, `trai-tham-hiem`.
- Trong nhà: `trong-hang` (hồ trong hang), `kho-bau` (kho báu), `den-tho` (đền thờ, y 15).

## Số liệu

- **Prop:** 3.768, dưới ngân sách khoảng 20.000.
- **Đối tượng tương tác:** 31. Trong đó có 1 cổng và 22 bến thuyền; 8 cái còn lại là mục của quest chào mừng `kho-bau-dao-ch1` mà phiên chính đã thêm. Không tính quest vẫn có 23, nhiều hơn mức 20 mà test đòi.
- **Người:** 69, gồm thủy thủ, người chèo thuyền, 4 người câu cá trên cầu tàu, thuyền trưởng, người bán dừa, dân làng chài, nhà thám hiểm, nhà khảo cổ, thợ mỏ, hải tặc vui tính, nhà địa chất và trẻ em. Mỗi người một tên tiếng Việt riêng.
- **Vật có hoạt động:** 53, gồm 14 cua, 16 cá, 11 vẹt, 5 mèo, 3 chó, 4 gà.
- **Khỉ:** 32, đặt dạng prop tĩnh trên tán cây, tháp và đền.

## Vùng đất ngoài

Dùng theme `river`, vì đây là theme nhiều nước nhất trong `OUTLAND_THEMES` (5 sông, 14 hồ, làng chài và đò). Biển ở mép map nối liền với sông hồ ngoài vùng. Không thêm theme mới.

## Kiểm tra

- `pnpm vitest run tools/world/zone-maps.test.ts -t "dao-bi-an map"`: đạt 4/4 (khớp output đã sinh, 800 × 800 và mọi mục đứng trên nền, đủ đông người và vật, đi bộ tới được mọi mục kể cả mục quest).
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: đạt 15/15.
- `pnpm exec tsc --noEmit -p tsconfig.json`: thoát mã 0, 0 lỗi.
- `pnpm exec eslint <tệp của map> tools/world/zone-maps.test.ts --max-warnings=0`: thoát mã 0, 0 cảnh báo.
- Không chạy: cả bộ test, E2E, `perf`, `content:check` (theo brief).

## Đề xuất

1. **Routine cho khỉ:** runtime chưa có routine `monkey` (`AMBIENT_ROUTINES`), nên khỉ đang là prop tĩnh. Đề xuất thêm routine kiểu chuyền cành và nhảy, có câu thoại riêng, trong `apps/web/src/game/ambient/`.
2. **Đưa sinh vật cần chỗ riêng vào `village-life.ts`:** cua, cá, vẹt và người câu cá cần chỗ riêng nên phải viết `dao-bi-an-life.ts`. Nếu `village-life.ts` biết cấp chỗ theo từng routine thì map nào cũng dùng được mà không phải viết riêng.
3. **Thêm `mood: "night"` cho góc chụp:** góc chụp hiện chỉ có `day` và `dusk`. Một chế độ đêm xanh sẽ làm d-13 khớp mock hơn. Ánh sáng trong hang và trong đền tối hơn thì d-08, d-09 cũng gần mock hơn.
4. **Dựng chung phần cao hơn trần địa hình:** `zone-map.ts` chặn mặt đất ở y 32, nên núi giữa đảo và núi lửa phải tự đặt khối phía trên trong build. Có thể đưa phần này thành helper dùng chung.
5. **Cập nhật tài liệu và trang review (ngoài phạm vi được giao):** `docs/design-cac-map.md` vẫn ghi Đảo bí ẩn "chưa có map", và trang review (`apps/web`) chưa có mục cho map này. Phiên chính sẽ cập nhật.
6. **Tiền tố prop của Núi tuyết bị trùng:** brief đặt tiền tố `nt-` cho Núi tuyết, nhưng Nông trại đang dùng `nt-` (ví dụ `nt-apple-crate`). Báo để agent Núi tuyết tránh trùng id.

## Câu hỏi mở

- Trăng của rừng đêm (`dba-moon`, cao y 116 phía nam) hiện cả ban ngày như một đĩa trăng nhạt. Nếu người duyệt muốn trăng chỉ hiện ban đêm thì cần runtime hỗ trợ prop theo `mood`.

```
Status: DONE_WITH_CONCERNS
Summary: Map dao-bi-an được dựng đủ phạm vi brief, gồm 6 địa danh chương 1 và 14 góc chụp (4 vòng so với mock). Test map, các test model và box-prop, tsc, eslint đều đạt.
Concerns/Blockers: Khỉ đang là prop tĩnh vì runtime chưa có routine cho khỉ. Các khung tối (d-08, d-09, d-13) vẫn sáng hơn mock vì renderer không làm tối không gian kín và chưa có mood đêm. Tiền tố nt- của Núi tuyết trùng với Nông trại.
```
