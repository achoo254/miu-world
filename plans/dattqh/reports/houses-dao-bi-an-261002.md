# Nhà to, cửa rộng, cảnh vật và mạng đường — Đảo bí ẩn (`dao-bi-an`)

Ngày 02–03/10/2026 · Pha 2 của plan `plans/dattqh/261002-2216-houses-big-wide-doors/` · Tier L. Phạm vi thêm theo người sở hữu (qua phiên chính): luật cảnh vật và mạng đường (`.claude/rules/world-scenery.md`, commit 1ffac28 và 8a4aaa3).

## Số đo

| Lệnh | Trước | Sau |
| --- | --- | --- |
| `room-audit.ts dao-bi-an` | 23 không gian có mái, **3 thiếu**: sạp trái cây 7×4 (62% sàn trống), hai chòi chài 4×6 (cửa phải trèo 2 khối) (tầm mái 2–9 khối) | 29 không gian có mái, **0 thiếu** (bản hiện tại, tầm mái tới 24 khối) |
| `reach-audit.ts dao-bi-an` | mọi mục tới được; chỗ xuất hiện trống | mọi mục tới được; chỗ xuất hiện trống |
| `scenery-audit.ts dao-bi-an` — cây trên đường / đồ chắn giữa lối | 8 / 8 | **0 / 0** |
| `scenery-audit.ts dao-bi-an` — nơi xa đường / nơi trên đường đứt khỏi mạng của chỗ xuất hiện | 47 / 28 | **0 / 0** |

Số "trước" của `scenery-audit` đo trên map đã có nhà mới (lúc nhận thêm phạm vi); phần nhà mới không thêm phát hiện nào vào đó (không cây, không đồ trên đường, chưa có đường mới).

Bản `room-audit` lúc bắt đầu chỉ coi là "có mái" khi mái cách sàn 2–9 khối nên không thấy lòng nhà tường 7 (trần giữa nhà 10–13 khối); tôi đo lòng nhà bằng bản sao tầm mái 18 rồi đề xuất nâng tầm. Phiên chính đã nâng lên 24 (commit 90c43e4); số dưới đây là của bản đó, chạy trên map cuối:

| Công trình | Lòng nhà (gồm hiên) | Cửa rộng nhất | Trèo ở cửa | Sàn trống | Tới được |
| --- | --- | --- | --- | --- | --- |
| 5 nhà chài 13 × 11 | 13 × 11, 115 ô | 13 (hiên) | 0 | 92% | 100% |
| Nhà chài 15 × 11 | 15 × 11, 135 ô | 15 | 0 | 93% | 100% |
| Lều thuyền trưởng 11 × 13 | 13 × 15, 154 ô | 52 | 0 | 94% | 100% |
| Đền thờ 49 × 49 | 47 × 48, 2.126 ô | 7 | 0 | 98% | 100% |
| Hang hải tặc | 26 × 13, 322 ô | 13 | 0 | 91% | 100% |
| Sạp trái cây 7 × 4 | 9 × 5, 36 ô | 22 | 0 | 86% | 100% |
| Hang lớn: hầm, đại sảnh, kho báu (một phòng) | 55 × 107, 3.055 ô | 11 (miệng hang) | 0 | 92% | 100% |
| Riêng kho báu (đo theo hộp) | 33 × 29, 941 ô sàn | 5 (lối từ hang) | 0 | 78% | 100% |

Kho báu đo riêng theo hộp phòng (cùng cách tính ô trống của `room-audit`: không prop rắn ở ô chân và ô đầu).

## Từng công trình

- **Chòi chài (6 cái) → nhà chài trên cột (6 cái)**. Cũ: 6 × 6, tường 3, cửa 1 × 2, sàn cao 2 khối trên cát với một bậc kẹt ở cửa, trong trống trơn. Mới (`structures/dao-bi-an-houses.ts`, `fishingHouse`): 13 × 11 (một cái 15 × 11), tường 7 khối gỗ ván có cột và xà gỗ, cửa sổ kính, mái hai dốc lợp tranh hoặc mái đỏ xen nhau, nóc mái đất; cao cả nhà khoảng 16 khối (≈ 11 lần bé). Cửa 3 × 3 giữa mặt trước, đèn hai bên cửa, ngưỡng cửa lát ván liền sàn. Sàn ván trên cột gỗ cao 2 khối trên nền đã đắp phẳng; hiên ván chạy suốt mặt trước dưới mái hắt; bậc ván rộng 5 khối từ hiên xuống tới mặt ngõ, mỗi bậc 1 khối (`doorSteps` dùng chung, tính theo mặt đất thật trước cửa; ngõ thấp hơn nền thì bậc dài thêm). Nội thất sát tường: chiếu ngủ, rương, giàn lưới, thùng, hòm gỗ, bàn hai ghế, đèn cây, thảm (đi xuyên được); lối giữa từ cửa tới vách sau thông. Hai đèn khối trên tường hông bên trong. Nhà chẵn/lẻ lật đồ đạc sang hai phía.
- **Bố cục làng chài**: hàng 4 nhà quay cửa xuống nam (z 573–583), hàng 2 nhà bên kia ngõ quay cửa lên bắc (z 591–601), ngõ làng lát đất rộng 3 khối ở giữa (z 586–588), cửa hai hàng lệch nhau. Giữa hai nhà hàng nam là sân nhỏ, có lối 3 khối xuống bờ biển; bếp lửa, thùng, xô, hòm, đống củi đặt hai bên lối. Mốc `lang-chai` "Làng chài" giữ đúng chỗ (480, 598). Giàn lưới phơi đặt giữa các nhà. Nền dưới mỗi nhà chỉ được đắp cao (không đào), dốc xuống một khối mỗi khối ra ngoài, không đụng đường và nước. Người làng (bếp, vá lưới, phơi cá, mèo, gà) dời vào ngõ và sân cho khỏi đứng trong tường.
- **Lều thuyền trưởng**: cũ là prop lều Kenney cao 2,6 khối, không vào được. Mới (`captainTent`): lều khối 11 × 13, vách vải trắng 7 khối trên cột gỗ, mái vải đỏ, cửa 3 × 3 quay về phía đông (về cầu tàu); sàn ván đặt ngay trên đất, không có bậc, lối từ đường trục tới tận cửa. Trong: bàn bản đồ ở giữa, rương và chiếu ngủ ở vách sau, thùng, hòm, đèn cây, thảm. Cờ, đèn đường, thùng đặt ngoài cửa (ngoài 2 ô trước cửa). Mốc `leu-thuyen-truong` "Lều thuyền trưởng" giữ chỗ cũ (386, 598), ngay trước lều.
- **Sạp trái cây**: 5 × 3 → 7 × 4 (`placeStall` dùng chung), năm thứ trái cây trên quầy; hai hòm trái cây chuyển ra sau sạp, ngoài mái, nên dưới sạp còn 86% sàn trống. Cô bán dừa đứng sau quầy theo chỗ sạp mới.
- **Đền thờ** (49 × 49, tường 15, cửa vòm 7 × 8, bậc 1 khối), **kho báu** (33 × 29, trần 9, lối vào 5 × 5), **hang hải tặc**, **đại sảnh hang**: đã đạt chuẩn về cỡ, không đổi cỡ. Đền thêm ngưỡng cửa lát đá liền sàn (trước là chỗ trũng 1 khối) và nền lát từ bậc qua cổng tới đại lộ khu di tích. Hồ trong đại sảnh hang làm nông còn 1 khối nước trên đáy đá: với tầm mái 24, `room-audit` thấy bờ hồ là cửa phải trèo 3 khối (rơi xuống hồ sâu 3 khối thì không tự lên được); nay lội ra được từ mọi phía, mặt nước giữ nguyên. Vùng ánh sáng (`moods`: hang, đền, rừng đêm) giữ nguyên, vẫn phủ các phòng.

## Cảnh vật (cây trên đường, đồ giữa lối)

- Hai cây lớn bên sàn cầu treo đứng trên đá chân cao nguyên (`cobble-grey`, công cụ tính là mặt lát): đặt gốc trên ô cỏ.
- Bốn cây dừa trước cổng đền đứng trên nền lát khu di tích: mỗi cây một bồn cỏ 3 × 3, việc lát khu di tích chừa các ô giữ trống (bồn cây, chân tường đổ).
- Cây dừa trên đá đen quanh núi lửa (`asphalt`): dừa ven biển không mọc trên đá trần hay mặt lát; vùng đá đen quanh núi lửa giữ trống cây.
- Khúc gỗ trôi và một cây dừa trên bãi biển rơi vào đường mới tới làng chài: dời ra cát bên cạnh.
- Đồ trong kho báu (đuốc cạnh cột, rương và đống vàng sát tường, pha lê tím) bị tính "giữa lối" vì sàn lát xen ô đèn: đặt chúng trên ô đèn phát sáng như các đống vàng khác của kho.
- Hòn đá nhỏ rải trong khu bài học rơi trên đại lộ khu di tích: thay đá nhỏ trong bộ rải khu bằng hoa (đi xuyên).
- Trước cửa và trong lòng cửa mọi nhà/lều/đền/hang: không cây, không đồ (kiểm tay theo vị trí đồ trong code).

## Mạng đường

Một mạng liền từ chỗ xuất hiện, đường đất (`trail`) rộng 3 khối bám mặt đất (zone-map hạ đất dọc đường, nước thì thành cầu ván), nối với sàn ván, sàn lát đã có; thuyền nối các bến:

- Bến tàu: trục bắc tới thác; nhánh qua cổng sang Trung tâm ra đầu cầu tàu; lối bãi biển qua mốc Bãi biển; đường dạo dọc bãi qua sáu bến thuyền, điểm bắt đầu chương 1, điểm xuống thuyền; nhánh tới rương vùi cát và vũng nước triều; nhánh tới cửa lều thuyền trưởng; nối đường ván sang đảo hải tặc.
- Rừng nhiệt đới: đường từ trục qua trại thám hiểm (nhánh mới vào trại) tới chương 2; đường rừng qua giữa khu, qua hồ thác tới chân hai cầu thang sàn cầu treo; bến thuyền rừng.
- Bắc: đường qua rừng đêm (nhánh qua ba bến thuyền tới lối ván ra hồ) tới khu hang; lối trong khu hang tới bến thuyền, xuống cửa hang; hầm, lối ván đại sảnh, lối vào kho báu nối liền.
- Đông: đường từ khu hang men cạnh đền tới đại lộ di tích; đường ván sang núi lửa tới ba bến và khu thử thách, vòng sườn đông khu thử thách lên bậc mỏm đá ngắm núi lửa; nhánh từ đại lộ sang bến thuyền di tích.
- Nam: đường từ di tích xuống ngõ làng chài, lối qua sân làng xuống đường ven biển; đường ván sang đảo hải tặc, qua bãi tới cửa hang hải tặc, nhánh tới chương 5, ba bến thuyền, điểm xuống thuyền, cầu cảng tàu hải tặc.

Trên đỉnh núi đá ngay trên hầm và lối ván trong hang, khối đá xám (`cobble-grey`, công cụ coi là mặt lát) ở mặt trên cùng đổi sang đá và rêu: `scenery-audit` chỉ lấy ô đường cao nhất mỗi cột, nên trước đó đá xám trên đỉnh núi che mất lối đi trong hang.

## Ngoại lệ của `room-audit` (không gian có mái không phải nhà, vẫn liệt kê, không thiếu)

- Gầm cầu tàu (390–410 × 636–676), gầm ba đường ván qua biển (521–622 × 206–215, 554–591 × 618–649, 492–538 × 608–614), gầm cầu cảng hải tặc, gầm bệ gỗ trước thác, gầm lối ván rừng đêm, mặt hồ dưới cầu ván trong hang: mặt nước/đáy cạn dưới sàn ván.
- Gầm cầu treo và sàn cây trong rừng nhiệt đới (213–257 × 331–342): dưới sàn và tán cây lớn.
- Vòm đá trên đảo nhỏ (501–509 × 724–726) và cổng đá trước đền (588–596 × 363–365): vòm/lanh tô, không phải nhà.
- Dải hiên và mái hắt quanh các nhà mới (13–17 × 1–3): phần ngoài tường dưới mái hắt.

Không lọt vào phép đo vì trần cao: tháp đổ nát quanh khu di tích (7 × 7, hở nóc, cửa 3 × 3 — tàn tích, không phải nhà), hai miếu trong vách thác (khối đặc có cửa phát sáng, không vào được). Lều ở trại thám hiểm là prop lều cắm trại trong một khu trại, không phải nhà; giữ nguyên.

## Mốc, khu và mục quest

- `ZONES` không đổi; mọi mốc giữ tên, id và vị trí. Chỗ xuất hiện, điểm bắt đầu chương, vùng ánh sáng không đổi.
- Do thêm vùng giữ trống và đường, bộ đặt mục quest theo seed xếp lại sáu mục ở khu Bến tàu, mỗi mục lệch 1–4 khối: bà ngư dân Mực, Cua Đỏ Kìm Kẹp, mảnh bản đồ góc, mảnh bản đồ xanh, rương vùi cát, nhật kí thuyền trưởng. `reach-audit`: tất cả tới được.
- Prop của map: 3.768 → 3.734 (cây/dừa nhường chỗ đường mới và vùng đá núi lửa; thêm nội thất nhà).

## Ảnh

Chụp lại cả 14 khung mock (`PREVIEW_ONLY=mock__`, qua khóa chụp) và hai ảnh `dao-bi-an-lang-chai.png`, `dao-bi-an-leu-thuyen-truong.png`; so bằng `compare.py`:

- d-01 toàn cảnh: thấy lều trắng mái đỏ và dãy nhà chài lớn sau bãi, đường đất nối bãi, cầu tàu.
- d-02 bến tàu: lều thuyền trưởng đứng bên trái trục nhìn, nhà chài bên phải; núi giữa không bị che.
- d-03 bãi biển: đường bãi biển và nhánh tới rương vùi cát chạy qua cát trước mặt.
- d-05, d-06, d-07, d-08 (d-08 chụp lại lần nữa sau khi làm nông hồ): lối ván trước thác; nền lát, ngưỡng và bồn dừa trước đền; đường đất tới tận cửa hang; lối ván trong đại sảnh — đọc rõ là một mạng đường.
- Các khung khác chỉ đổi chi tiết nhỏ (đá nhỏ thành hoa, cây nhường đường).
- `dao-bi-an-leu-thuyen-truong.png`: lều, cờ, đường tới cửa, làng chài và sạp ở xa.
- `dao-bi-an-lang-chai.png`: góc chụp chung của `render-preview` (mắt cách mốc 22 × 30 khối về tây bắc, cao 20) nay nằm ngay trên mái nhà chài hàng bắc, nên ảnh chủ yếu thấy mái. Nhà cao 16 khối thì mọi mốc trong một cụm nhà to đều gặp chuyện này; xem đề xuất bên dưới. Không dời mốc.

## Kiểm tra

- `room-audit`, `reach-audit`, `scenery-audit` như bảng trên.
- `pnpm exec eslint tools/world/generate-dao-bi-an-map.ts tools/world/structures/dao-bi-an-{coast,houses,inland}.ts --max-warnings=0`: 0 lỗi, 0 cảnh báo.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi (lần chạy cuối, sau khi map khác sửa xong lỗi tạm của họ ở `generate-nui-tuyet-map.ts`).
- Không chạy `pnpm test`, E2E, `perf` (người sở hữu cấm).

## Tệp đã sửa

- `tools/world/structures/dao-bi-an-houses.ts` (mới): `raisePad`, `islandHouse`, `fishingHouse`, `captainTent`.
- `tools/world/structures/dao-bi-an-coast.ts`: bỏ `stiltHut`, làng chài mới, sạp to hơn, lều thuyền trưởng bằng khối, dừa không mọc trên đá trần, vùng đá núi lửa giữ trống cây, dời đồ bãi biển khỏi đường.
- `tools/world/structures/dao-bi-an-inland.ts`: gốc cây lớn trên cỏ, bồn dừa trước đền, việc lát khu di tích chừa ô giữ trống, ngưỡng và nền lát trước cửa đền, đồ kho báu trên ô đèn, đỉnh núi trên lối hang không dùng đá xám, hồ trong hang nông 1 khối.
- `tools/world/generate-dao-bi-an-map.ts`: mạng đường mới (`ROUTES`), bộ rải khu không còn đá nhỏ, chỗ cô bán dừa theo sạp mới, người và vật làng chài dời vào ngõ/sân.
- Sinh lại `assets/generated/world/dao-bi-an/**`; chụp lại cả 14 khung mock và hai ảnh làng chài, lều thuyền trưởng trong `assets/generated/review/dao-bi-an/`; manifest sinh lại qua lệnh chụp.
- Không thêm model, prop hộp hay dòng `models.json` (bàn, ghế, đèn cây, thảm của bộ nội thất Kenney đã có trong catalog).

## Đề xuất cho tệp chung

- `tools/world/room-audit.ts`: đề xuất nâng tầm tìm mái đã được phiên chính làm (24 khối).
- `tools/world/scenery-audit.ts`: mạng đường lấy ô đường cao nhất mỗi cột, nên lối đi trong hang/dưới mái đá không thấy nếu trên đỉnh có khối được coi là mặt lát; `cobble-grey` và `asphalt` còn được map này (và có thể map khác) dùng làm đá vách, đá núi lửa, nên cây trên vách đá bị tính là "cây trên đường". Đề xuất xét mọi ô đường có khoảng trống trên đầu (không chỉ ô cao nhất), và tách khối đá tự nhiên khỏi khối lát.
- `tools/assets/render-preview.ts` (ảnh mốc ngoài trời): góc nhìn cố định 20 khối trên, 37 khối về tây bắc bị mái nhà cao 16 khối che khi mốc nằm giữa cụm nhà; đề xuất nâng mắt theo chiều cao công trình quanh mốc hoặc thử vài hướng như `roomView` đã làm cho mốc trong phòng.
- `placeStall` (countryside.ts) đặt hai hòm prop lên bệ ván hai đầu quầy, dưới mái sọc: phép đo tính là đồ chiếm sàn (sạp nhỏ dễ dưới 70%). Có thể để bệ trống hoặc bỏ bệ.

```
Status: DONE_WITH_CONCERNS
Summary: Đảo bí ẩn có 6 nhà chài trên cột 13–15 × 11 tường 7, lều thuyền trưởng 11 × 13 bằng khối, sạp 7 × 4, cửa 3 × 3 với bậc 1 khối, ≥ 86% sàn trống; room/reach/scenery audit đều 0 (room-audit tầm mái 24; gồm mạng đường liền từ chỗ xuất hiện tới mọi nơi).
Concerns: ảnh review mốc làng chài bị mái che do góc chụp chung của render-preview (đề xuất trong báo cáo).
```
