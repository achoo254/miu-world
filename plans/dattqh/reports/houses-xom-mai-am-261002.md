# Xóm Mái Ấm — nhà to, cửa rộng, cảnh vật và mạng đường (03/10/2026)

Map `xom-mai-am`. Tệp đã sửa: `tools/world/generate-xom-mai-am-map.ts`, `tools/world/structures/xom-mai-am-home.ts`, `content/world/mock-views/xom-mai-am.json`; sinh lại `assets/generated/world/xom-mai-am/**`, ảnh `assets/generated/review/xom-mai-am/**` (22 ảnh, chụp qua khóa) và `assets/manifest.json` (do lệnh chụp tự sinh). Không sửa tệp dùng chung, `targets.json`, `regions.json`, quest, `apps/**`, map khác. Không `git add`, không commit, không chạy `pnpm test`/E2E/perf.

## Số đo trước / sau

| Kiểm tra | Trước | Sau |
| --- | --- | --- |
| `room-audit` (bản đang commit, mái tới 24 khối) | 269 không gian có mái, 2 thiếu (hai dải dưới xà chuồng bò: 62% và 38% sàn trống; bản đo lúc đó chỉ tính mái ≤ 9) | 182 không gian, **0 thiếu** |
| Đo chặt riêng (bỏ vòng mái hiên dính vào phòng, xem "Đề xuất") | 262 không gian, 252 thiếu: gần như mọi nhà cửa rộng 2; phòng nhà Mẩy 77% trống | 177 không gian, **0 thiếu**; 169 nhà cửa rộng 3, sàn trống thấp nhất 70% (dải chuồng), nhà Mẩy 87%, 0 chỗ thắt 1 ô |
| `reach-audit` | mọi mục tới được; chỗ xuất hiện trống | **mọi mục tới được; chỗ xuất hiện, điểm xuống xe trống** |
| `scenery-audit` cây trên đường / đồ giữa lối / nơi không cạnh đường / nơi bị cắt khỏi mạng | 0 / 3 / 17 / 22 | **0 / 0 / 0 / 0** |
| Số prop | 17.266 | 15.529 |
| `ZONES`, id và tên 59 địa danh | — | giữ nguyên (đã so `entities.json` trước/sau) |

## Từng công trình

| Công trình | Cũ | Mới | Cửa | Bậc / sàn | Nội thất |
| --- | --- | --- | --- | --- | --- |
| Nhà dân (`homestead`, mọi nhà trong xóm và các nhà trong khu bài) | 9–13 × 7–8, tường 4 | `cottageSize`: 13–17 × 11–12, tường 7 (mái thêm ~6) | 3 × 3 | sàn ván cùng mặt sân; ngưỡng cửa lát đá cuội nối lối vườn | trống |
| Nhà Mẩy (d-03, d-13) | 17 × 13, tường 5, phòng 13 × 9 | 21 × 15, tường 7, phòng 17 × 11 trong lớp ván lót; cửa sổ mái căn giữa cửa | 3 × 3 | ngang mặt sân | bàn ăn + 2 ghế dài lùi 2 ô khỏi tường, tủ bát sau bàn, bếp lò + củi góc trong, giường dọc tường phải (dời ra sau để có lối 2 ô tới bếp), kệ treo nâng lên 2,1 khối, thảm giữa đi xuyên: **87% sàn trống**, giữa phòng thông từ cửa tới tường hậu |
| Chuồng bò đỏ (d-04, d-14) | 17 × 19, tường 6, cửa 5 × 4, lối giữa 3 | 25 × 27, tường 7, lối lát giữa rộng 7, 3 ô chuồng mỗi bên (7 × 5–6) mở ra lối giữa | 7 × 5, khung trắng, cánh X gấp hai bên | ngưỡng lát đá như lối giữa | máng ăn trong mép ô, bò/cừu giữa ô, rơm sát tường ngoài; kiện rơm ở hai góc trước (bỏ đống rơm cuối lối giữa — nằm giữa lối); xô, can sữa sát mép lối: **85% sàn trống** |
| Căn chòi cũ (bờ hồ, chương 3) | 8 × 6, tường 3, cửa 2 × 2 | 13 × 11, tường 7, sàn ván, nền san phẳng | 3 × 3 | ngưỡng ván | trống; cánh cửa gỗ rơi dựng sát tường phía đông cửa, ngoài 2 ô trước cửa |
| Nhà ông (đỉnh dốc) | 11 × 8, tường 4 | 15 × 12, tường 7, hiên mái cao 6 | 3 × 3 | ngưỡng ván, hiên ván ngang mặt đất (bỏ khối đá nhô trước hiên) | võng trên hiên, lệch khỏi cửa |
| Cối xay gió (gò gió, dựng chung) | cửa 1 × 3 | khoét thêm trong generator thành 3 × 3 | 3 × 3 | ngang mặt gò | trống |

Bố cục nhường chỗ: hàng nhà trong `village` cách nhau 30 (trước 25), kiểm thêm dải trước cổng; ít nhà hơn (khoảng 170 so với 250). Mọi nhà có lối vào riêng: lối cuội từ cửa qua cổng tới mép vườn, bậc xuống 1 khối nếu vườn cao hơn đất ngoài (`doorSteps`), rồi một lối mòn rộng 2 (tìm đường né nhà, ruộng, nước, bậc ≤ 1) tới đường gần nhất; generator báo nếu cửa nào không tìm được (lượt cuối: 0).

## Cảnh vật và mạng đường

- Thêm tuyến: lối qua bến xe và cổng sang Trung tâm; vào cổng vườn hoa và lối trong vườn; ngõ sân trước nhà Mẩy tới tổ rơm; ra vũng nước cạnh ao bèo; sân đêm trăng tới chõng tre rồi qua hàng rào vào vườn vú sữa; lên vách đá khắc chữ; xuống bãi cát và bãi sỏi; dọc bờ nam tới hang mẹ Bống; tới gốc cây dẻ; từ gò gió xuống giữa hai ruộng tới cánh đồng gió; bờ ruộng giữa đồng lúa nối hai đường làng; vào sân phơi; đường trại dọc vườn rau tới ruộng lúa mì; vào giữa ruộng ngô.
- Hồ sen: địa danh dời từ giữa mặt hồ lên giữa cầu ván (không quest nào dùng tên này). Chuồng gà: địa danh lùi 2 ô về phía lối giữa hai chuồng.
- Đá, sỏi, hoa không đặt lên đường; bụi tre (hai hàng ngõ đêm trăng, hai hàng dốc nhà ông) đặt sau cùng và chừa lối; rào ven đường không đặt lên chỗ giao đường; thùng, xô ở giếng ra ngoài vòng lát; kiện rơm lúa mì ra mép ruộng.
- Tay bù nhìn đổi ván → gỗ súc, vách tổ ong đổi một nửa ván → tấm gỗ: các khối ván nổi đó là "sàn" lẻ ngay cạnh địa danh, làm địa danh bị tính vào mạng cụt (không phải lách: địa danh nay có đường thật bên cạnh).

## Ngoại lệ có lý do (không gian có mái không phải nhà)

- Dải dưới mái hiên hai bên chuồng (mái gambrel nhô): ngoài trời, mở dọc cả cạnh.
- Ô trên đỉnh tường lót trong chuồng và nhà Mẩy (dưới mái): bé không lên được, chỉ là khe dưới mái.
- Gầm cầu ván qua hồ, gầm các cầu tàu, mái giếng xóm, hang đá ấm (cửa 3 × 3, 94% trống), hang mẹ Bống (ngập nước).
Không mục nào bị `room-audit` đánh thiếu.

## Góc chụp đối chiếu

Chụp lại cả 6 khung `mock__` (nhà to ra nên chỉnh 4 góc): d-03 lùi xa thấy cả nhà, cửa sổ mái, vườn trước; d-04 lùi xa thấy cả chuồng và cửa 7 ô; d-13 đặt camera ngay trong cửa, thấy bàn ăn trái, giường phải, bếp góc trong, tủ bát giữa — khớp bố cục mock; d-14 nhìn vào dãy ô chuồng bên trái lối giữa. d-05, d-07 giữ góc. Sau đó chụp đủ 22 ảnh của map (qua khóa).

## Kiểm tra

- `pnpm world:xom-mai-am`: 800 × 48 × 800, 15.529 prop, 75 mục tương tác. Còn cảnh báo khoảng cách quest `tv2-t14-b25` ("bụi hoa tỉ muội", "vách tổ ong" cách nhau 7, mục tiêu 10): có từ trước (địa danh "vách tổ ong" và "luống cải góc vườn" chỉ cách nhau 2,8 ô; lượt commit trước khoảng cách chỉ 5,8). Cảnh báo "bãi đá trước hang" xuất hiện giữa chừng đã hết sau khi dời lối lên vách đá.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi.
- `pnpm exec eslint tools/world/generate-xom-mai-am-map.ts tools/world/structures/xom-mai-am-home.ts --max-warnings=0`: sạch.
- Không chạy `pnpm test`, vitest, E2E, perf (theo yêu cầu). Test `zone-maps.test.ts` của map chưa chạy.

## Đề xuất cho tệp dùng chung

1. `room-audit.ts`: ô dưới mái hiên nhô một ô quanh nhà (cùng độ cao sàn) nối với phòng qua cửa, nên mọi nhà `placeHouse` đo ra "cửa" rộng bằng cả vòng hiên (36–46) — nhà cửa rộng 2 vẫn qua. Bản đo chặt trong báo cáo này loại ô có mặt bên nào nhìn ra trời (không mái, không tường); nên đưa điều kiện đó vào bản chung.
2. `placeWindmill` (`countryside.ts`): cửa chân cối xay rộng 1; nên mở 3 × 3 ở bản chung (map này đang khoét lại sau khi dựng).
3. `laneVerge` (`scenery.ts`): đoạn rào 3 khúc chỉ kiểm ô đầu, các khúc sau có thể nằm trên chỗ giao đường; `bambooHedge` chỉ tránh tuyến (`onPath`), không biết lối map tự lát — map này bọc `ctx.prop` để tránh.
4. `placeHouse` có `floor` nhưng ngưỡng cửa (hàng tường) vẫn là đất: nên lát ngưỡng bằng `floor` để sàn trong nối với lối ngoài.

## Bổ sung 03/10/2026: gờ dưới mái chuồng bò

`room-audit` bản 90dc2ef báo 2 chỗ thiếu `[638,22,483]`, `[657,22,483]` (4 × 25, "doorway 2 wide"): dải đứng được trên đỉnh tường và lớp ván lót hai bên chuồng, dưới mái gambrel, hở ở hai đầu hồi. Không phải phòng. Sửa trong `placeRedBarn` (`structures/xom-mai-am-home.ts`): mái hạ xuống tường. Ván đỏ lấp khe từ đỉnh tường tới chân mái trên cột tường và cột lót mỗi bên, suốt chiều dài chuồng; nhìn từ ngoài không đổi, bên trong thấy thành ván tới mái.

Sau `pnpm world:xom-mai-am`:
- `room-audit`: 174 không gian có mái, **0 thiếu**.
- `reach-audit`: mọi mục tới được; chỗ xuất hiện trống.
- `scenery-audit`: **0 / 0 / 0 / 0**.
- `pnpm vitest run tools/world/zone-maps.test.ts -t "xom-mai-am"`: 4 test đạt (32 test của map khác bị bỏ qua theo bộ lọc).
- `tsc`: 0 lỗi; `eslint --max-warnings=0` trên hai tệp của map: sạch.

Không chụp lại ảnh; đã chạy `pnpm assets:manifest` qua khóa.

Status: DONE
Summary: Mọi nhà của Xóm Mái Ấm đạt chuẩn (nhà dân 13–17 × 11–12 tường 7, nhà Mẩy 21 × 15 với 87% sàn trống, chuồng 25 × 27 cửa 7 ô 85% trống, chòi và nhà ông 13–15 rộng, cửa 3 × 3); room-audit 0 thiếu, reach-audit đạt, scenery-audit 0/0/0/0, tsc/eslint sạch.
Concerns: cảnh báo khoảng cách quest tv2-t14-b25 có từ trước (địa danh vách tổ ong và luống cải cách nhau 2,8 ô); ảnh review chưa chụp lại sau lần lấp khe mái chuồng (thay đổi chỉ thấy từ trong chuồng).
