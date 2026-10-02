# Trường học (`truong-hoc`): nhà to, cửa rộng, đường liền mạch

Ngày 02–03/10/2026 · Plan `plans/dattqh/261002-2216-houses-big-wide-doors/` (pha 2, map `truong-hoc`) · cộng hai phần việc thêm của người sở hữu: luật cảnh vật (`.claude/rules/world-scenery.md`, cây không mọc trên đường/sân lát, không đồ giữa lối) và mạng đường liền mạch.

## Số đo

| Kiểm tra | Trước (bản đã commit) | Sau (sinh lại) |
| --- | --- | --- |
| `room-audit` | 508 không gian có mái, **78 thiếu**: 72 khối nhà kín không lối vào (6 phòng học dãy 8×10 ở tầng trệt, 66 nhà hàng xóm cũ), 6 cửa rộng 2 (nhà kính và gờ đầu hồi của nó, nhà hàng xóm; 2 trong đó phải trèo 2 khối) | 355 không gian có mái, **0 thiếu** |
| `reach-audit` | mọi mục tới được; chỗ bắt đầu trống | mọi mục tới được; chỗ bắt đầu trống |
| `scenery-audit` | 196 cây trên đường, 5 đồ giữa lối, 10 nơi xa đường, 24 nơi trên đường bị tách khỏi mạng của chỗ xuất hiện | **0 / 0 / 0 / 0** |

Ghi chú: sinh lại riêng với bộ dựng chung mới (pha 1) đã đưa `room-audit` xuống 9 thiếu (nhà hàng xóm tự to ra); 9 cái còn lại là của map này (dãy lớp, nhà kính) và được sửa dưới đây. Số không gian có mái giảm vì nhà lún vào sườn núi và hàng nhà đè lên đường đã bỏ, cùng khe hở giữa đỉnh tường và mái của dãy lớp đã bịt.

## Từng công trình

| Công trình | Cũ | Mới | Cửa | Nội thất |
| --- | --- | --- | --- | --- |
| Dãy lớp học (tòa chính, 2 tầng) | thân sâu 10, phòng 8×10 (cách 9), 1 lớp mỗi tầng có đồ, còn lại đóng cửa gỗ | thân sâu 13 (`MAIN_BUILDING.zBack` +3), phòng chia đều quanh 13 bề ngang: tây 12/12/13 × 13, đông phòng cầu thang 9 × 13 rồi 14/14 × 13 | mọi phòng cả hai tầng mở cửa 3 rộng × 3 cao (cao bằng tầng) ra hành lang; tầng trên của sảnh mở cửa 3×3 trước và sau (ra hành lang sau, trước đây không tới được) | 8 lớp học đủ đồ (bảng, bàn cô, 2–4 cột bàn ghế, dải trống 2 ô dọc tường trước, lối giữa 3 ô), thư viện trường 14×13, phòng âm nhạc–mĩ thuật 14×13; sàn trống 83–87% lớp, 74% thư viện, 92% phòng nhạc |
| Cầu thang | cửa từ sảnh 2 rộng × 2 cao, bậc 3 rộng, phòng 4 rộng | lối từ sảnh 3×3, chiếu nghỉ sâu 3, bậc 5 rộng, tầng trên còn dải 4 ô cạnh lỗ cầu thang để đi ra cửa | thêm cửa 3×3 ra hành lang ở tầng trệt | bảng tin, chậu cây chân cầu thang, chậu cây góc sau |
| Tháp đồng hồ | rỗng trong, kín | đặc (không phải phòng) | — | — |
| Căng tin | 14×10, tường 4 | 25×14, tường 7, kính, đèn cửa, sàn ván | 3×3 (`placeHouse`) | 8 bàn ăn 16 ghế, 3 bàn bếp dọc tường sau; sàn trống 90% |
| Xưởng đồ chơi (trong khu chương 4) | 13×10, tường 4 | 13×11, tường 7 (giữ cỡ vì nằm trong khu bài học) | 3×3 | bàn thợ, 2 thùng đồ chơi, gấu bông; 97% |
| Phòng mĩ thuật | 24×10, tường 5 | 27×13, tường 7 | 3×3 | 8 giá vẽ dọc tường, 2 bàn có ghế, bảng tranh; 96% |
| Nhà kính (khu chương 3) | tường 4, cửa 1 rộng × 2 cao, đầu hồi hở (gờ đứng được trên tường) | tường 6, đầu hồi lắp kính | 3×3 giữa mặt trước | luống đất 2 rộng, lối 2 ô giữa luống, lối giữa 3 ô từ cửa, dải 2 ô trước/sau; hoa trên luống |
| Cửa hàng quảng trường | sâu 6, tường 5, quầy kín cả mặt trước | sâu 9, tường 7, trần gỗ, lối vào giữa 3 rộng giữa hai quầy | 3 rộng mở tới trần | kệ hàng dọc tường sau |
| Thư viện phố | 32×16, tường 6, trống | 34×18, tường 8 | 3×3, lối lát ra đường | kệ sách dọc tường sau, 8 bàn đọc 16 ghế; 88% |
| Kho nông trại | 16×10, tường 5 | 19×13, tường 7, sàn ván | 3×3 | 3 thùng gỗ; 98% |
| Lâu đài (phông nền) | 4 tháp góc rỗng kín, tháp giữa cửa 1×2 | tháp góc đặc, tháp giữa cửa 3×3 | | |
| Cối xay gió | cửa 1 rộng | cửa 3 rộng × 3 cao | | |
| Hải đăng | ống rỗng 3×3 có cửa 1×2 | đặc, đóng cửa (ống quá hẹp để là phòng) | | |
| Nhà hàng xóm (bộ dựng chung) | 7–9 × 5–6 | 13–17 × 11–12, tường 7 (pha 1) | 3×3 | — |

Nhà dời/bỏ:

- Hàng nhà dọc đại lộ tây: bắt đầu lùi 4 ô (cây sân không còn ra đường lát quảng trường); hàng nào có đường tới quận cắt ngang thì bỏ (trước đây đường làng đâm vào tường nhà).
- Mọi cụm nhà (`hamlet`) thay bằng `levelHamlet` riêng của map: mỗi nhà chỉ đặt khi cả nhà lẫn sân trống đường, nước, khu bài học, chỗ đã giữ và không nằm trên sườn đồi. Bỏ hàng nhà đầu của làng (sân của nó nằm trên vỉa hè phố chính) và các nhà lún nửa vào chân núi ở xóm tây bắc (cửa bị chôn), các nhà đè lên đường tới xóm.

## Cảnh vật và mạng đường

- Phố chính và vỉa hè, dải 4 ô ngoài tường trường: không cho cây dại mọc. Cây phố trồng cuối cùng, trong hố cỏ 3×3 sát vỉa hè, chỉ nơi không có nhà hay vườn trong tầm tán. Cây trong sân trường, cạnh cổng, quanh sân, quảng trường, sân khấu: trồng trong hố cỏ, cách tường 6 ô. Bờ tre bắt đầu sau phố.
- Sân bóng thành sân cỏ có vạch trắng. Vạch giữa phố là đá lát nhạt (vạch trắng ngắt đoạn làm phố thành "lối hẹp" giả). Chậu cây bờ kênh phía bắc dời khỏi đại lộ.
- Vật liệu không phải đường cho phần không phải lối đi: viền luống gỗ đỏ, thềm nhà chơi gỗ bạch dương, đài phun nước sân trường và cổng dịch chuyển bằng đá, tường thành lâu đài bằng đá, sàn tầng trên của dãy lớp bằng gỗ khúc `log` (vân vòng gỗ như sàn gỗ ghép), trần dưới mái bằng vữa vàng: ván `planks` là khối đường, mặt sàn tầng 2 sẽ thành một "đảo đường" che mất sàn tầng trệt trong phép đo 2,5D. Đã thử gỗ đỏ `wood-red`: sàn ra màu cam đỏ quá gắt so với mock c-19, nên bỏ.
- Đường mới: từ cửa sau sảnh vòng qua biển khu sân sau; vào vườn giữa các luống tới cửa nhà kính; tới cửa phòng mĩ thuật, căng tin, xưởng đồ chơi; tới cửa thư viện phố; dọc bờ ruộng vào cánh đồng; lên chân thác; băng qua phố tới hải đăng; tới từng bến xe buýt ở 7 quận và bến về (bến về lâu đài đặt ở chân đồi); cầu ván nối bờ với cầu tàu giữa của bến cảng.

## Góc chụp

- `content/world/mock-views/truong-hoc.json`: chỉnh `c-18-cau-thang` (đứng trên chiếu nghỉ, nhìn lên bậc 5 rộng) và `c-05-vuon-khoa-hoc` (mắt cũ nay nằm trong hành lang sau đã lùi 3 ô; dời vào vườn 10 ô). Chụp lại cả 12 khung mock (`PREVIEW_ONLY=mock__`), đã xem bảng so sánh: lớp học, thư viện, hành lang, phòng nhạc, nhà kính, đường chính, sân trường đọc rõ; viền luống nay gỗ đỏ (mock là gỗ nâu), bảng xanh của lớp kế bên lộ ra trên tường phòng nhạc (bảng là chính khối tường chung).
- `tools/assets/render-preview.ts` (SCHOOL_VIEWS, không sửa): `lop-04`, `lop-05` vẫn trong lớp 2A (lớp nay x 383–395, sâu tới z 381); `lop-07` vẫn đứng trên chiếu nghỉ nhưng bậc nay rộng 5 và bắt đầu ở z 372; `lop-03-mat-sau-hanh-lang`, `khu-08-goc-nhin-phia-sau`, `nha-04` nhìn mặt sau đã lùi 3 ô — nên chỉnh lại khung `lop-03` (gần hơn 3 ô) và `lop-07` khi phiên chính chụp trang review.

## Kiểm tra

- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi.
- `pnpm exec eslint tools/world/generate-school-map.ts tools/world/structures/school.ts tools/world/structures/truong-hoc-plaza.ts --max-warnings=0`: 0 lỗi, 0 cảnh báo.
- `pnpm vitest run tools/world/generate-school-map.test.ts tools/world/mock-views.test.ts`: 16/16 đạt (gồm "matches the committed output", đi tới lớp tầng trên ở +4).
- Không chạy `pnpm test`, E2E, perf.

## Tệp đã sửa

`tools/world/generate-school-map.ts`, `tools/world/structures/school.ts`, `tools/world/structures/truong-hoc-plaza.ts` (thêm tham số tùy chọn `ShopSize` cho `placeShop`; mặc định giữ nguyên nên Trung tâm không đổi), `content/world/mock-views/truong-hoc.json`, `assets/generated/world/truong-hoc/**`, ảnh `assets/generated/review/truong-hoc/mock__*`. Không thêm model mới, không đổi `models.json`, `box-props`.

## Đề xuất cho tệp chung

- `hamlet` (scenery.ts): kiểm cả ô nhà lẫn sân (đường, nước, chỗ giữ, độ dốc) như `levelHamlet` của map này; hiện chỉ thử một ô nên nhà đè đường và lún vào sườn đồi.
- `cottageRow`: cây sân đặt ở `x1 + 1` có thể rơi ra đường lát bên cạnh; nên kiểm `onPath`/khối đường trước khi đặt.
- `placeWindmill`, `placeLighthouse` (countryside.ts): cửa 1 rộng; nên mở 3 rộng hoặc làm đặc tháp hẹp, thay vì vá ở từng map.
- `scenery-audit`: đọc một mặt đường mỗi cột nên nhà nhiều tầng phải tránh ván `planks` ở tầng trên; nếu muốn tầng trên dùng ván, phép đo cần xét nhiều tầng mỗi cột. Gờ đỉnh tường gỗ (`log`, `birch-log`) cạnh tán cây bị coi là thân cây.

## Còn mở

- Tầng lớp học vẫn cao 4 khối (trống 3 khối) vì test `generate-school-map.test.ts` khóa "tầng trên cao hơn 4"; muốn trần cao hơn cần đổi test đó (ngoài phạm vi tệp được giao).
