# Lâu đài — nhà to, cửa rộng, cảnh vật như thật, một mạng đường liền

Ngày: 02–03/10/2026 · Map: `lau-dai` · Brief: `plans/dattqh/261002-2216-houses-big-wide-doors/phase-02-map-brief.md`, `.claude/rules/world-scenery.md` (gồm mục "Mạng đường").

Tệp đã sửa: `tools/world/generate-lau-dai-map.ts`, `tools/world/structures/lau-dai-castle.ts`, ảnh/tệp sinh của map (`assets/generated/world/lau-dai/**`, `assets/generated/review/lau-dai/mock__*`). Không sửa tệp dựng chung, `models.json`, `box-props`, `mock-views` (góc chụp cũ vẫn khớp: các mốc giữ chỗ).

## Số đo trước / sau

| Kiểm tra | Bản đã commit (đo 02/10, audit cũ) | Sinh lại, generator chưa sửa (audit mới 03/10) | Sau khi sửa |
| --- | --- | --- | --- |
| `room-audit` | 536 không gian có mái, 19 thiếu | 401 không gian có mái, 27 thiếu | 373 không gian có mái, **0 thiếu** |
| `scenery-audit` cây trên đường | 11 | 10 | **0** |
| `scenery-audit` đồ chắn giữa lối | 10 | 10 | **0** |
| `scenery-audit` nơi không cạnh đường | (chưa có) / 16 theo điều phối | 16 | **0** |
| `scenery-audit` nơi cắt khỏi mạng của chỗ xuất hiện | (chưa có) / 47 theo điều phối | 44 | **0** |
| `reach-audit` | mọi mục tới được, chỗ xuất phát trống | như cũ | **mọi mục tới được, chỗ xuất phát và điểm xuống xe trống** |

27 chỗ thiếu trước khi sửa: 7 gian ôn tập trong đại sảnh (mái sạp đứng được dưới trần, trèo 3), bục huy hiệu (trèo 2), 15 tháp rỗng không lối vào (tháp tường thành, tháp cổng, tháp góc cung điện, tháp trên vọng lâu, tháp canh trong rừng), chòi gác gỗ (lối lên rộng 1), nhà gác cổng (cửa rộng 1), hai cối xay gió (cửa rộng 1), tháp canh (trèo 2).

## Từng công trình

| Công trình | Trước | Sau |
| --- | --- | --- |
| Đại sảnh (69 × 71, trần 13) | cửa 7 × 8, toàn bộ lòng cửa là thảm đỏ (không phải mặt đường) nên sảnh tách khỏi mạng đường; 7 gian ôn tập là sạp có mái phẳng đứng được dưới trần; bục huy hiệu bậc 2 | cửa **11 × 8** (thảm và nền lát hai bên chạy vào trong); gian ôn tập thành quầy trong nhà (`reviewBooth`: cột, quầy 1, kệ 2, diềm vải sọc, không mái); bục huy hiệu có bậc trước 1 khối; đống ván 1 khối có thanh khung gỗ; cột giàn hoa giấy bằng ván (không còn "thân cây" trên nền lát); tầng áp mái dưới mái hồi lấp đặc. Sàn trống 98 %, mọi chỗ tới được |
| Thư viện, phòng ăn (31 × 61, trần 11) | cửa 3 × 4 | cửa **5 × 6**; sàn trống 88 % / 84 % |
| Phòng nghỉ (25 × 25, tường 9) | cửa 3 × 4, tầng áp mái rỗng | cửa **5 × 5**, áp mái lấp đặc; sàn trống 91 % |
| Hầm ngục (59 × 23) | cửa phòng giam là song sắt, khe 1 khối; thùng đặt ngay trước song | mỗi phòng giam có **cửa song mở 3 × 4**; thùng, hòm dời vào giữa các cửa; sàn trống 96 % |
| Tháp canh (d-10) | tháp tròn bán kính 6 (trong ~10 khối), cửa 1 × 2, sàn lệch đất 2 khối, chóp chạm trần thế giới | phòng tròn bán kính **8** (trong 16 × 15), **cửa 3 × 4** phía đông, bậc đá 1 khối xuống lối, cửa sổ rộng ba phía (bậu cao 3 để bé nhìn ra, không trèo ra), chóp bậc 1 khối/tầng (đỉnh ~41 < 48); bàn bản đồ, kính viễn vọng, thùng, hòm, giá vũ khí giãn theo phòng to |
| Nhà gác cổng | 9 × 7, tường 4, cửa 1 | **15 × 11, tường 7, cửa 3 × 4**, hai cửa sổ, lối lát từ đường vào cửa, ghế, đèn |
| Phòng vẽ (30 × 14) | tường 5, cửa 3 × 3, nền cỏ | tường **7**, cửa **5 × 4**, sàn ván |
| Phòng tranh (vòm cuốn 51 × 14) | nền cỏ; bậu hoa bằng ván | sàn ván; bậu hoa bằng gỗ súc |
| Chòi gác gỗ (khu luyện tập) | chỉ có thang 1 cột | **cầu thang ván 3 rộng**, mỗi bậc 1 khối, lan can mở 3 ô |
| Cối xay gió ×2 | cửa 1 | cửa **3 × 4** |
| Tháp tường thành, tháp cổng, tháp góc cung điện, tháp trên vọng lâu, tháp canh rừng | thân rỗng kín | **lấp đặc** (`fillTowerShaft`): khối trang trí, không phải phòng |
| Nhà dân (`streetHouses`, `cottageRow`, `hamlet`) | bản commit còn cỡ cũ (8 × 13, tường 4, cửa 2, trèo 2–3) | bộ dựng chung pha 1 tự làm to (13–17 × 11–12, tường 7, cửa 3, bậc); thêm `joinWalks` nối lối lát vườn trước vào đường (trước đây hụt 1 ô cỏ) |

Không nhà nào bị bỏ. Không có ngoại lệ trong `room-audit` (0 chỗ thiếu, không phải ghi lý do).

## Cảnh vật

- Cây trong thành (4 cây hoa trong các khu, 2 cây hai bên đài phun) trồng trong bồn đất 3 × 3 có viền đá (`plantedTree`); sân người hầu giữ cỏ làm vườn (cây ăn quả của `cottageRow` đứng trên cỏ). Cây vườn mọc dưới chân đá cối xay thị trấn: giữ chỗ cối xay trước khi trồng vườn cây.
- Bãi tập: viền cỏ 2 khối bên trong rào mang rào, giá vũ khí, cột cờ; nền đất nện liền (bỏ các mảng cỏ lấm tấm làm hẹp lối), hai cổng (nam ra lối cổng tây, tây ra khu sân) nền đất xuyên qua viền cỏ.
- Vòng hàng rào lá và luống hoa trên bãi cỏ trước cổng dời lên phía nam, không cắt ngang đường rừng; bàn ăn ngoài trời dời khỏi vòng đó.
- Đèn, bụi, rào ven đường (`laneVerge`) đặt theo từng đoạn giữa hai ngã giao (`vergeStretches`, cách ngã giao 6 khối): không còn đoạn rào chắn ngang miệng phố.

## Mạng đường

- Mặt cầu đá chính và cầu cổng tây lát đá như đại lộ (trước là gạch đá xây, không phải mặt đường: thành chỉ nối với bến xuất phát qua xe buýt). Nay từ chỗ xuất hiện đi bộ được: đại lộ → cầu → cổng → sân đài phun → cửa đại sảnh, thư viện, phòng ăn; lối cổng tây → hầm ngục, bãi tập (cầu thang lên chòi), phòng nghỉ, vườn.
- Sân hình khối lát gạch từ cửa phòng vẽ tới vòm phòng tranh (100–206 × 212–292), bồn hoa giữ đất.
- Bến xe đón: bãi lát cạnh lối tây chỗ xuất hiện.
- Đường mới: lối bờ hào dưới hàng liễu (qua quảng trường đầu cầu); lối đồng cỏ vòng qua cửa nhà gác ra đại lộ; lối bắc tới hồ dưới thác; đường đất qua ruộng bậc thang và lúa mì (nhánh tới cửa cối xay), tới hồ trong rừng, chòi canh rừng, trại tiều phu, qua vườn cây phía đông, và từ phố thị trấn tới cửa cối xay. Đường đất lát `trail`, đường cái giữ đá.
- Chợ thị trấn lát ra tới đại lộ và đường cái.
- Dời ba mốc không phải mốc quest về chỗ bé đứng được: "Thác nước sau lâu đài" (trước ở sườn núi sau hào, không có đường) về khu bắc trong thành nhìn lên thác; "Thị trấn dưới chân thành" về phố chính; "Cối xay gió" về trước cửa cối xay. Không mốc quest nào đổi tên hay chỗ; `ZONES` giữ nguyên.

## Kiểm tra

- `pnpm world:lau-dai`: 10.176 prop (trước 10.330), 73 mục tương tác, 167 người/vật.
- `room-audit`: 0 thiếu · `scenery-audit`: 0 / 0 / 0 / 0 · `reach-audit`: mọi mục tới được, chỗ xuất phát trống.
- `pnpm vitest run tools/world/zone-maps.test.ts -t "lau-dai"`: 4 đạt, 32 bỏ qua (map khác).
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi. `pnpm exec eslint <2 tệp> --max-warnings=0`: sạch.
- Không chạy `pnpm test`, E2E, perf.
- Ảnh mock: xem mục dưới.

## Ảnh đối chiếu

Chụp lại cả 13 khung `mock__lau-dai__*` (`PREVIEW_ONLY=mock__`, qua `with-lock.mjs`), so bằng `compare.py`. Góc chụp không cần đổi (mốc giữ chỗ):

- d-01, d-13 toàn cảnh: như trước, thêm bồn cây có viền ở hai cây bên đài phun.
- d-02 cổng, d-05 cầu: mặt cầu nay lát đá xám như đại lộ.
- d-03 sân: đài phun, cửa đại sảnh 11 rộng sau tượng mèo.
- d-04 khu luyện tập: nền đất liền, viền cỏ mang rào; cầu thang chòi gác ở mặt đông (ngoài khung).
- d-06 đại sảnh, d-07 thư viện, d-08 phòng ăn, d-09 phòng nghỉ: nội thất giữ nguyên, đọc rõ như mock.
- d-10 tháp canh: phòng to hơn hẳn (trong 16 × 15), cửa sổ rộng, bàn bản đồ, lính canh.
- d-11 hầm ngục: cửa song phòng giam mở, thùng hòm dọc hành lang.
- d-12 vườn hoàng gia: không đổi.

Chưa chụp đủ bộ ảnh map (không `PREVIEW_ONLY`): brief pha này chỉ yêu cầu chụp lại khung có nhà đổi.

## Đề xuất cho tệp dùng chung

- `widenRoundDoor`, `fillTowerShaft`, `joinWalks` nay có bản sao ở Làng Ven Sông, Nông trại và Lâu đài: nên chuyển vào bộ dựng chung (`structures/landmarks.ts`/`countryside.ts`, `scenery.ts`).
- `placeTower(…, door = false)` để lại thân rỗng kín: nên tự lấp đặc khi không có cửa; `placeWindmill` nên làm cửa 3 × 3.
- `streetHouses`: lối lát vườn trước nên chạy tới mép đường (hiện hụt 1 ô khi nhà lùi so với đường) — `joinWalks` đang vá ở từng map.
- `laneVerge`: đoạn rào 3 cột chỉ kiểm cột đầu, hai cột sau có thể rơi lên phố cắt ngang; nên kiểm từng cột (hoặc bỏ qua ngã giao như `vergeStretches`).
- `placeStall` đặt trong nhà có trần: mái phẳng thành "phòng" trên nóc sạp; nên có biến thể không mái cho sạp trong nhà.

Status: DONE
Summary: Lâu đài đạt chuẩn: room-audit 0 thiếu, scenery-audit 0/0/0/0, reach-audit mọi mục tới được; các phòng lâu đài cửa 5–11 rộng, tháp canh, nhà gác, chòi gác dựng lại to và có lối vào, mạng đường liền từ chỗ xuất hiện qua cầu vào mọi cửa sảnh.
Concerns: Ba mốc không phải quest được dời chỗ (ghi ở trên); vài đề xuất cho bộ dựng chung.

## Bổ sung 03/10: cửa mọi nhà nằm trên mạng đường

`scenery-audit` (b90db34) kiểm thêm: cửa mỗi không gian có mái ≥ 60 ô sàn phải cách ≤ 4 khối một ô đường nối về mạng của chỗ xuất hiện. Sinh lại ở HEAD 214e82b: **31 cửa bị cắt**, gồm 18 nhà xóm phía tây (x 18–143, z 388/410/432), 8 nhà xóm phía bắc (x 250–289, z 158–224), 2 nhà người hầu và 3 lán trại tiều phu. Tất cả là nhà `hamlet`/`cottageRow` quay cửa ra sân cỏ có rào, không có lối nào.

Sửa trong `generate-lau-dai-map.ts`:

- **Ngõ lát sau rào sân** mỗi dãy nhà (`HAMLET_LANES`), chín khối trước cửa. Ngõ xóm tây chạy ra đường đất thấp (x = 160). Ngõ xóm bắc đi ra một trục dọc x = 244, nối xuống lối cổng tây. Các ngõ này không đặt đèn/bụi ven đường vì hai bên là sân và tường sau nhà.
- **`doorWalks`**: lối lát rộng bằng cửa (3) đi từ mỗi cửa (nhận ra ở tường trước: trống 3 khối, có tường bên trên), qua khe cổng rào, tới ngõ. Áp cho cả hai xóm, sân nhà người hầu (ra nền lát trong thành) và trại tiều phu (ra đường đất của trại).
- `joinWalks` không chạy trên ngõ xóm (đã có lối riêng). Lần đầu chạy, nó lát một dải chạm đèn cổng của nhà phố bên cạnh; vùng dò cửa cũng được giới hạn trong phạm vi thật của xóm, không cắt lối xuyên nhà phố kế bên.

Kết quả sau `pnpm world:lau-dai`:

- `scenery-audit`: 0 / 0 / 0 / 0 (gồm 0 cửa nhà bị cắt).
- `room-audit`: 370 không gian có mái, 0 thiếu.
- `reach-audit`: mọi mục tới được, chỗ xuất phát trống.
- tsc: 0 lỗi. eslint `--max-warnings=0` trên 2 tệp: sạch.
- `pnpm vitest run tools/world/zone-maps.test.ts -t "lau-dai"`: 4 đạt.

Không chụp lại ảnh mock: các khung đặt ở lâu đài và nội thất, hai xóm nằm ngoài khung hoặc ở rìa xa của toàn cảnh, nên không đổi rõ.

Status: DONE
Summary: Mọi cửa nhà ở Lâu đài nay nằm trên mạng đường: có ngõ lát sau rào mỗi dãy nhà xóm, lối lát từ từng cửa ra ngõ; ba audit sạch, tsc, eslint và test map xanh.
Concerns: Không có.
