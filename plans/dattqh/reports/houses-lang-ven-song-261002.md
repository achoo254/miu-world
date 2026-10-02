# Làng Ven Sông — nhà to, cửa rộng, cảnh vật và mạng đường (02–03/10/2026)

Plan: `plans/dattqh/261002-2216-houses-big-wide-doors/` (pha 2, map `lang-ven-song`), cộng hai phần việc thêm của người sở hữu: luật cảnh vật và một mạng đường liền (`.claude/rules/world-scenery.md`).

## Số đo trước / sau

| Công cụ | Trước | Sau |
| --- | --- | --- |
| `room-audit` (file sinh cũ, trước bộ dựng chung mới) | 336 không gian có mái, 40 thiếu (cửa rộng 2, trèo 2 khối ở cửa, 23 khối nhà không lối vào) | — |
| `room-audit` (sinh lại với bộ dựng chung mới, chưa sửa map) | 499 không gian, 1 thiếu (nóc kệ trong xưởng: trèo 3 khối) | — |
| `room-audit` (bản cuối, `ROOF_REACH` 24) | — | 229 không gian, **0 thiếu**; mọi phòng: cửa ≥ 3, trèo 0, sàn trống ≥ 86%, tới được 100% |
| `reach-audit` | mọi mục tới được, chỗ xuất hiện trống | **mọi mục tới được; chỗ xuất hiện, điểm xuống xe trống** |
| `scenery-audit` cây trên đường / đồ giữa lối / nơi không cạnh đường / nơi đứt mạng | 0 / 1 / 15 / 6 | **0 / 0 / 0 / 0** (chạy lại sau bản sửa d3ed9cd) |
| Cửa nhà (kiểm riêng, theo cặp đèn hai bên cửa) | — | 164 cửa, 0 cửa không cạnh mạng đường của chỗ xuất hiện, 0 đồ/cây trong lòng cửa hay 2 ô trước cửa |

Số trước của `scenery-audit` đo khi luật mới ra (sau khi đã dựng lại hai nhà công cộng). Nơi đứt mạng lúc đó: bến sông, bảng tin, cối xay gió, lớp học nhỏ, bến đò, bến tàu; nơi không cạnh đường: đầu chương 3 và 4, cổng sang Trung tâm, 6 bến/điểm xuống đò, cánh đồng lúa, lớp học gốc đa, đầm sen, sân bóng, hải đăng.

## Từng công trình

| Công trình | Cũ | Mới |
| --- | --- | --- |
| Lớp học nhỏ (chương 1) | 17 × 9, tường 4, cửa 2 × 2 | 21 × 15, tường 7, cửa **5 × 3** quay ra bắc, ngưỡng lát đá ngang sàn; bảng xanh 11 ô ở tường sau, 3 dãy × 4 bàn có ghế hai bên lối giữa rộng 7, bàn giáo viên, 2 tủ sách; sàn trống 92% (328 ô) |
| Xưởng thủ công (d-12) | 11 × 9, tường 5, sàn treo cao 3 khối trên đất | 17 × 13, tường 7, đặt trên chân đá san phẳng, cửa **5 × 3** ra đường quảng trường, lối lát đá xuống đường; kệ hai tầng theo ngăn 4–5 ô giữa cột gỗ, đèn trong tường, 3 bàn thợ + đe hai bên lối giữa rộng 5, thùng, thùng gỗ ở góc, giá dụng cụ trên tường đông; sàn trống 95% (219 ô) |
| Nhà dân ven hai đường làng, đường cổng | bộ dựng chung cũ (11 × 6–7, cửa 2) | bộ dựng chung mới (13–17 × 11–12, tường 7, cửa 3 × 3, bậc 1 khối); thêm nối lối vườn vào đường ở chỗ đường cong để lối đi không hụt 1–2 ô cỏ |
| Ba xóm (`hamlet`) và dãy nhà bến cảng (`cottageRow`) | dãy nhà quay ra sân chung, không có đường; ở chỗ đất dốc hai nhà bị đất lấp cửa (room-audit báo "no way in") | bỏ `hamlet`/`cottageRow`, dựng lại bằng `streetHouses` dọc đường riêng của xóm: phía tây ruộng lúa mì (z 140, nối tiếp ra đường đồng tới cối xay), hai đường xóm bắc bãi cỏ (z 100, 160, đường đê x 450 từ đường làng nam lên), phố bến cảng (z 222), đường xóm nam bến sông (x 100); mọi nhà có chân đá, bậc, lối vườn ra đường |
| Cối xay gió | cửa 1 × 3 | cửa 3 × 3 (`widenRoundDoor`), có đường đồng tới tận cửa |
| Hải đăng | cửa 1 × 2 | cửa 3 × 3 tính từ mặt đất của mũi đất (đặt thấp 1 khối thì cửa thành hố) |
| Tháp chuông | thân tròn rỗng kín không cửa | lấp đặc thân (`fillTowerShaft`) |

Không gian có mái còn lại mà không phải nhà (đều không bị báo thiếu): gầm hai cầu đá vòm, gầm cổng làng, mái sạp chợ, mái bảng tin, vòng đất dưới vành mái tháp chuông, lòng cối xay và hải đăng (phòng tròn nhỏ 12–31 ô).

## Mạng đường

Thêm vào `ROUTES` (đường lát 3 ô, bám địa hình): nhánh tới các bến đò và cổng sang Trung tâm cạnh chỗ xuất hiện; nhánh vào khu bài học tính từ đúng mép đường làng (`laneZ`, hết khe hở 3 ô và đoạn cụt thò qua đường) và với khu bên bắc sông thì chạy qua tới điểm đầu chương; lối từ khu đầu làng tới cửa lớp học rồi đường đồng qua ruộng lúa mì tới cửa cối xay; lối tới lớp học gốc đa, tới sân bóng; lối ván vào đầm sen; đường xuống cầu tàu bến đò; đường ven hồ nối hai đường làng qua cửa sông (cầu ván tự sinh) với nhánh ra ba cầu tàu; đường ra hải đăng; đường bờ ruộng ra giữa cánh đồng lúa; đường các xóm. Bờ sông/hồ dốc 2 khối xuống mặt ván được đắp bậc 1 khối (`stepWays`). Mái bảng tin đổi từ ván sang ngói đỏ (khớp mái xưởng; ván là mặt đi của mạng nên nóc bảng tin thành "đường" lơ lửng).

## Ảnh đối chiếu

Khung `d-12-xuong-thu-cong` chỉnh góc theo phòng mới (`eye` [0, 1,6, 4,5], `look` [0, 1,3, −5]).

Chụp lại cả 11 khung `mock__` qua khóa chụp (`render-preview lang-ven-song: 11 images`, manifest tự sinh lại), so bằng `compare.py`:

| Khung | Kết quả |
| --- | --- |
| d-12 Xưởng thủ công | đạt: phòng gỗ rộng, kệ hai tầng giữa cột với nồi, giỏ, thùng; đèn trong tường; đe, bàn thợ, thùng, dụng cụ treo; bác thợ và thợ phụ đứng giữa. Còn thiếu so với mock: bàn thợ chưa dày đồ như tranh |
| d-10 Đường làng | gần: nhà to hơn hẳn, tường và mái lấn khung nhiều hơn trước; lối vườn, bụi, đèn, rào như cũ |
| d-01, c-07 toàn cảnh, làng | gần: mái nhà to đọc rõ, quảng trường, tháp chuông, cây hoa như cũ |
| d-02, d-06, d-08, d-09, d-11, c-11, c-12 | không đổi bố cục (cổng, cối xay, chợ, cầu, khu sinh hoạt, hồ, bến tàu); thêm lối tới cửa cối xay, đường ven hồ và nhánh ra cầu tàu |

## Kiểm tra

- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi.
- `pnpm exec eslint tools/world/generate-lang-ven-song-map.ts tools/world/structures/lang-ven-song-buildings.ts --max-warnings=0`: 0 lỗi, 0 cảnh báo.
- Không chạy `pnpm test`, vitest, E2E, perf (theo người sở hữu).
- Prop của map: 12.147 (trước 12.345); 140 người/vật.

## Tệp đã sửa

- `tools/world/generate-lang-ven-song-map.ts`
- `tools/world/structures/lang-ven-song-buildings.ts` (mới: `placeHall`, `widenRoundDoor`, `fillTowerShaft`)
- `content/world/mock-views/lang-ven-song.json` (góc d-12)
- `assets/generated/world/lang-ven-song/**`, `assets/generated/review/lang-ven-song/mock__*.png`, `assets/manifest.json` (render-preview tự sinh lại, qua khóa chụp)

## Đề xuất cho tệp chung

- `streetHouses` (`scenery.ts`): lối vườn dừng cách tâm đường 3 ô; ở đoạn đường chéo nó hụt 1–2 ô cỏ trước khi chạm đường. Nên kéo lối tới khi gặp ô đường (map này tự vá bằng `joinWalks`).
- `laneVerge`: dãy hàng rào 3 đoạn chỉ kiểm ô đầu, đoạn sau có thể rơi lên đường khác (đã gặp ở chỗ nhánh cắt đường làng).
- `hamlet`/`cottageRow`: đặt nhà ở `ctx.ground + 1` không san nền, đất dốc lấp cửa; cũng không có đường tới cửa. Nên bỏ dần hoặc cho đi qua `streetHouses`.
- `placeArchBridge`: mặt cầu bằng `stone` (gạch xám) không thuộc khối mạng đường; hiện mạng nối qua lan can `cobble-grey`. Nên lát mặt cầu bằng khối đường.
- `placeLighthouse`, `placeWindmill`: cửa 1 ô; `placeTower(door=false)` để thân rỗng kín. Có thể đưa `widenRoundDoor`/`fillTowerShaft` vào bộ dựng chung nếu map khác cần.

Status: DONE
Summary: Hai nhà công cộng dựng lại to (21 × 15 và 17 × 13, tường 7, cửa 5 × 3), mọi nhà dân theo chuẩn mới kể cả ba xóm dựng lại dọc đường riêng, mạng đường liền tới mọi nơi; room-audit 0 thiếu, reach-audit đạt, scenery-audit 0/0/0/0.
Concerns/Blockers: không chạy test bộ map (`zone-maps.test.ts`) theo lệnh không chạy test; vị trí các mục quest trong khu đầu làng dịch đi do lớp học to ra (sinh lại theo seed, tên không đổi).
