# Trung tâm: nhà to, cửa rộng, cảnh vật và mạng đường (02–03/10/2026)

Plan: `plans/dattqh/261002-2216-houses-big-wide-doors/` (pha 2, map `trung-tam`) và luật `.claude/rules/world-scenery.md` (commit 1ffac28, 8a4aaa3). Tôi không `git add` và không commit.

## Số đo

| Lệnh | Trước | Sau |
| --- | --- | --- |
| `room-audit trung-tam` (bản đã commit) | 497 không gian có mái, **30 thiếu**: 26 nhà phố cửa rộng 2 phải trèo 2–3 khối, 3 sạp và mái bảng nhiệm vụ còn dưới 70% sàn trống | 691 không gian, **1 thiếu**: mái bảng nhiệm vụ, là ngoại lệ (xem dưới) |
| `room-audit` sau khi chỉ sinh lại map với bộ dựng chung mới | 707 không gian, 4 thiếu (3 sạp, mái bảng) | |
| `reach-audit trung-tam` | mọi mục tới được, chỗ xuất hiện trống | mọi mục tới được, chỗ xuất hiện trống |
| `scenery-audit trung-tam` (đo sau phần nhà, trước khi sửa cảnh vật) | 160 cây trên đường/sân lát, 10 đồ chắn giữa lối, 3 điểm xa đường, 4 điểm bị cắt khỏi mạng đường của chỗ xuất hiện | **0 / 0 / 0 / 0** |

Số "trước" của `scenery-audit` đo trên map đã có phần nhà mới. Các phần đổi ở nhà không thêm cây hay đồ lên đường, nên các số này cũng là số của bản cũ.

Ngoài lệnh chính, tôi chạy thêm một bản `room-audit` tạm (bản sao trong scratchpad, đo mái tới 24 khối thay vì 9) để thấy nhà tường cao. Lệnh chính không thấy nhà tường 7–8 khối vì mái ở quá 9 khối trên sàn: nó chỉ thấy dải mái hiên. Với bản tạm, mọi nhà, cửa hàng, chòi, sảnh lâu đài, thư viện và trường đều đạt: cửa ≥ 3, không phải trèo, sàn trống ≥ 89%, tới được 100%. Bản tạm cũng cho thấy hai loại khối kín rỗng mà lệnh chính bỏ sót: phòng trên trần sảnh dưới mái tháp chính, và lòng các tháp tròn. Cả hai nay đã hết (xem mục lâu đài).

## Từng công trình

| Công trình | Cũ | Mới |
| --- | --- | --- |
| Nhà phố (`streetHouses`, bộ dựng chung) | 7–11 × 6–8, tường 4, cửa 2, trèo 2–3 khối | Sinh lại nên tự lên 13–17 × 11–12, tường 7, cửa 3 × 3, có bậc. Hai cây quảng trường (314,516) và (486,516) nay nằm trong vườn nhà mới nên đã bỏ. |
| Cửa hàng (d-02) | `placeShop` chung 16 × 6, tường 5. Mặt tiền là hai quầy, phải bước qua quầy mới vào. | `placeHubShop` mới trong `structures/trung-tam-buildings.ts`: sảnh gỗ 22 × 14, tường 8, mái hai mái cao tới khoảng y0+16. Cửa giữa rộng 4 cao 5, hai bên là quầy dưới mái sọc. Biển "CỬA HÀNG" gắn trên trán tường, cửa sổ sáng và đèn tường ở hai bên và phía sau. Bên trong có 6 kệ dọc tường, 2 bàn trưng bày hai bên lối thảm đỏ rộng 4, và đèn chùm. Sàn trống 89%. |
| Chòi tổ đội (d-05) | `placeGazebo` chung 7 × 7, xà cao 4 | `placeTeamGazebo` mới: 11 × 11, xà cao 6, mái chóp xanh. Mỗi mặt mở 5 ô ở giữa, lan can gỗ hai bên. Có 4 ghế trong, bàn giữa, 5 biển TEAM treo dưới xà, nhóm bạn đứng bên trong như trong mock. Tâm dời từ (419,466) sang (422,470) để tránh cờ và ghế quanh bồn hoa. Mốc "Chòi chờ tổ đội" dời từ (411,459) sang (421,461), tên giữ nguyên. |
| Thư viện | 40 × 18, tường 7 | 40 × 18, tường 9 |
| Trường (khu học tập) | 36 × 14, tường 6 | 40 × 18, tường 8 (z0 638, giữ tâm cũ). Có ngõ lát mới từ phố z=600 tới cửa. Cột cờ dời sang cạnh ngõ. |
| Lâu đài | Cổng bị tấm sáng `tt-portal-ice` chắn kín (vật cao 4,95, rộng 4,9), nên không vào được sảnh dù tuyến đường dẫn vào. Lòng tháp tròn và phòng trên trần sảnh dưới mái tháp chính đều là khối kín rỗng. | Bỏ tấm sáng. Cổng phát sáng nhờ đèn khối gắn hai bên má cổng, lối vào 5 × 5 thông vào sảnh 33 × 55 cao 9. Tháp sau sảnh mở một cửa 3 × 3 thành phòng tròn bên cạnh sảnh. Các tháp khác làm đặc, phòng trên trần sảnh cũng làm đặc. |
| Sạp chợ, sạp đồ ăn (`placeStall` chung 6 × 4) | 3 sạp chỉ còn 47–50% sàn trống vì mẫu `bread.glb` bị phóng 6,29 lần thành ổ bánh 4 × 4 khối trên quầy | Thay bánh mì bằng `grapes.glb`. Sàn trống nay 88–97%. Sạp là quầy bán, không phải nhà, nên giữ cỡ cũ. |
| Tháp đồng hồ, hải đăng | | Không đổi. Tháp đồng hồ có cửa 3 × 3, hải đăng không có khối rỗng kín. |

## Ngoại lệ còn lại (`room-audit`)

- `[430,13,441] 2x9`, 56% sàn trống: đây là mái ngói nhô 2 khối trên tấm bảng nhiệm vụ gắn tường đá (d-04), không phải nhà. Tấm bảng đứng sát tường ngay dưới mái nên chiếm chỗ.

## Cảnh vật và mạng đường

- Cây trên sân lát: cây đặt bằng tay nay trồng trong bồn (đất 3 × 3, viền đá cao 1 khối), gồm cây quảng trường, khu sự kiện và hai hàng cây mỗi bên lâu đài trên thềm (32 cây). Cây mọc tự do không được mọc trên thềm lát và dải lát quanh kênh. Ở dải lát quanh kênh, phần chặn chừa khu bài học 1 và 4 để quest còn chỗ đặt.
- Đồ giữa lối: chậu hoa bờ kênh chỉ đặt trên quảng trường đến (rộng). Chậu trước thềm sát vào mặt thềm. Cờ ở khu giao dịch dời khỏi đường tây. Hai góc đường thư viện không còn nhà, vì rào vườn nhà ở đó chìa ra lối.
- Mạng đường: thêm tuyến bến cảng dọc bờ, từ cuối đường đông qua các cầu tàu tới hải đăng, và ngõ tới trường. Điểm đến khinh khí cầu "Khu sống" và "Thư viện" dời sát đường. Trên đài phun nước, viền tầng trên và bệ tượng đổi sang khối `stone` để audit không lấy chúng làm đường. Thảm qua cổng lâu đài thu còn 3 ô để hai bên là đá lát. Trần sảnh, lớp trên cùng và răng cưa của tháp cổng đổi sang khối viền: đỉnh tường lát `cobble-grey` bị audit coi là đường nằm che lên sàn sảnh, nên sảnh trước đó bị tính là tách khỏi mạng.

## Góc chụp mock

Đã đổi `d-02` (eye [9, 2.6, 4]) và `d-05` (eye [-8, 3.2, 22], look [1, 3.5, 9]) cho khớp cửa hàng và chòi mới. Tôi đã chụp lại cả 8 khung `mock__` (`PREVIEW_ONLY=mock__`, qua khóa) và xem bản so sánh: cửa hàng có biển, mái sọc, cửa, thảm; chòi có bạn đứng bên trong. Để xem bên trong cửa hàng, trường và chòi, tôi dùng vài góc chụp tạm rồi gỡ bỏ, xóa ảnh của chúng và chạy lại `assets:manifest` qua khóa. Chưa chụp lại bộ ảnh đầy đủ của map (không `PREVIEW_ONLY`).

## Kiểm tra

- `tsc --noEmit -p tsconfig.json`: báo 1 lỗi, ở `tools/world/generate-nui-tuyet-map.ts(151,205)` TS1011. Tệp này thuộc map khác và đang có agent khác sửa. Typecheck riêng ba tệp của tôi bằng một tsconfig tạm (đã xóa): 0 lỗi.
- `eslint generate-trung-tam-map.ts structures/trung-tam-square.ts structures/trung-tam-buildings.ts --max-warnings=0`: 0 lỗi, 0 cảnh báo.
- Theo yêu cầu, không chạy `pnpm test`, vitest, E2E hay perf.

## Tệp đã sửa

- `tools/world/generate-trung-tam-map.ts`
- `tools/world/structures/trung-tam-square.ts`
- `tools/world/structures/trung-tam-buildings.ts` (mới)
- `content/world/mock-views/trung-tam.json`
- Ảnh và dữ liệu sinh ra của map: `assets/generated/world/trung-tam/**`, `assets/generated/review/trung-tam/mock__*.png`, manifest

Không đổi `models.json`, `box-props/trung-tam.json`, tệp dựng chung, `ZONES`, tên mốc quest.

## Đề xuất cho tệp chung

1. `room-audit.ts` chỉ coi là có mái khi khối mái cách sàn 2–9 khối. Nhà tường 7–9 khối có mái hai mái thì phần lớn sàn không được đo, và tháp, phòng kín cao cũng lọt qua. Nên nâng giới hạn lên khoảng 24 khối, hoặc dò mái theo cột tới gặp khối.
2. `content/world/models.json`: `kenney-food-kit/2.0/bread.glb` khai `height: 0.25` nên mẫu bị phóng 6,29 lần, ra ổ bánh 4 × 4 khối. Nên hạ chiều cao, hoặc đo theo cạnh dài. `cho-phien`, `nui-tuyet`, `xom-mai-am` và trường học cũng dùng mẫu này.
3. `scenery-audit.ts` coi khối `log`/`birch-log` trong tường nhà là thân cây khi có lá gần đó, và coi đỉnh tường `cobble-grey` là đường. Nên chỉ xét `tree-log`/`tree-birch-log` là thân cây, và bỏ qua mặt đường nằm cao hơn mặt đất xung quanh vài khối.

Status: DONE_WITH_CONCERNS
Summary: Trung tâm có cửa hàng, chòi, trường, thư viện to hơn và sảnh lâu đài vào được. Cả ba audit đạt (room chỉ còn mái bảng nhiệm vụ là ngoại lệ có lý do; scenery 0/0/0/0; reach đủ), eslint sạch.
Concerns: `tsc` toàn repo đỏ vì lỗi cú pháp ở `generate-nui-tuyet-map.ts` (map khác). Các khung mock đã chụp lại, nhưng bộ ảnh đầy đủ của map chưa chụp lại.
