# Thư viện: nhà to, cửa rộng, cảnh vật và mạng đường (02–03/10/2026)

Plan: `plans/dattqh/261002-2216-houses-big-wide-doors/` (pha 2, map `thu-vien`). Luật: `.claude/rules/world-scenery.md`.
Tệp đã sửa: `tools/world/generate-thu-vien-map.ts`, `tools/world/structures/thu-vien-library.ts`, `tools/world/structures/thu-vien-garden.ts`. Đã sinh lại `assets/generated/world/thu-vien/**` (`pnpm world:thu-vien`) và chụp lại 15 khung mock (`PREVIEW_ONLY=mock__`, qua khóa chụp; manifest do lệnh chụp tự sinh lại). Không sửa tệp dựng chung, `models.json`, `box-props`, `mock-views`, `regions.json`, `targets.json`, `content/quests/**`.

## Số đo

| Kiểm tra | Trước (bản đã commit) | Sau |
| --- | --- | --- |
| `room-audit` | 822 không gian có mái, 17 thiếu: 14 nhà phố cỡ cũ (cửa 2, trèo 2 khối); gờ đá trên tường lót sau sảnh 27 × 1 (không lối vào); ruột tháp đồng hồ vườn 5 × 5 (kín rỗng); gờ phào dưới mái gian giữa 23 × 1 | 552 không gian có mái, **0 thiếu** (đo bằng bản đã commit fc0fd14, không tính vòng dưới mái hiên) |
| `reach-audit` | mọi mục tới được, chỗ xuất phát trống | **mọi mục tới được; chỗ xuất phát trống** (68 mục) |
| `scenery-audit` | 10 cây trên đường, 6 đồ giữa lối, 13 nơi không cạnh đường, 80 nơi bị cắt khỏi mạng (chỗ xuất hiện không nằm cạnh đường nào nên gần như mọi nơi bị tính là cắt) | **0 / 0 / 0 / 0** |
| `tsc --noEmit -p tsconfig.json` | — | 0 lỗi trong tệp của map (lỗi còn lại chỉ ở `tools/world/peek.tmp.ts`, tệp tạm của phiên khác) |
| `eslint --max-warnings=0` (3 tệp của map) | — | 0 lỗi, 0 cảnh báo |
| `pnpm vitest run tools/world/zone-maps.test.ts -t "thu-vien"` | — | 4 pass, 32 skip |

Trong nhà, theo `room-audit` sau khi sửa: thư viện là một không gian liền cả hai tầng (71 × 42, 3.908 ô sàn), 89% sàn trống, 100% chỗ trống tới được từ cửa; xưởng đồng hồ 95% trống; phòng lịch 97% trống. Mặt bằng thư viện (kiểm theo ô, có tính đồ có va chạm): lối giữa các dãy bàn đọc rộng 2, giữa các cột bàn rộng 4; lối giữa hai dãy kệ sách rộng 4; giữa hai hàng bàn máy tính rộng 2; lối kho sách rộng 3; hành lang gác rộng 3–4.

## Từng công trình

| Công trình | Cũ | Mới |
| --- | --- | --- |
| Thư viện (75 × 40 kể cả gian giữa, tường cao 12 trên sàn, gian giữa 16) | Cửa vòm rộng 7 nhưng hai cánh cửa mở chắn trong lòng cửa, còn lối 3; thảm đỏ rộng bằng cửa nên sàn ván trong sảnh tách khỏi cửa; phòng đọc 16 bàn, lối giữa các hàng ghế rộng 1; cửa phòng sách quý, phòng học nhóm, kho sách rộng 2; gờ đá bỏ ngỏ trên tường lót sau sảnh và dưới mái gian giữa | Cỡ giữ nguyên (đã to gấp nhiều lần chuẩn). Hai cánh cửa gập sát tường hai bên, lòng cửa trống đủ 7; thảm đỏ hẹp lại còn 5, hai bên là sàn ván nối cửa vào sảnh. Phòng đọc 3 × 3 bàn, lối quanh mỗi dãy ≥ 2 (tính cả ghế), giữa các cột 4. Cửa phòng sách quý, phòng học nhóm (giữa hai cột kính), kho sách rộng 3 cao 3; kệ gác dừng trước cửa kho. Tường lót sau sảnh xây lên tới vòm, đầu hồi trước và sau đứng trên phào: không còn gờ hở dưới mái |
| Xưởng đồng hồ | 13 × 10, tường 4, cửa 2 × 2 | 17 × 13, tường 7, cửa 3 × 3 ra đường trước tháp; kệ đồng hồ dọc tường sau, mỗi tường hông một bàn thợ, giữa nhà để trống |
| Phòng lịch | 15 × 11, tường 5, cửa 2 rộng | 19 × 13, tường 7, cửa 3 × 3; bàn vá lịch, giá treo lịch dọc tường sau, góc ảnh, cửa sổ hướng đông cao 4 |
| Tháp đồng hồ (chương 3) | Cửa 3 × 3; cầu thang xoắn bằng gỗ bạch dương; cửa ra ban công có bậc đá cắt ngang sàn | Cửa giữ nguyên; cầu thang xoắn lát ván (cùng mạng sàn từ cửa lên chiếu nghỉ, gác chuông); ngưỡng ván ở cửa ban công; đường phố dẫn thẳng tới cửa tháp |
| Tháp đồng hồ vườn (cạnh thư viện) | Hộp 7 × 7 rỗng ruột, không cửa | Đặc ruột (tháp trang trí, không phải nhà); lối lát từ phố x = 330 tới chân tháp |
| Nhà dãy ven sân lễ hội và quanh tháp (`cottageRow`) | Ô kiểm chỗ theo cỡ nhà cũ (14 × 8), dãy sát mép khu nên nhà mới lấn ra ngoài khu | Ô kiểm theo cỡ lớn nhất của nhà chung (17 × 12), tránh bể nước và bờ bể; hai dãy phía nam lùi vào 4 khối. Mỗi cửa có lối lát xuyên cổng sân ra một ngõ dọc mặt trước dãy, ngõ nối vào đường của khu |
| Nhà phố ven đường (`streetHouses`, bộ dựng chung đã to ra) | 11 × 7, cửa 2 | 13–17 × 11–12, cửa 3 × 3, bậc lên nền đá (tự to ra khi sinh lại; ít nhà hơn vì to hơn) |
| Sạp hàng lễ hội (`placeStall` 5 × 3) | — | Giữ nguyên: sạp mở bốn mặt, không phải phòng (xem ngoại lệ) |

Không bỏ công trình nào của map; `ZONES` giữ nguyên vị trí và cỡ (nay viết từ hằng `FAIR`, `TOWER_YARD`), tên mọi địa danh giữ nguyên.

## Cảnh vật và mạng đường

- Cây trên đường: trụ giàn hoa ở vườn đọc sách nay đứng trên chân đá (trụ gỗ không mọc từ mặt lát); cây lá vàng hai bên đường lá vàng chỉ trồng trên cỏ sau sân khán giả (trước đây 4 cây đứng giữa sân lát).
- Đồ giữa lối: sân khán giả lát kín (bỏ các ô cỏ lỗ chỗ làm sân bị đọc là ngõ hẹp), ghế giữ trên sân rộng; hai chậu cây sân sau ra bãi cỏ cạnh mép sân; đèn góc sân khán giả dời ra góc ngoài sân, không nằm trên lối trước sạp.
- Đường lá vàng giữa sân lễ hội lát `path` (trước là cát, cắt đứt con phố vào khu); đường phố tới tháp kéo tới tận cửa tháp.
- Đường mới (thêm vào `ROUTES`, lát 3 khối): lối từ đại lộ qua chỗ xuất hiện và các bến xe xuống bờ hồ trái (mốc "Hồ trước thư viện" nằm trên lối), lối ngang tới cổng về Trung tâm; lối sau thư viện kéo dài qua cầu ván trên suối, qua điểm đầu chương 1 và bến xe tới phố phía nam (z = 660); lối vườn đọc sách tới gốc sim tím, lối xuống tảng đá phẳng và suối, lối tới bãi cát; lối trước mỗi hàng sạp lễ hội nối vào sân và đường lá vàng, lối tới bể nước tròn, tới cây lá vàng và bàn đá, tới sạp bên bể; lối ngang trước tháp nối cửa phòng lịch và xưởng đồng hồ; phố từ bãi cỏ sau tháp xuống phố phía nam (điểm đầu chương 3 và bến xe về cổng nằm trên phố này); lối tới đài kính viễn vọng.
- Ghế vườn đọc sách dời lên bãi cỏ phía bắc lối, quay về tảng đá và suối.
- Mốc dời cho khỏi rơi vào tường hay ghế (tên giữ nguyên): "Khu đọc sách" lùi 1 khối vào lối giữa bàn; "Bãi cỏ quanh tháp" từ chỗ nay là tường xưởng sang bãi cỏ tây nam tháp; "Phòng máy đồng hồ", "Phòng lịch" sang bên cạnh lòng cửa (không đứng trước cửa); các mốc trong hai phòng theo cỡ phòng mới.

## Ngoại lệ (không gian có mái không phải nhà; `room-audit` không báo thiếu)

- Gầm hai cầu đá vòm qua hồ, cầu ván qua suối và sông: gầm cầu trên nước.
- Giàn hoa vườn đọc sách: mái giàn trên cột, bốn mặt mở.
- Sạp hàng lễ hội 5 × 3: quầy có mái trên bốn cột, mở bốn mặt, bé đứng trước quầy chứ không vào trong.
- Mái hiên trước tháp đồng hồ: mái trên hai cột, mở ba mặt.

## Khung mock

Chụp lại cả 15 khung, không cần chỉnh góc (mốc của khung giữ nguyên chỗ, trừ "Khu đọc sách" không có khung nào neo): d-02 thấy cửa vòm thông suốt, hai cánh gập hai bên; d-03 thấy thảm đỏ hẹp với sàn ván hai bên; d-04 và c-16 thấy phòng đọc 9 bàn thưa; d-13 thấy trụ giàn hoa trên chân đá.

## Đề xuất cho tệp chung

- `streetHouses` (scenery.ts): lối lát từ cửa ra cổng vườn dừng cách mép đường 1 ô (lối ở v = −3…−1, đường phủ v = −setback ± 1); nên kéo lối tới `-setback + 2` để cửa mọi nhà phố nằm trên mạng đường như luật yêu cầu. `scenery-audit` chưa kiểm cửa nhà nên không báo.
- `scenery-audit` chưa tính "cửa từng ngôi nhà" là một nơi phải cạnh đường; nếu muốn kiểm luật đó, có thể lấy các ô lòng cửa từ `room-audit`.

## Còn mở

- Lúc sinh map, `place-quest-targets` báo quest `toan2-cd6-b30`: nơi "phòng lịch trên tháp" chỉ cách các nơi khác của quest 7 khối (mục tiêu 10). Đây là lời nhắc, không phải lỗi; các nơi này đều nằm trong phòng lịch nên khó cách xa hơn mà không đổi tên/ý của mốc.
