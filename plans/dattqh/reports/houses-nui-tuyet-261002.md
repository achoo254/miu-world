# Núi tuyết: nhà to, cửa rộng, cảnh vật đặt như thật, mạng đường liền (02–03/10/2026)

Plan: `plans/dattqh/261002-2216-houses-big-wide-doors/` (pha 2, map `nui-tuyet`). Thêm phạm vi theo người điều phối: luật cảnh vật và mạng đường trong `.claude/rules/world-scenery.md`.

## Kết quả đo (trước → sau)

Số "trước" đo trên bản đã commit (HEAD) bằng **cùng phiên bản công cụ** đang dùng (room-audit tầm mái 24, scenery-audit sau commit d3ed9cd).

| Công cụ | Trước | Sau |
| --- | --- | --- |
| `room-audit nui-tuyet` | 1.293 không gian có mái, **20 thiếu chuẩn** | 74 không gian có mái, **0 thiếu chuẩn** |
| `reach-audit nui-tuyet` | mọi mục tới được, chỗ xuất phát trống | mọi mục tới được, chỗ xuất phát trống |
| `scenery-audit nui-tuyet` | 5 cây trên đường, 3 đồ chắn giữa lối, 10 nơi không cạnh đường, 62 nơi bị cắt khỏi mạng của chỗ xuất hiện | **0 / 0 / 0 / 0** |

20 chỗ thiếu trước đây gồm: hộp kín rỗng trong tầng đồng hồ của tháp (không lối vào) và gờ quanh thân tháp; khe vực sâu trong hang băng (rơi xuống là kẹt, "no way in"); nóc lan can cầu trong hang (trèo 2 khối); khoảng chui dưới tán thông (cửa 1–2 khối). Nhà chalet cũ có cửa 2 khối nhưng room-audit không bắt (dải dưới mái hiên nối phòng với bên ngoài thành "cửa" rộng); đo bằng công cụ quét toàn phòng riêng: khoảng 62 nhà gỗ dọc phố, ruột 5×5 đến 11×9, cửa 2 khối.

Không còn ngoại lệ nào phải ghi: room-audit báo 0.

## Từng công trình

| Công trình | Cũ | Mới | Cửa | Bậc | Nội thất |
| --- | --- | --- | --- | --- | --- |
| Nhà gỗ dọc phố (`chaletStreet`) | 9–13 × 8–10, tường 5 hoặc 8 | `cottageSize`: 13–17 × 11–12, tường 7 hoặc 8 | 3 × 3, giữa mặt tiền, có ngưỡng đá | có (`doorSteps`, mỗi bậc 1 khối, chỗ nhà đứng trên chân đá); lối lát rộng 3 từ cửa ra đường | trống (100% sàn) |
| Cửa hàng đồ ấm | 15 × 17, tường 6 | 17 × 17, tường 9 | 3 × 3 | không cần (sàn bằng đất) | quầy cách tường sau 6 (sau quầy trống 4 khối, hai đầu quầy 3 khối); giá áo và kệ len sát tường, không còn dải hẹp phía sau; sàn trống 83%, tới được 100% |
| Trạm nhiệm vụ | 15 × 17, tường 6 | 17 × 17, tường 9 | 3 × 3 | không cần | bàn bản đồ cách bảng 3 khối; thùng, thùng tròn vào góc (hết túi kẹt 3 ô); trống 95% |
| Nhà dân (lò sưởi) | 13 × 11, tường 6 | 17 × 13, tường 7 | 3 × 3, đi bộ lát ra phố làng | không cần | lò sưởi, kệ hũ sát tường; ghế bành, bàn ăn giãn ra; trống 91% |
| Nhà nghỉ (lodge) | 21 × 17, tường 7 | 25 × 21, tường 8 | 3 × 3, có lối lát từ đường | không cần | quầy lễ tân một khối cao, cách tường sau 5 (sau quầy trống 4), hai đầu quầy trống 3; thảm bắt đầu cách cửa một khối; cửa sổ rèm không đặt sau quầy; trống 98% |
| Lều nghiên cứu lớn / nhỏ | 23 × 15 tường 7 / 15 × 11 tường 5 | giữ mặt bằng, tường 7 / 7 | 3 × 3, lối lát ra đường trạm | không cần | trống |
| Tháp đồng hồ | tầng đồng hồ kín rỗng; thân 5 × 5 để gờ quanh | tầng đồng hồ đặc; thân 7 × 7 (không còn gờ) | chân tháp cửa 3 × 3 (như cũ) | — | — |
| Đài quan sát | cửa 3 rộng (như cũ) | thêm lối đá trên mặt đá từ đầu bậc tới cửa | — | — | — |

Không bỏ ngôi nhà đặt tay nào. Nhà dọc phố tự thưa ra vì lô to hơn và chừa đường mới: khoảng 62 → 49 nhà gỗ (cùng cửa hàng, trạm, nhà dân, nhà nghỉ, 2 lều).

## Cảnh vật và mạng đường

- Cây trên đường: thông non do bộ rải chung đặt rơi vào quảng trường lát / lối đi được dời sang ô đất cạnh đó (`besideTheWays` trong generator); ba cây thông lớn ở góc quảng trường đứng trong ô đất chừa trong nền lát.
- Đồ giữa lối: biển khu ở góc khu (bộ dựng chung đặt đúng giữa đường chính tại cổng làng và Hồ băng) được dời ra mép; đèn bờ hồ ở x = 400, ghế bờ hồ ở x = 460, cờ slalom gần lối, ván trượt trước nhà nghỉ: bỏ chỗ trùng đường hoặc dời ra mép.
- Thông (`placeSnowPine`): cành thấp nhất ở ngang đầu và rủ xuống theo dốc, nên không còn khoảng chui dưới tán (trước đây sinh ra hơn chục "phòng" cửa 1–2 khối). Trông vẫn như thông tuyết của mock.
- Mạng đường (một mạng từ chỗ xuất hiện): đường chính nay bắt đầu từ cổng sang Trung tâm; làn phía tây đi xuyên khu trượt tuyết tới cửa nhà nghỉ; làn phía đông vào giữa trạm thám hiểm; đường trượt tuyết nối hai làn với bờ hồ; đường hồ nối bờ hồ; lối mòn lên dốc trượt tới sống núi (Đỉnh dốc, Vách núi dưới cáp treo); lối đỉnh núi đi tiếp qua cầu gỗ tới Sân đỉnh núi và chân bậc đài quan sát; lối ra mỏm đá ngắm hoàng hôn (lát đá trên tuyết, bậc 1 khối); lối ra mép vực và bậc đá xuống đáy vực băng; lối ra chân thác băng; cầu thang đá lên sườn dãy núi phía bắc và đường dọc dãy tới Lâu đài; lối ván trên băng ra giữa hồ; lối đá trong hang từ đường hầm tới cầu; đường vào rừng thông; lối từ mặt trước năm ga cáp treo, cửa nhà dân và hai lều ra đường gần nhất. Lối thám hiểm được vẽ lại để không chạy xuyên qua hai lều.
- Hang băng: khe vực sâu 6 khối (rơi xuống là kẹt) nay là suối sâu 1 khối, cầu ván rộng 5 có cột gỗ thấp, không lan can để trèo lên.

## Góc chụp đối chiếu

Chụp lại cả 17 khung `mock__` (thông đổi dáng trên toàn map, nhà ở làng, trạm, nhà nghỉ đổi cỡ). Chỉnh một góc: `d-08-thac-bang` (camera cũ rơi vào bậc đá mới xuống vực) → `eye [-6, 2, -8]`, `look [6, 14, 30]`. Các khung nội thất d-11…d-14 đọc rõ là phòng rộng, đồ sát tường, lối giữa trống. Chưa chụp bộ ảnh đầy đủ ngoài `mock__` (brief của pha này không yêu cầu).

## Kiểm tra

- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi.
- `pnpm exec eslint tools/world/generate-nui-tuyet-map.ts tools/world/structures/nui-tuyet-buildings.ts tools/world/structures/nui-tuyet-nature.ts --max-warnings=0`: 0 lỗi, 0 cảnh báo.
- `pnpm vitest run tools/world/zone-maps.test.ts -t "nui-tuyet map"`: 4/4 đạt (khớp bản sinh, cỡ map, đời sống, đi được tới mọi mục quest). `tools/world/mock-views.test.ts`: đạt.
- Không chạy `pnpm test`, E2E, perf (theo yêu cầu).

## Tệp đã sửa

- `tools/world/generate-nui-tuyet-map.ts`: cỡ và nội thất các nhà, nhà dọc phố theo `cottageSize` với cửa 3 và bậc, mạng đường, cầu thang dãy núi, bậc xuống vực, lối ván hồ, lối hang, suối hang, `besideTheWays`.
- `tools/world/structures/nui-tuyet-buildings.ts`: `placeChalet` cửa 3 × 3 giữa mặt tiền có ngưỡng đá; tháp đồng hồ thân 7 × 7, tầng đồng hồ đặc.
- `tools/world/structures/nui-tuyet-nature.ts`: tán thông thấp tới ngang đầu, rủ theo dốc.
- `content/world/mock-views/nui-tuyet.json`: góc d-08.
- Sinh lại: `assets/generated/world/nui-tuyet/**`, `assets/generated/review/nui-tuyet/mock__*.png` (manifest do lệnh chụp tự sinh lại). Không thêm model mới, không sửa `models.json`, `box-props`.
- Không đụng tệp dựng chung, `regions.json`, `targets.json`, `content/quests/**`, `apps/**`, map khác. `ZONES` và tên landmark giữ nguyên; vài landmark trong nhà dịch theo phòng mới (cùng tên).

## Đề xuất cho tệp chung

- `zone-map.ts`: biển tên khu đặt ở góc khu gần chỗ xuất hiện rơi đúng giữa đường khi chỗ xuất hiện thẳng hàng với tâm khu (`Math.sign(0)`); và bộ rải đồ trang trí chỉ tránh `onPath`, không tránh mặt lát do map tự lát (quảng trường). Nên đặt biển ra mép đường và bỏ ô có khối lát trên mặt, để map khỏi phải tự dời như `besideTheWays`.
- `structures/buildings.ts` `doorSteps`: dùng tốt qua `facingWriter`; không cần đổi.

## Câu hỏi còn mở

Không có.
